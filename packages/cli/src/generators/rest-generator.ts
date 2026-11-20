/**
 * REST API Adapter Generator
 *
 * Generates a complete REST API adapter with TypeScript types, authentication,
 * rate limiting, and error handling.
 */

import type { CreateOptions } from '../commands/adapter'

export interface GeneratedFiles {
  [filePath: string]: string
}

export async function generateRestAdapter(
  name: string,
  options: CreateOptions
): Promise<GeneratedFiles> {
  const className = toPascalCase(name)
  const varName = toCamelCase(name)

  return {
    'src/index.ts': generateIndexFile(name, className, options),
    'src/types.ts': generateTypesFile(name, className),
    'src/api.ts': generateApiFile(name, className, options),
    'src/config.ts': generateConfigFile(name, className, options),
    'package.json': generatePackageJson(name, options),
    'tsconfig.json': generateTsConfig(),
    'tsup.config.ts': generateTsupConfig(),
    'README.md': generateReadme(name, className, options)
  }
}

function generateIndexFile(name: string, className: string, options: CreateOptions): string {
  const authImports = generateAuthImports(options.auth)
  const authFields = generateAuthFields(options.auth)
  const authLogic = generateAuthLogic(options.auth)
  const rateLimitLogic = generateRateLimitLogic(options.auth)

  return `/**
 * ${className} Adapter for Idiomark
 *
 * Fetches user data from ${name} API for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

${authImports}

export type {
  ${className}User,
  ${className}Post,
  ${className}Auth,
  ${className}RateLimit
} from './types'

import type {
  ${className}User,
  ${className}Post,
  ${className}Auth
} from './types'

import { makeRequest } from './api'
import { ${className}Config } from './config'

export interface ${className}AdapterOutput {
  rawContent: string[]
  metadata: {
    sampleSize: number
    timeframe: { from: string; to: string }
    sources: string[]
  }
}

export class ${className}Adapter implements PlatformAdapter {
  readonly name = '${name}'
  private auth: ${className}Auth
  private config: ${className}Config
  private baseURL = '${options.baseUrl || 'https://api.' + name + '.com'}'

${authFields}
  // Cached user data
  private userData?: ${className}User

  constructor(auth: ${className}Auth, config?: Partial<${className}Config>) {
    this.auth = auth
    this.config = new ${className}Config(config)
${rateLimitLogic}
  }

  /**
   * Authenticate with ${name} and optionally fetch user profile
   */
  async authenticate(): Promise<boolean> {
    try {
${authLogic}
      const response = await makeRequest<${className}User>(
        this.baseURL,
        '/user',
        this.auth
      )

      if (!response.ok || !response.data) {
        return false
      }

      this.userData = response.data
      this.auth.userId = response.data.id
      this.auth.username = response.data.username
      return true
    } catch (error) {
      console.error('${name} authentication error:', error)
      return false
    }
  }

  /**
   * Fetch all relevant data from ${name} for personality analysis
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate, includeReplies = true } = options

    // Ensure we're authenticated
    if (!this.auth.userId) {
      const authenticated = await this.authenticate()
      if (!authenticated || !this.auth.userId) {
        throw new Error('${name} authentication failed')
      }
    }

    const allContent: RawContent[] = []

    try {
      // 1. Fetch user profile
      const userProfile = await this.fetchUserProfile()
      if (userProfile) {
        allContent.push(this.profileToRawContent(userProfile))
      }

      // 2. Fetch posts
      const posts = await this.fetchPosts({ limit, startDate, endDate })
      allContent.push(...posts.map(p => this.postToRawContent(p)))

      // 3. Fetch comments if requested
      if (includeReplies) {
        const comments = await this.fetchComments({ limit, startDate, endDate })
        allContent.push(...comments.map(c => this.commentToRawContent(c)))
      }

      return allContent
    } catch (error) {
      throw new Error(\`Failed to fetch ${name} data: \${(error as Error).message}\`)
    }
  }

  /**
   * Normalize raw ${name} content to standard format
   */
  normalize(raw: RawContent): NormalizedContent {
    return {
      id: raw.id,
      platform: this.name,
      type: raw.type as 'post' | 'comment' | 'reply',
      text: raw.text,
      timestamp: raw.created_at,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        name: raw.author.name
      },
      metrics: raw.metrics,
      metadata: raw.metadata,
      raw: raw.raw
    }
  }

  /**
   * Fetch user profile data
   */
  async fetchUserProfile(): Promise<${className}User | null> {
    try {
      const response = await makeRequest<${className}User>(
        this.baseURL,
        \`/users/\${this.auth.userId}\`,
        this.auth
      )

      if (!response.ok || !response.data) {
        return null
      }

      return response.data
    } catch {
      return null
    }
  }

  /**
   * Fetch posts from the user
   */
  async fetchPosts(options: {
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<${className}Post[]> {
    const { limit = 100 } = options

    const params = new URLSearchParams({
      limit: limit.toString()
    })

    if (options.startDate) {
      params.append('since', options.startDate.toISOString())
    }

    if (options.endDate) {
      params.append('until', options.endDate.toISOString())
    }

    const response = await makeRequest<${className}Post[]>(
      this.baseURL,
      \`/users/\${this.auth.userId}/posts?\${params.toString()}\`,
      this.auth
    )

    if (!response.ok || !response.data) {
      return []
    }

    return response.data
  }

  /**
   * Fetch comments from the user
   */
  async fetchComments(options: {
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<any[]> {
    const { limit = 100 } = options

    const response = await makeRequest<any[]>(
      this.baseURL,
      \`/users/\${this.auth.userId}/comments?limit=\${limit}\`,
      this.auth
    )

    if (!response.ok || !response.data) {
      return []
    }

    return response.data
  }

  /**
   * Convert user profile to raw content
   */
  private profileToRawContent(user: ${className}User): RawContent {
    const textParts = [
      user.name || user.username,
      user.bio || ''
    ].filter(Boolean).join(' ')

    return {
      id: \`profile_\${user.id}\`,
      type: 'profile',
      text: textParts,
      created_at: user.created_at,
      author: {
        id: user.id,
        username: user.username,
        name: user.name || user.username
      },
      metadata: {
        profile: {
          bio: user.bio,
          location: user.location,
          website: user.website
        }
      }
    }
  }

  /**
   * Convert post to raw content
   */
  private postToRawContent(post: ${className}Post): RawContent {
    return {
      id: post.id,
      type: 'post',
      text: post.text,
      created_at: post.created_at,
      author: {
        id: post.author.id,
        username: post.author.username,
        name: post.author.name
      },
      metrics: {
        likes: post.likes,
        shares: post.shares,
        replies: post.replies
      },
      metadata: {
        url: post.url,
        tags: post.tags
      }
    }
  }

  /**
   * Convert comment to raw content
   */
  private commentToRawContent(comment: any): RawContent {
    return {
      id: comment.id,
      type: 'comment',
      text: comment.text,
      created_at: comment.created_at,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        name: comment.author.name
      },
      metrics: {
        likes: comment.likes
      }
    }
  }

  /**
   * Extract raw text content from ${name} data for personality analysis
   */
  async extractRawText(options: FetchOptions = {}): Promise<${className}AdapterOutput> {
    const content = await this.fetchData(options)
    const startDate = options.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const endDate = options.endDate || new Date()

    const rawContent = content.map(item => item.text).filter(Boolean)
    const sources = Array.from(new Set(content.map(item => item.type)))

    return {
      rawContent,
      metadata: {
        sampleSize: rawContent.length,
        timeframe: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        sources
      }
    }
  }
}

/**
 * Create a ${name} adapter instance
 */
export function create${className}Adapter(
  auth: ${className}Auth,
  config?: Partial<${className}Config>
): ${className}Adapter {
  return new ${className}Adapter(auth, config)
}

/**
 * Quick fetch of user content
 */
export async function fetch${className}Content(
  auth: ${className}Auth,
  options?: FetchOptions & { config?: Partial<${className}Config> }
): Promise<${className}AdapterOutput> {
  const adapter = create${className}Adapter(auth, options?.config)
  return adapter.extractRawText(options)
}
`
}

function generateTypesFile(name: string, className: string): string {
  return `/**
 * ${className} API Types
 */

export interface ${className}Auth {
  userId?: string
  username?: string
  apiKey?: string
  bearerToken?: string
  oauthToken?: string
}

export interface ${className}User {
  id: string
  username: string
  name?: string
  bio?: string
  avatar?: string
  location?: string
  website?: string
  created_at: string
  followers?: number
  following?: number
}

export interface ${className}Post {
  id: string
  text: string
  author: ${className}User
  created_at: string
  url: string
  likes: number
  shares: number
  replies: number
  tags?: string[]
}

export interface ${className}RateLimit {
  remaining: number
  reset: number
  limit: number
}

export interface ${className}Error {
  message: string
  code: string
  status: number
}
`
}

function generateApiFile(name: string, className: string, options: CreateOptions): string {
  const authHeaders = generateAuthHeaders(options.auth)

  return `/**
 * ${className} API Client
 *
 * Handles all HTTP requests with authentication, rate limiting, and error handling
 */

import type { ${className}Auth, ${className}RateLimit } from './types'

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  status: number
  rateLimit?: ${className}RateLimit
}

/**
 * Make an authenticated request to the ${name} API
 */
export async function makeRequest<T>(
  baseURL: string,
  endpoint: string,
  auth: ${className}Auth,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = \`\${baseURL}\${endpoint}\`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'idiomark-protocol-${name}-adapter/1.0.0',
${authHeaders}
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    })

    // Extract rate limit info
    const rateLimit = extractRateLimit(response.headers)

    if (response.status === 401) {
      return { ok: false, status: 401, rateLimit }
    }

    if (response.status === 403) {
      return { ok: false, status: 403, rateLimit }
    }

    if (response.status === 404) {
      return { ok: false, status: 404, rateLimit }
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      if (retryAfter) {
        await waitForReset(parseInt(retryAfter) * 1000)
        return makeRequest(baseURL, endpoint, auth, options)
      }
      return { ok: false, status: 429, rateLimit }
    }

    if (!response.ok) {
      return { ok: false, status: response.status, rateLimit }
    }

    const data = await response.json() as T
    return { ok: true, data, status: response.status, rateLimit }
  } catch (error) {
    console.error('${name} API request error:', error)
    return { ok: false, status: 0 }
  }
}

/**
 * Extract rate limit information from response headers
 */
function extractRateLimit(headers: Headers): ${className}RateLimit | undefined {
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')
  const limit = headers.get('x-ratelimit-limit')

  if (!remaining && !reset && !limit) {
    return undefined
  }

  return {
    remaining: remaining ? parseInt(remaining) : 0,
    reset: reset ? parseInt(reset) * 1000 : 0,
    limit: limit ? parseInt(limit) : 0
  }
}

/**
 * Wait for rate limit to reset
 */
async function waitForReset(ms: number): Promise<void> {
  console.log(\`Rate limit exceeded. Waiting \${Math.ceil(ms / 1000)}s for reset...\`)
  await new Promise(resolve => setTimeout(resolve, ms))
}
`
}

function generateConfigFile(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${className} Adapter Configuration
 */

export interface ${className}ConfigOptions {
  timeout?: number
  maxRetries?: number
  cacheEnabled?: boolean
  cacheTTL?: number
}

export class ${className}Config {
  public timeout: number
  public maxRetries: number
  public cacheEnabled: boolean
  public cacheTTL: number

  constructor(options: ${className}ConfigOptions = {}) {
    this.timeout = options.timeout ?? 30000
    this.maxRetries = options.maxRetries ?? 3
    this.cacheEnabled = options.cacheEnabled ?? true
    this.cacheTTL = options.cacheTTL ?? 300000 // 5 minutes
  }

  withTimeout(timeout: number): ${className}Config {
    this.timeout = timeout
    return this
  }

  withRetries(maxRetries: number): ${className}Config {
    this.maxRetries = maxRetries
    return this
  }

  withCache(enabled: boolean, ttl?: number): ${className}Config {
    this.cacheEnabled = enabled
    if (ttl !== undefined) {
      this.cacheTTL = ttl
    }
    return this
  }
}
`
}

function generatePackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} adapter for Idiomark Protocol`,
    main: './dist/index.mjs',
    types: './dist/index.d.mts',
    exports: {
      '.': {
        import: './dist/index.mjs',
        types: './dist/index.d.mts'
      }
    },
    scripts: {
      dev: 'tsup --watch',
      build: 'tsup',
      test: 'vitest',
      lint: 'eslint src/',
      clean: 'rm -rf dist'
    },
    dependencies: {
      '@idiomark/core': 'workspace:*'
    },
    devDependencies: {
      '@types/node': '^22.13.5',
      tsup: '^8.4.0',
      typescript: '^5.7.3',
      vitest: '^3.0.7'
    },
    idiomark: {
      type: options.template,
      auth: options.auth,
      baseUrl: options.baseUrl,
      docs: options.docs,
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

function generateReadme(name: string, className: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name}

${options.description || `${name} adapter for Idiomark Protocol`}

## Features

- Fetch user profiles, posts, and comments from ${name}
- Built-in rate limiting and error handling
- Caching support for improved performance
- TypeScript support with full type definitions

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Setup

1. ${options.auth === 'none' ? 'No authentication required' : `Get your ${name} API credentials from ${options.baseUrl}`}
${options.auth !== 'none' ? `2. Set up your API key/token in your environment variables` : ''}

${options.docs ? `## API Documentation

For more details on the ${name} API, see: [${options.docs}](${options.docs})` : ''}

## Usage

\`\`\`typescript
import { create${className}Adapter } from '@idiomark/adapter-${name}'

const adapter = create${className}Adapter({
${getAuthExample(name, options.auth)}
})

// Authenticate
await adapter.authenticate()

// Fetch content
const content = await adapter.fetchData({
  limit: 100,
  includeReplies: true
})

// Normalize to Idiomark format
const normalized = content.map(item => adapter.normalize(item))
\`\`\`

## Configuration

\`\`\`typescript
import { ${className}Config } from '@idiomark/adapter-${name}'

const config = new ${className}Config({
  timeout: 30000,
  maxRetries: 3,
  cacheEnabled: true,
  cacheTTL: 300000
})
\`\`\`

## Rate Limits

${options.baseUrl ? `See the [${name} API documentation](${options.baseUrl}) for current rate limits.` : 'Check the platform documentation for rate limit information.'}

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

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function generateAuthImports(authType: string): string {
  switch (authType) {
    case 'oauth2':
      return `import { OAuth2Client } from './auth'`
    case 'bearer':
      return `// Bearer token authentication`
    case 'apikey':
      return `// API key authentication`
    default:
      return `// No authentication required`
  }
}

function generateAuthFields(authType: string): string {
  switch (authType) {
    case 'oauth2':
      return `  private oauthClient?: OAuth2Client`
    case 'bearer':
      return `  private tokenType = 'Bearer'`
    case 'apikey':
      return `  private keyHeader = 'X-API-Key'`
    default:
      return ''
  }
}

function generateAuthLogic(authType: string): string {
  switch (authType) {
    case 'oauth2':
      return `      if (!this.auth.oauthToken) {
        throw new Error('OAuth token is required')
      }`
    case 'bearer':
      return `      if (!this.auth.bearerToken) {
        throw new Error('Bearer token is required')
      }`
    case 'apikey':
      return `      if (!this.auth.apiKey) {
        throw new Error('API key is required')
      }`
    default:
      return `      // No authentication needed`
  }
}

function generateRateLimitLogic(authType: string): string {
  if (authType === 'none') {
    return `    // No rate limiting for public API`
  }
  return `    // Rate limiting will be handled`
}

function generateAuthHeaders(authType: string): string {
  switch (authType) {
    case 'oauth2':
    case 'bearer':
      return `    ...(auth.bearerToken && { 'Authorization': \`Bearer \${auth.bearerToken}\` }),
    ...(auth.oauthToken && { 'Authorization': \`Bearer \${auth.oauthToken}\` }),`
    case 'apikey':
      return `    ...(auth.apiKey && { 'X-API-Key': auth.apiKey }),`
    default:
      return ''
  }
}

function getAuthExample(name: string, authType: string): string {
  switch (authType) {
    case 'oauth2':
      return `  oauthToken: process.env.${name.toUpperCase()}_OAUTH_TOKEN`
    case 'bearer':
      return `  bearerToken: process.env.${name.toUpperCase()}_TOKEN`
    case 'apikey':
      return `  apiKey: process.env.${name.toUpperCase()}_API_KEY`
    default:
      return `  // No authentication needed`
  }
}
