#!/usr/bin/env node
/**
 * Idiomark MCP Server CLI
 *
 * Command-line interface for starting Idiomark MCP servers.
 *
 * @example
 * ```bash
 * # Context mode (automatic)
 * npx @idiomark/mcp --file ./me.idiomark
 *
 * # Engine mode (local LLM)
 * npx @idiomark/mcp --file ./me.idiomark --llm-type ollama --llm-model llama3.2
 *
 * # Engine mode (API key)
 * npx @idiomark/mcp --file ./me.idiomark --llm-type anthropic --api-key $ANTHROPIC_API_KEY
 *
 * # HTTP transport
 * npx @idiomark/mcp --file ./me.idiomark --transport http --port 3000
 * ```
 */

import { IdiomarkMCPServer } from './server.js'
import type { IdiomarkMCPServerConfig, LLMProviderType } from './types.js'

interface CLIArgs {
  file: string
  transport?: 'stdio' | 'http'
  port?: number
  llmType?: LLMProviderType
  llmModel?: string
  apiKey?: string
  llmBaseUrl?: string
  acceptDataUpload?: boolean
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // Build config
  const config: IdiomarkMCPServerConfig = {
    idiomarkFile: args.file,
    transport: args.transport,
    port: args.port
  }

  // Add LLM config if provided
  if (args.llmType) {
    if (args.llmType === 'anthropic' || args.llmType === 'openai') {
      if (!args.apiKey) {
        console.error('Error: --api-key is required for cloud LLMs')
        console.error('\nWarning: Your personality data will be sent to the LLM provider.')
        console.error('Only proceed if you accept this data transmission.\n')
        process.exit(1)
      }

      config.mode = {
        mode: 'engine',
        llm: {
          type: args.llmType,
          apiKey: args.apiKey,
          model: args.llmModel,
          baseUrl: args.llmBaseUrl
        },
        acceptDataUpload: args.acceptDataUpload
      }
    } else {
      config.mode = {
        mode: 'engine',
        llm: {
          type: args.llmType,
          model: args.llmModel || 'llama3.2',
          baseUrl: args.llmBaseUrl
        }
      }
    }
  }

  // Start server
  const server = new IdiomarkMCPServer(config)

  try {
    await server.start()
  } catch (error) {
    console.error(`Error starting server: ${error}`)
    process.exit(1)
  }
}

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    file: ''
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    switch (arg) {
      case '--file':
      case '-f':
        args.file = argv[++i]
        break
      case '--transport':
      case '-t':
        args.transport = argv[++i] as 'stdio' | 'http'
        break
      case '--port':
      case '-p':
        args.port = parseInt(argv[++i], 10)
        break
      case '--llm-type':
        args.llmType = argv[++i] as LLMProviderType
        break
      case '--llm-model':
      case '-m':
        args.llmModel = argv[++i]
        break
      case '--api-key':
      case '-k':
        args.apiKey = argv[++i]
        break
      case '--llm-base-url':
        args.llmBaseUrl = argv[++i]
        break
      case '--accept-data-upload':
        args.acceptDataUpload = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown argument: ${arg}`)
          printHelp()
          process.exit(1)
        }
    }
  }

  if (!args.file) {
    console.error('Error: --file is required')
    printHelp()
    process.exit(1)
  }

  return args
}

function printHelp(): void {
  console.log(`
Idiomark MCP Server - Context7 for personality

USAGE:
  idiomark-mcp [OPTIONS]

OPTIONS:
  --file, -f <path>        Path to Idiomark file (required)
  --transport, -t <type>     Transport type: stdio (default) or http
  --port, -p <number>       Port for HTTP transport (default: 3000)
  --llm-type <type>        LLM provider: ollama, lmstudio, localai, jan,
                          anthropic, openai
  --llm-model, -m <model>  Model name (default: llama3.2 for ollama)
  --api-key, -k <key>      API key for cloud LLMs
  --llm-base-url <url>     Custom base URL for LLM API
  --accept-data-upload      Accept sending personality data to cloud LLM
  --help, -h               Show this help message

MODES:
  Context Mode (default):
    No LLM configuration provided. Serves read-only personality data
    via MCP resources and query tools. All data stays local.

  Engine Mode:
    LLM configuration provided. Enables generative tools like
    generate_response, apply_voice, suggest_actions.

    Local LLMs (ollama, lmstudio, localai, jan):
      - Data stays on your machine
      - No API key needed
      - Best for privacy

    Cloud LLMs (anthropic, openai):
      - Requires API key
      - Your personality data will be sent to the LLM provider
      - Only use if you accept this data transmission

EXAMPLES:
  # Context mode (read-only)
  idiomark-mcp --file ./me.idiomark

  # Engine mode with Ollama (local)
  idiomark-mcp --file ./me.idiomark --llm-type ollama

  # Engine mode with Anthropic API (cloud)
  idiomark-mcp --file ./me.idiomark --llm-type anthropic --api-key $ANTHROPIC_API_KEY

  # HTTP transport
  idiomark-mcp --file ./me.idiomark --transport http --port 3000

CLAUDE DESKTOP CONFIG:
  {
    "mcpServers": {
      "my-personality": {
        "command": "npx",
        "args": ["-y", "@idiomark/mcp", "--file", "~/.idiomark/me.idiomark"]
      }
    }
  }

For more information, visit: https://github.com/idiomark-protocol/idiomark-mcp
`)
}

main()
