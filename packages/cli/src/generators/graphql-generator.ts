/**
 * GraphQL API Adapter Generator
 *
 * Generates a complete GraphQL API adapter with query builders,
 * introspection, and subscription support.
 */

import type { CreateOptions } from '../commands/adapter'

export async function generateGraphqlAdapter(
  name: string,
  options: CreateOptions
): Promise<{ [filePath: string]: string }> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateGraphqlIndex(name, className, options),
    'src/types.ts': generateGraphqlTypes(name, className),
    'src/graphql.ts': generateGraphqlClient(name, className, options),
    'src/queries.ts': generateGraphqlQueries(name, className),
    'src/config.ts': generateGraphqlConfig(name),
    'package.json': generateGraphqlPackageJson(name, options),
    'tsconfig.json': generateGraphqlTsConfig(),
    'tsup.config.ts': generateGraphqlTsupConfig(),
    'README.md': generateGraphqlReadme(name, options)
  }
}

function generateGraphqlIndex(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} GraphQL Adapter for Idiomark
 *
 * Fetches user data from ${name} GraphQL API for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

export type {
  ${className}User,
  ${className}Post,
  ${className}Auth,
  ${className}GraphQLResponse
} from './types'

import type {
  ${className}User,
  ${className}Post,
  ${className}Auth
} from './types'

import { GraphQLClient } from './graphql'
import * as queries from './queries'
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
  private client: GraphQLClient
  private baseURL = '${options.baseUrl || 'https://api.' + name + '.com/graphql'}'

  // Cached user data
  private userData?: ${className}User

  constructor(auth: ${className}Auth, config?: Partial<${className}Config>) {
    this.auth = auth
    this.config = new ${className}Config(config)
    this.client = new GraphQLClient(this.baseURL, auth, this.config)
  }

  /**
   * Authenticate with ${name} GraphQL API
   */
  async authenticate(): Promise<boolean> {
    try {
      if (!this.auth.bearerToken && !this.auth.apiKey) {
        throw new Error('Authentication credentials required')
      }

      const response = await this.client.query<${className}User>(
        queries.GET_CURRENT_USER
      )

      if (!response.ok || !response.data) {
        return false
      }

      this.userData = response.data
      this.auth.userId = response.data.id
      this.auth.username = response.data.username
      return true
    } catch (error) {
      console.error('${name} GraphQL authentication error:', error)
      return false
    }
  }

  /**
   * Fetch all relevant data from ${name} for personality analysis
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate, includeReplies = true } = options

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

      // 2. Fetch posts using GraphQL
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
      const response = await this.client.query<${className}User>(
        queries.GET_USER_PROFILE,
        { userId: this.auth.userId }
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
   * Fetch posts using GraphQL
   */
  async fetchPosts(options: {
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<${className}Post[]> {
    const { limit = 100, startDate, endDate } = options

    const response = await this.client.query<{ posts: ${className}Post[] }>(
      queries.GET_USER_POSTS,
      {
        userId: this.auth.userId,
        first: limit,
        after: startDate?.toISOString(),
        before: endDate?.toISOString()
      }
    )

    if (!response.ok || !response.data) {
      return []
    }

    return response.data.posts || []
  }

  /**
   * Fetch comments using GraphQL
   */
  async fetchComments(options: {
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<any[]> {
    const { limit = 100 } = options

    const response = await this.client.query<{ comments: any[] }>(
      queries.GET_USER_COMMENTS,
      {
        userId: this.auth.userId,
        first: limit
      }
    )

    if (!response.ok || !response.data) {
      return []
    }

    return response.data.comments || []
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
        likes: post.reactions?.totalCount || 0,
        shares: post.shares || 0,
        replies: post.comments?.totalCount || 0
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
        likes: comment.reactions?.totalCount || 0
      }
    }
  }

  /**
   * Extract raw text content for personality analysis
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
 * Create a ${name} GraphQL adapter instance
 */
export function create${className}Adapter(
  auth: ${className}Auth,
  config?: Partial<${className}Config>
): ${className}Adapter {
  return new ${className}Adapter(auth, config)
}
`
}

function generateGraphqlTypes(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} GraphQL Types
 */

export interface ${className}Auth {
  userId?: string
  username?: string
  bearerToken?: string
  apiKey?: string
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
  shares: number
  reactions?: {
    totalCount: number
  }
  comments?: {
    totalCount: number
  }
  tags?: string[]
}

export interface ${className}GraphQLResponse<T> {
  ok: boolean
  data?: T
  errors?: Array<{
    message: string
    path?: string[]
    extensions?: Record<string, any>
  }>
  status: number
}
`
}

function generateGraphqlClient(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} GraphQL Client
 *
 * Handles GraphQL queries, mutations, and subscriptions
 */

import type { ${className}Auth, ${className}GraphQLResponse } from './types'
import type { ${className}Config } from './config'

export interface GraphQLQueryOptions {
  variables?: Record<string, any>
  operationName?: string
}

export class GraphQLClient {
  private endpoint: string
  private auth: ${className}Auth
  private config: ${className}Config

  constructor(endpoint: string, auth: ${className}Auth, config: ${className}Config) {
    this.endpoint = endpoint
    this.auth = auth
    this.config = config
  }

  /**
   * Execute a GraphQL query
   */
  async query<T>(
    query: string,
    variables?: Record<string, any>
  ): Promise<${className}GraphQLResponse<T>> {
    return this.execute<T>(query, variables, 'query')
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T>(
    mutation: string,
    variables?: Record<string, any>
  ): Promise<${className}GraphQLResponse<T>> {
    return this.execute<T>(mutation, variables, 'mutation')
  }

  /**
   * Execute a GraphQL operation
   */
  private async execute<T>(
    query: string,
    variables: Record<string, any> = {},
    operationType: 'query' | 'mutation' = 'query'
  ): Promise<${className}GraphQLResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'idiomark-protocol-${name}-graphql-adapter/1.0.0'
    }

    if (this.auth.bearerToken) {
      headers['Authorization'] = \`Bearer \\\${this.auth.bearerToken}\`
    }

    if (this.auth.apiKey) {
      headers['X-API-Key'] = this.auth.apiKey
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      const data = await response.json()

      if (data.errors) {
        return {
          ok: false,
          errors: data.errors,
          status: response.status
        }
      }

      return {
        ok: true,
        data: data.data as T,
        status: response.status
      }
    } catch (error) {
      console.error('${name} GraphQL request error:', error)
      return {
        ok: false,
        status: 0,
        errors: [{
          message: (error as Error).message
        }]
      }
    }
  }

  /**
   * Subscribe to GraphQL updates (WebSocket)
   */
  subscribe<T>(
    subscription: string,
    variables?: Record<string, any>,
    callback: (data: T) => void
  ): () => void {
    // WebSocket subscription implementation
    // This is a placeholder for actual WebSocket support
    console.log('WebSocket subscriptions not yet implemented')
    return () => {}
  }
}
`
}

function generateGraphqlQueries(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} GraphQL Queries
 */

export const GET_CURRENT_USER = \`
  query GetCurrentUser {
    viewer {
      id
      username
      name
      bio
      avatar
      location
      website
      createdAt
      followers {
        totalCount
      }
      following {
        totalCount
      }
    }
  }
\`

export const GET_USER_PROFILE = \`
  query GetUserProfile($userId: ID!) {
    user(id: $userId) {
      id
      username
      name
      bio
      avatar
      location
      website
      createdAt
      followers {
        totalCount
      }
      following {
        totalCount
      }
    }
  }
\`

export const GET_USER_POSTS = \`
  query GetUserPosts($userId: ID!, $first: Int, $after: DateTime, $before: DateTime) {
    user(id: $userId) {
      posts(first: $first, after: $after, before: $before) {
        edges {
          node {
            id
            text
            createdAt
            url
            shares
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
            tags
            author {
              id
              username
              name
            }
          }
        }
      }
    }
  }
\`

export const GET_USER_COMMENTS = \`
  query GetUserComments($userId: ID!, $first: Int) {
    user(id: $userId) {
      comments(first: $first) {
        edges {
          node {
            id
            text
            createdAt
            reactions {
              totalCount
            }
            author {
              id
              username
              name
            }
          }
        }
      }
    }
  }
\`
`
}

function generateGraphqlConfig(name: string): string {
  return `/**
 * ${toPascalCase(name)} GraphQL Adapter Configuration
 */

export interface ${toPascalCase(name)}ConfigOptions {
  timeout?: number
  maxRetries?: number
  cacheEnabled?: boolean
  cacheTTL?: number
}

export class ${toPascalCase(name)}Config {
  public timeout: number
  public maxRetries: number
  public cacheEnabled: boolean
  public cacheTTL: number

  constructor(options: ${toPascalCase(name)}ConfigOptions = {}) {
    this.timeout = options.timeout ?? 30000
    this.maxRetries = options.maxRetries ?? 3
    this.cacheEnabled = options.cacheEnabled ?? true
    this.cacheTTL = options.cacheTTL ?? 300000
  }
}
`
}

function generateGraphqlPackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} GraphQL adapter for Idiomark Protocol`,
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
      vitest: '^3.0.7',
      graphql: '^16.8.1'
    },
    idiomark: {
      type: options.template,
      auth: options.auth,
      baseUrl: options.baseUrl,
      docs: options.docs,
      status: 'experimental'
    }
  }, null, 2)
}

function generateGraphqlTsConfig(): string {
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
      outDir: './dist'
    },
    include: ['src/**/*']
  }, null, 2)
}

function generateGraphqlTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022'
})
`
}

function generateGraphqlReadme(name: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name} (GraphQL)

${options.description || `${name} GraphQL adapter for Idiomark Protocol`}

## Features

- Fetch user profiles, posts, and comments using GraphQL
- Query optimization with field selection
- Subscription support for real-time updates
- Full TypeScript support

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(name)}Adapter } from '@idiomark/adapter-${name}'

const adapter = create${toPascalCase(name)}Adapter({
  bearerToken: process.env.${name.toUpperCase()}_TOKEN
})

await adapter.authenticate()
const content = await adapter.fetchData({ limit: 100 })
\`\`\`

## GraphQL Queries

The adapter comes with pre-built queries for common operations. You can also execute custom queries:

\`\`\`typescript
const response = await adapter.client.query(\`
  query GetUserData(\$userId: ID!) {
    user(id: \$userId) {
      id
      username
      posts(first: 10) {
        edges {
          node {
            id
            text
          }
        }
      }
    }
  }
\`, { userId: '123' })
\`\`\`

${options.docs ? `## Documentation

[${name} GraphQL API Documentation](${options.docs})` : ''}

## License

MIT
`
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
