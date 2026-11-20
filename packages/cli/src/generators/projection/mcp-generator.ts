/**
 * MCP Projection Adapter Generator
 *
 * Generates an MCP (Model Context Protocol) server adapter
 * for exposing Idiomark personalities as tools/resources to Claude Desktop
 */

import type { ProjectionCreateOptions } from '../../commands/projection-adapter'

export interface GeneratedFiles {
  [filePath: string]: string
}

export async function generateMCPAdapter(
  name: string,
  options: ProjectionCreateOptions
): Promise<GeneratedFiles> {
  const className = toPascalCase(name)
  const transport = options.transport || 'stdio'
  const port = options.port || 3000

  return {
    'src/index.ts': generateIndexFile(name, className, transport, port),
    'src/tools.ts': generateToolsFile(name, className),
    'src/resources.ts': generateResourcesFile(name, className),
    'src/handlers.ts': generateHandlersFile(name, className),
    'package.json': generatePackageJson(name, options, transport, port),
    'tsconfig.json': generateTsConfig(),
    'tsup.config.ts': generateTsupConfig(),
    'README.md': generateReadme(name, className, transport, port, options.description)
  }
}

function generateIndexFile(name: string, className: string, transport: string, port: number): string {
  return `/**
 * ${className} MCP Server
 *
 * Exposes Idiomark personality as MCP tools and resources
 * Transport: ${transport}
 */

import { MCPServer } from '@idiomark/projectors'
import type { MCPServerConfig } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'
import { readFileSync } from 'fs'
import { join } from 'path'

// Import custom tools
import { getCustomTools } from './tools'
import { getCustomResources } from './resources'
import { registerCustomHandlers } from './handlers'

export interface ${className}ServerOptions {
  personality: IdiomarkFile | string
  transport?: 'stdio' | 'http'
  port?: number
}

/**
 * Create and start the ${className} MCP server
 */
export async function create${className}Server(options: ${className}ServerOptions): Promise<MCPServer> {
  // Load personality
  const personality = typeof options.personality === 'string'
    ? JSON.parse(readFileSync(options.personality, 'utf-8')) as IdiomarkFile
    : options.personality

  // Configure server
  const config: MCPServerConfig = {
    personality,
    transport: options.transport || '${transport}',
    port: options.port || ${port}
  }

  // Create server instance
  const server = new MCPServer(config)

  // Register custom tools
  const customTools = getCustomTools(personality)
  server.registerTools?.(customTools) || console.log('Custom tools registered')

  // Register custom resources
  const customResources = getCustomResources(personality)
  server.registerResources?.(customResources) || console.log('Custom resources registered')

  // Register custom handlers
  registerCustomHandlers(server, personality)

  return server
}

/**
 * Start the server (for CLI usage)
 */
export async function start${className}Server(options: ${className}ServerOptions): Promise<void> {
  const server = await create${className}Server(options)

  console.error(\`Starting ${className} MCP server on ${options.transport || '${transport'}...\`)

  await server.start()

  if (options.transport === 'http' || options.transport === '${transport}') {
    const port = options.port || ${port}
    console.error(\`Server listening on port \${port}\`)
    console.error('\\nPress Ctrl+C to stop')
  }
}

// CLI entry point
if (require.main === module) {
  const personalityPath = process.argv[2] || 'personality.idiomark'
  start${className}Server({
    personality: personalityPath
  }).catch(console.error)
}
`
}

function generateToolsFile(name: string, className: string): string {
  return `/**
 * Custom MCP Tools for ${className}
 *
 * Define custom tools that expose personality-specific capabilities
 */

import type { MCPTool } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

/**
 * Get custom tools for this personality
 */
export function getCustomTools(personality: IdiomarkFile): MCPTool[] {
  const { voice, values, domains } = personality.personality || {}

  return [
    {
      name: 'generate_response',
      description: \`Generate a response in \${voice?.tone?.primary || 'neutral'} tone with \${voice?.formality ? Math.round(voice.formality * 100) + '%' : 'default'} formality\`,
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The input message to respond to'
          },
          mode: {
            type: 'string',
            description: 'How strongly to apply personality',
            enum: ['strict', 'balanced', 'subtle'],
            default: 'balanced'
          }
        },
        required: ['message']
      }
    },
    {
      name: 'get_voice_profile',
      description: 'Get the voice profile characteristics',
      inputSchema: {
        type: 'object',
        properties: {
          detail: {
            type: 'string',
            enum: ['basic', 'full'],
            default: 'basic'
          }
        }
      }
    },
    {
      name: 'get_values',
      description: 'Get core values and principles',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_domains',
      description: 'Get domain expertise areas',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}
`
}

function generateResourcesFile(name: string, className: string): string {
  return `/**
 * Custom MCP Resources for ${className}
 *
 * Define resources that expose personality data
 */

import type { MCPResource } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

/**
 * Get custom resources for this personality
 */
export function getCustomResources(personality: IdiomarkFile): MCPResource[] {
  const { metadata } = personality

  return [
    {
      uri: 'idiomark:///personality/full',
      name: 'Full Personality',
      description: 'Complete Idiomark personality file',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///personality/voice',
      name: 'Voice Profile',
      description: 'Voice characteristics including tone, formality, and communication style',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///personality/values',
      name: 'Core Values',
      description: 'Values and principles that guide personality responses',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///personality/domains',
      name: 'Domain Knowledge',
      description: 'Areas of expertise and domain knowledge',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///metadata',
      name: 'Metadata',
      description: 'Idiomark file metadata (version, source, created date)',
      mimeType: 'application/json'
    }
  ]
}
`
}

function generateHandlersFile(name: string, className: string): string {
  return `/**
 * Custom MCP Tool Handlers for ${className}
 *
 * Implement the actual logic for each tool
 */

import type { MCPServer } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'
import type { MCPToolResult } from '@idiomark/projectors'

/**
 * Register custom tool handlers
 */
export function registerCustomHandlers(server: MCPServer, personality: IdiomarkFile): void {
  // The server already has default handlers for:
  // - generate_response
  // - get_personality
  // - get_system_prompt
  // - get_health

  // Add custom handlers here if needed
  // For example, you could override specific behavior:

  /*
  server.on('toolCall', async (toolName, args) => {
    if (toolName === 'custom_tool') {
      return await handleCustomTool(args, personality)
    }
  })
  */
}

/**
 * Example custom tool handler
 */
async function handleCustomTool(args: Record<string, unknown>, personality: IdiomarkFile): Promise<MCPToolResult> {
  // Implement your custom logic here

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ result: 'custom response' }, null, 2)
      }
    ]
  }
}
`
}

function generatePackageJson(name: string, options: ProjectionCreateOptions, transport: string, port: number): string {
  return JSON.stringify({
    name: `@idiomark/projection-adapter-${name}`,
    version: '1.0.0',
    description: options.description || `${name} MCP projection adapter for Idiomark Protocol`,
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts'
      }
    },
    scripts: {
      dev: 'tsup --watch',
      build: 'tsup',
      start: 'node dist/index.js',
      test: 'vitest',
      lint: 'eslint src/',
      clean: 'rm -rf dist'
    },
    dependencies: {
      '@idiomark/core': 'workspace:*',
      '@idiomark/projectors': 'workspace:*',
      '@idiomark/inference': 'workspace:*'
    },
    devDependencies: {
      '@types/node': '^22.13.5',
      tsup: '^8.4.0',
      typescript: '^5.7.3',
      vitest: '^3.0.7'
    },
    idiomark: {
      type: 'mcp',
      transport,
      port,
      status: 'experimental'
    },
    engines: {
      node: '>=18.0.0'
    }
  }, null, 2)
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      esModuleInterop: true,
      resolveJsonModule: true,
      strict: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      outDir: './dist',
      rootDir: './src'
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  }, null, 2)
}

function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'es2022'
})
`
}

function generateReadme(name: string, className: string, transport: string, port: number, description?: string): string {
  return `# @idiomark/projection-adapter-${name}

${description || `${name} MCP projection adapter for Idiomark Protocol`}

## Overview

This is an MCP (Model Context Protocol) server that exposes a Idiomark personality as tools and resources for Claude Desktop and other MCP-compatible clients.

### Transport: ${transport === 'stdio' ? 'Stdio (Claude Desktop)' : `HTTP (port ${port})`}

## Features

- **generate_response**: Generate responses using the personality
- **get_voice_profile**: Access voice characteristics
- **get_values**: Retrieve core values and principles
- **get_domains**: Get domain expertise information
- **Personality resources**: Access full personality data via MCP resources

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

### Claude Desktop Integration (${transport === 'stdio' ? 'Stdio' : 'HTTP'})

Add to your Claude Desktop config (\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "${name}": {
      "command": "node",
      "args": ["${process.cwd().replace(/\\/g, '/')}/packages/projection-adapters/${name}/dist/index.js", "./path/to/personality.idiomark"]
    }
  }
}
\`\`\`

### Standalone HTTP Server

\`\`\`bash
npm start -- ./path/to/personality.idiomark
\`\`\`

Server will start on port ${port}.

### Testing with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector node dist/index.js ./path/to/personality.idiomark
\`\`\`

## Configuration

- **Transport**: ${transport}
${transport === 'http' ? `- **Port**: ${port}` : ''}

## Development

\`\`\`bash
npm run dev    # Watch mode
npm run build  # Production build
npm run test   # Run tests
\`\`\`

## License

MIT
`
}

// Helper functions

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
