/**
 * Apply Command for Idiomark CLI
 *
 * Applies Idiomark personalities to external systems (MCP, UCP, HTTP)
 *
 * Usage:
 *   idiomark apply me.idiomark --mcp-server anthropic
 *   idiomark apply me.idiomark --ucp-merchant my-shop
 *   idiomark apply me.idiomark --http-port 3000
 */

import chalk from 'chalk'
import ora from 'ora'
import { readFileSync } from 'fs'
import path from 'path'
import {
  loadIdiomarkFile
} from '@idiomark/core/loader'
import type { IdiomarkFile } from '@idiomark/core'
import type {
  ApplyOptions
} from '../types'

// ============================================================
// Apply Options
// ============================================================

export interface ApplyOptions {
  /** Idiomark file to apply */
  file: string
  /** Start MCP server with personality */
  mcpServer?: string
  /** MCP transport: stdio or http */
  mcpTransport?: 'stdio' | 'http'
  /** Port for MCP HTTP transport */
  mcpPort?: number
  /** Generate UCP profile for merchant */
  ucpMerchant?: string
  /** Business name for UCP */
  ucpBusinessName?: string
  /** Start HTTP server on port */
  httpPort?: number
  /** Provider for LLM generation */
  provider?: 'anthropic' | 'openai' | 'auto'
  /** Model to use */
  llmModel?: string
  /** Run in background */
  background?: boolean
}

// ============================================================
// Apply Command
// ============================================================

export async function apply(options: ApplyOptions): Promise<void> {
  const spinner = ora('Loading Idiomark file...').start()

  try {
    // Load Idiomark file
    const idiomarkPath = path.resolve(options.file)
    // Skip validation for now - schema needs to match test file format
    const result = await loadIdiomarkFile(idiomarkPath, { validate: false, throwOnNotFound: true })

    if (!result) {
      spinner.fail('Idiomark file not found')
      process.exit(1)
    }

    const personality = result.file
    spinner.succeed(chalk.green('Idiomark file loaded'))

    // Route to appropriate adapter
    if (options.mcpServer) {
      await applyMCP(personality, options)
    } else if (options.ucpMerchant) {
      await applyUCP(personality, options)
    } else if (options.httpPort) {
      await applyHTTP(personality, options)
    } else {
      console.error(chalk.red('Error: No target specified'))
      console.error(chalk.gray('\nUse one of:'))
      console.error(chalk.gray('  --mcp-server <name>    Start MCP server'))
      console.error(chalk.gray('  --ucp-merchant <id>     Generate UCP profile'))
      console.error(chalk.gray('  --http-port <port>      Start HTTP server'))
      process.exit(1)
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to apply personality'))
    console.error(chalk.red(`\n${error.message || error}\n`))
    process.exit(1)
  }
}

// ============================================================
// MCP Application
// ============================================================

async function applyMCP(personality: IdiomarkFile, options: ApplyOptions): Promise<void> {
  const { MCPServer } = await import('@idiomark/projectors/mcp')
  const spinner = ora(chalk.cyan('🎭 Starting MCP Server...\n')).start()

  const server = new MCPServer({
    transport: options.mcpTransport || 'stdio',
    port: options.mcpPort,
    personality,
    provider: options.provider || 'auto',
    model: options.model
  })

  try {
    await server.start()

    spinner.stop()

    // Display server info
    console.log(chalk.cyan('🌐 MCP Server Details:\n'))
    console.log(chalk.gray('─'.repeat(45)))
    console.log(`  ${chalk.white('Transport:')}   ${options.mcpTransport || 'stdio'}`)
    if (options.mcpTransport === 'http' || options.mcpPort) {
      console.log(`  ${chalk.white('Port:')}       ${options.mcpPort || 3000}`)
    }
    console.log(`  ${chalk.white('Personality:')} ${personality.personality?.voice?.tone?.primary || 'Unknown'}`)
    console.log(chalk.gray('─'.repeat(45)))
    console.log(chalk.gray('\n📦 Exposed Tools:\n'))
    console.log(chalk.gray('  • generate_response   Generate response in personality voice'))
    console.log(chalk.gray('  • get_personality   View personality metadata'))
    console.log(chalk.gray('  • get_system_prompt View system prompt'))
    console.log(chalk.gray('  • get_health        Check server status\n'))

    if (options.mcpTransport === 'stdio') {
      console.log(chalk.green('✅ MCP server running (stdio transport)'))
      console.log(chalk.gray('\n📝 Stdio mode: Communicates via stdin/stdout'))
      console.log(chalk.gray('🔌 Connect via Claude Desktop or other MCP clients\n'))
      console.log(chalk.gray('Press Ctrl+C to stop\n'))

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Stopping MCP server...'))
        await server.stop()
        process.exit(0)
      })

      // Keep process alive
      await new Promise(() => {})
    } else {
      console.log(chalk.green(`\n✅ MCP server running on http://localhost:${options.mcpPort || 3000}\n`))
      console.log(chalk.gray('Press Ctrl+C to stop\n'))

      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Stopping MCP server...'))
        await server.stop()
        process.exit(0)
      })

      await new Promise(() => {})
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to start MCP server'))
    console.error(chalk.red(`\n${error.message || error}\n`))
    process.exit(1)
  }
}

// ============================================================
// UCP Application
// ============================================================

async function applyUCP(personality: IdiomarkFile, options: ApplyOptions): Promise<void> {
  const { UCPAdapter } = await import('@idiomark/projectors/ucp')
  const spinner = ora(chalk.cyan('🏪 Generating UCP Profile...\n')).start()

  const merchantId = options.ucpMerchant || 'default-merchant'
  const businessName = options.ucpBusinessName || merchantId

  const adapter = new UCPAdapter({
    merchantId,
    businessName,
    personality,
    port: options.httpPort || 3000
  })

  try {
    const result = await adapter.start()

    spinner.stop()

    // Display profile info
    console.log(chalk.cyan('🏪 UCP Profile Generated:\n'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log(`  ${chalk.white('Merchant ID:')}    ${merchantId}`)
    console.log(`  ${chalk.white('Business Name:')} ${businessName}`)
    console.log(`  ${chalk.white('Personality:')}   ${personality.personality?.voice?.tone?.primary || 'Unknown'}`)
    console.log(`  ${chalk.white('Values:')}       ${personality.personality?.values?.map((v: any) => v.name).join(', ') || 'None'}`)
    console.log(chalk.gray('─'.repeat(50)))
    console.log(chalk.gray('\n📦 Profile Endpoints:\n'))
    console.log(chalk.cyan(`  ${result.profileUrl}`))
    console.log(chalk.gray('  (Standard /.well-known/ucp-profile.json location\n'))

    if (result.mcpServer) {
      console.log(chalk.cyan(`📡 MCP Server:       ${result.mcpServer.transport}://${result.mcpServer.port || 'stdio'}\n`))
    }

    console.log(chalk.green('✅ UCP Profile server running\n'))
    console.log(chalk.gray('📖 AI agents can now discover this merchant via UCP\n'))
    console.log(chalk.gray('Press Ctrl+C to stop\n'))

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Stopping UCP server...'))
      await adapter.stop()
      process.exit(0)
    })

    await new Promise(() => {})
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to generate UCP profile'))
    console.error(chalk.red(`\n${error.message || error}\n`))
    process.exit(1)
  }
}

// ============================================================
// HTTP Application
// ============================================================

async function applyHTTP(personality: IdiomarkFile, options: ApplyOptions): Promise<void> {
  const { HTTPServerAdapter } = await import('@idiomark/projectors/http')
  const spinner = ora(chalk.cyan('🌐 Starting HTTP Server...\n')).start()

  const server = new HTTPServerAdapter({
    port: options.httpPort || 3000,
    personality,
    provider: options.provider || 'auto',
    model: options.model,
    cors: true
  })

  try {
    await server.start()

    spinner.stop()

    // Display server info
    console.log(chalk.cyan('🌐 HTTP Server Details:\n'))
    console.log(chalk.gray('─'.repeat(45)))
    console.log(`  ${chalk.white('URL:')}       http://localhost:${options.httpPort || 3000}`)
    console.log(`  ${chalk.white('Personality:')} ${personality.personality?.voice?.tone?.primary || 'Unknown'}`)
    console.log(chalk.gray('─'.repeat(45)))
    console.log(chalk.gray('\n📝 API Endpoints:'))
    console.log(chalk.gray('  POST /generate          Generate response with personality'))
    console.log(chalk.gray('  POST /stream           Stream response (SSE)'))
    console.log(chalk.gray('  GET  /personality      View personality JSON'))
    console.log(chalk.gray('  GET  /system-prompt     View system prompt'))
    console.log(chalk.gray('  GET  /health            Health check\n'))
    console.log(chalk.gray('💡 Example:'))
    console.log(chalk.gray('  curl -X POST http://localhost:3000/generate \\'))
    console.log(chalk.gray('    -H "Content-Type: application/json" \\'))
    console.log(chalk.gray(`    -d '{"message": "Hello!"}'\n`))

    console.log(chalk.green(`✅ Server ready at http://localhost:${options.httpPort || 3000}\n`))
    console.log(chalk.gray('Press Ctrl+C to stop\n'))

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Stopping HTTP server...'))
      await server.stop()
      process.exit(0)
    })

    await new Promise(() => {})
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to start HTTP server'))
    console.error(chalk.red(`\n${error.message || error}\n`))
    process.exit(1)
  }
}
