/**
 * HTTP Server Projection Adapter Generator
 *
 * Generates a simple HTTP server that applies Idiomark personality
 * to incoming requests (REST API with personality)
 */

import type { ProjectionCreateOptions } from '../../commands/projection-adapter'

export interface GeneratedFiles {
  [filePath: string]: string
}

export async function generateHTTPAdapter(
  name: string,
  options: ProjectionCreateOptions
): Promise<GeneratedFiles> {
  const className = toPascalCase(name)
  const port = options.port || 3000

  return {
    'src/index.ts': generateIndexFile(name, className, port),
    'src/routes.ts': generateRoutesFile(name, className),
    'src/middleware.ts': generateMiddlewareFile(name, className),
    'package.json': generatePackageJson(name, options, port),
    'tsconfig.json': generateTsConfig(),
    'tsup.config.ts': generateTsupConfig(),
    'README.md': generateReadme(name, className, port, options.description)
  }
}

function generateIndexFile(name: string, className: string, port: number): string {
  return `/**
 * ${className} HTTP Server
 *
 * Simple HTTP server that applies Idiomark personality to requests
 */

import { HTTPServerAdapter } from '@idiomark/projectors'
import type { HTTPServerOptions } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'
import { readFileSync } from 'fs'
import { setupRoutes } from './routes'
import { setupMiddleware } from './middleware'

export interface ${className}ServerOptions {
  personality: IdiomarkFile | string
  port?: number
  cors?: boolean
}

/**
 * Create and start the ${className} HTTP server
 */
export async function create${className}Server(options: ${className}ServerOptions): Promise<HTTPServerAdapter> {
  // Load personality
  const personality = typeof options.personality === 'string'
    ? JSON.parse(readFileSync(options.personality, 'utf-8')) as IdiomarkFile
    : options.personality

  // Configure server
  const serverOptions: HTTPServerOptions = {
    personality,
    port: options.port || ${port},
    cors: options.cors !== false
  }

  // Create server instance
  const server = new HTTPServerAdapter(serverOptions)

  // Setup custom middleware
  setupMiddleware(server, personality)

  // Setup custom routes
  setupRoutes(server, personality)

  return server
}

/**
 * Start the server (for CLI usage)
 */
export async function start${className}Server(options: ${className}ServerOptions): Promise<void> {
  const server = await create${className}Server(options)

  const port = options.port || ${port}

  console.log(\`Starting ${className} HTTP server on port \${port}...\`)

  await server.start()

  console.log(\`Server listening on http://localhost:\${port}\`)
  console.log('\\nPress Ctrl+C to stop')
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

function generateRoutesFile(name: string, className: string): string {
  return `/**
 * Custom Routes for ${className} HTTP Server
 *
 * Add custom endpoints beyond the default /generate, /stream, etc.
 */

import type { HTTPServerAdapter } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

/**
 * Setup custom routes for the server
 */
export function setupRoutes(server: HTTPServerAdapter, personality: IdiomarkFile): void {
  // The HTTPServerAdapter already provides:
  // - POST /generate - Generate response with personality
  // - POST /stream - Stream response (SSE)
  // - GET /personality - View personality JSON
  // - GET /system-prompt - View system prompt
  // - GET /health - Health check
  // - GET / - Root page with usage info

  // Add custom routes here by extending the server
  // Example:

  /*
  server.app?.get('/custom-endpoint', async (req, res) => {
    const personality = personality.personality

    res.json({
      message: \`Custom response from \${personality?.voice?.tone?.primary || 'neutral'} personality\`
    })
  })
  */

  // Example: Personality info endpoint
  server.app?.get('/voice-profile', (req, res) => {
    const voice = personality.personality?.voice
    res.json({
      tone: voice?.tone || { primary: 'neutral' },
      formality: voice?.formality || 0.5,
      directness: voice?.directness || 0.5,
      humor: voice?.humor || 0,
      enthusiasm: voice?.enthusiasm || 0.5
    })
  })

  // Example: Values endpoint
  server.app?.get('/values', (req, res) => {
    const values = personality.personality?.values || []
    res.json({
      values: values.map(v => ({
        name: v.name,
        strength: v.strength || 0.5
      }))
    })
  })

  // Example: Domains endpoint
  server.app?.get('/domains', (req, res) => {
    const domains = personality.personality?.domains || []
    res.json({
      domains: domains.map(d => ({
        name: d.name,
        expertise: d.expertise || 0.5
      }))
    })
  })
}
`
}

function generateMiddlewareFile(name: string, className: string): string {
  return `/**
 * Custom Middleware for ${className} HTTP Server
 *
 * Add request/response processing middleware
 */

import type { HTTPServerAdapter } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

/**
 * Setup custom middleware for the server
 */
export function setupMiddleware(server: HTTPServerAdapter, personality: IdiomarkFile): void {
  // Add request logging
  /*
  server.app?.use((req, res, next) => {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`)
    next()
  })
  */

  // Add personality headers to all responses
  /*
  server.app?.use((req, res, next) => {
    const voice = personality.personality?.voice
    res.setHeader('X-Personality-Tone', voice?.tone?.primary || 'neutral')
    res.setHeader('X-Personality-Formality', (voice?.formality || 0.5).toString())
    next()
  })
  */

  // Add rate limiting middleware
  /*
  const rateLimiter = createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 100
  })

  server.app?.use(rateLimiter)
  */
}

/**
 * Example rate limiter
 */
function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const requests = new Map<string, number[]>()

  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowStart = now - options.windowMs

    // Clean old requests
    let userRequests = requests.get(ip) || []
    userRequests = userRequests.filter((time: number) => time > windowStart)

    // Check rate limit
    if (userRequests.length >= options.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(options.windowMs / 1000)
      })
    }

    // Add current request
    userRequests.push(now)
    requests.set(ip, userRequests)

    next()
  }
}
`
}

function generatePackageJson(name: string, options: ProjectionCreateOptions, port: number): string {
  return JSON.stringify({
    name: `@idiomark/projection-adapter-${name}`,
    version: '1.0.0',
    description: options.description || `${name} HTTP projection adapter for Idiomark Protocol`,
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
      type: 'http',
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

function generateReadme(name: string, className: string, port: number, description?: string): string {
  return `# @idiomark/projection-adapter-${name}

${description || `${name} HTTP projection adapter for Idiomark Protocol`}

## Overview

Simple HTTP server that applies a Idiomark personality to incoming requests. Perfect for quick testing and standalone personality services.

## Features

- **POST /generate** - Generate responses with personality
- **POST /stream** - Stream responses (Server-Sent Events)
- **GET /personality** - View full personality JSON
- **GET /system-prompt** - View the system prompt
- **GET /voice-profile** - Voice characteristics
- **GET /values** - Core values and principles
- **GET /domains** - Domain expertise areas
- **GET /health** - Health check endpoint

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

### Start Server

\`\`\`bash
npm start -- ./path/to/personality.idiomark
\`\`\`

Server will start on http://localhost:${port}

### Generate Response

\`\`\`bash
curl -X POST http://localhost:${port}/generate \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"message": "Hello! What can you tell me about yourself?"}'
\`\`\`

### Stream Response

\`\`\`bash
curl -X POST http://localhost:${port}/stream \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"message": "Tell me a story"}'
\`\`\`

### Get Personality Info

\`\`\`bash
curl http://localhost:${port}/personality
curl http://localhost:${port}/voice-profile
curl http://localhost:${port}/values
curl http://localhost:${port}/domains
\`\`\`

## API Reference

### POST /generate

Generate a response with the personality.

**Request:**
\`\`\`json
{
  "message": "Your message here",
  "mode": "balanced",
  "context": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "content": "Response with personality applied",
  "mode": "balanced",
  "tokens": { "input": 20, "output": 50, "total": 70 },
  "duration": 1234
}
\`\`\`

### POST /stream

Stream a response using Server-Sent Events.

**Request:** Same as /generate

**Response:** SSE stream with \`content\` events

\`\`\`
data: {"chunk": "First"}
data: {"chunk": "part"}
data: {"chunk": "of response"}
data: [DONE]
\`\`\`

### GET /system-prompt

Get the system prompt that encodes this personality.

**Query params:**
- \`mode\`: strict | balanced | subtle (default: balanced)

## Configuration

- **Port**: ${port}
- **CORS**: Enabled by default

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
