/**
 * Forum/Community Adapter Generator
 *
 * Generates a forum adapter with thread fetching,
 * post parsing, and user profile extraction.
 */

import type { CreateOptions } from '../commands/adapter'

export async function generateForumAdapter(
  name: string,
  options: CreateOptions
): Promise<{ [filePath: string]: string }> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateForumIndex(name, className, options),
    'src/types.ts': generateForumTypes(name, className),
    'src/client.ts': generateForumClient(name, className, options),
    'src/parser.ts': generateForumParser(name, className),
    'src/config.ts': generateForumConfig(name),
    'package.json': generateForumPackageJson(name, options),
    'tsconfig.json': generateForumTsConfig(),
    'tsup.config.ts': generateForumTsupConfig(),
    'README.md': generateForumReadme(name, options)
  }
}

function generateForumIndex(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} Forum Adapter for Idiomark
 *
 * Fetches user posts and threads from ${name} forum for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

export type {
  ${className}ForumUser,
  ${className}ForumPost,
  ${className}ForumThread,
  ${className}ForumAuth
} from './types'

import type {
  ${className}ForumUser,
  ${className}ForumPost,
  ${className}ForumAuth
} from './types'

import { ForumClient } from './client'
import { ForumParser } from './parser'
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
  private client: ForumClient
  private parser: ForumParser
  private config: ${className}Config
  private auth: ${className}ForumAuth
  private baseURL = '${options.baseUrl || 'https://' + name + '.com'}'

  constructor(auth: ${className}ForumAuth, config?: Partial<${className}Config>) {
    this.auth = auth
    this.config = new ${className}Config(config)
    this.client = new ForumClient(this.baseURL, this.auth, this.config)
    this.parser = new ForumParser()
  }

  /**
   * Authenticate with forum
   */
  async authenticate(): Promise<boolean> {
    try {
      const response = await this.client.authenticate()
      if (response && response.username) {
        this.auth.username = response.username
        this.auth.userId = response.userId
      }
      return response !== null
    } catch (error) {
      console.error('${name} forum authentication error:', error)
      return false
    }
  }

  /**
   * Fetch all relevant data from forum for personality analysis
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate, includeReplies = true } = options

    if (!this.auth.username) {
      const authenticated = await this.authenticate()
      if (!authenticated || !this.auth.username) {
        throw new Error('${name} authentication failed')
      }
    }

    const allContent: RawContent[] = []

    try {
      // 1. Fetch user profile
      const profile = await this.fetchUserProfile()
      if (profile) {
        allContent.push(this.profileToRawContent(profile))
      }

      // 2. Fetch user's posts
      const posts = await this.fetchUserPosts({ limit, startDate, endDate })
      allContent.push(...posts.map(p => this.postToRawContent(p)))

      // 3. Fetch replies if requested
      if (includeReplies) {
        const replies = await this.fetchUserReplies({ limit })
        allContent.push(...replies.map(r => this.replyToRawContent(r)))
      }

      return allContent
    } catch (error) {
      throw new Error(\`Failed to fetch ${name} data: \${(error as Error).message}\`)
    }
  }

  /**
   * Normalize raw forum content to standard format
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
   * Fetch user profile
   */
  async fetchUserProfile(): Promise<${className}ForumUser | null> {
    try {
      return await this.client.getUserProfile(this.auth.username!)
    } catch {
      return null
    }
  }

  /**
   * Fetch user's posts
   */
  async fetchUserPosts(options: {
    limit?: number
    startDate?: Date
    endDate?: Date
  } = {}): Promise<${className}ForumPost[]> {
    const { limit = 100 } = options
    return await this.client.getUserPosts(this.auth.username!, limit)
  }

  /**
   * Fetch user's replies
   */
  async fetchUserReplies(options: { limit?: number } = {}): Promise<${className}ForumPost[]> {
    const { limit = 100 } = options
    return await this.client.getUserReplies(this.auth.username!, limit)
  }

  /**
   * Convert profile to raw content
   */
  private profileToRawContent(user: ${className}ForumUser): RawContent {
    const textParts = [
      user.username,
      user.bio,
      user.signature
    ].filter(Boolean).join('\\n')

    return {
      id: \`profile_\\\${user.id}\`,
      type: 'profile',
      text: textParts,
      created_at: user.joinedDate,
      author: {
        id: user.id,
        username: user.username,
        name: user.displayName || user.username
      },
      metadata: {
        profile: {
          bio: user.bio,
          location: user.location,
          website: user.website,
          postCount: user.postCount
        }
      }
    }
  }

  /**
   * Convert post to raw content
   */
  private postToRawContent(post: ${className}ForumPost): RawContent {
    return {
      id: post.id,
      type: 'post',
      text: post.content,
      created_at: post.createdAt,
      author: {
        id: post.author.id,
        username: post.author.username,
        name: post.author.displayName || post.author.username
      },
      metrics: {
        likes: post.reactions?.upvotes || 0,
        replies: post.replyCount
      },
      metadata: {
        url: post.url,
        threadTitle: post.thread?.title,
        forum: post.forum?.name,
        tags: post.tags
      }
    }
  }

  /**
   * Convert reply to raw content
   */
  private replyToRawContent(reply: ${className}ForumPost): RawContent {
    return {
      id: reply.id,
      type: 'reply',
      text: reply.content,
      created_at: reply.createdAt,
      author: {
        id: reply.author.id,
        username: reply.author.username,
        name: reply.author.displayName || reply.author.username
      },
      metrics: {
        likes: reply.reactions?.upvotes || 0
      },
      metadata: {
        url: reply.url,
        threadTitle: reply.thread?.title,
        parentPostId: reply.parentPostId
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
 * Create a ${name} forum adapter instance
 */
export function create${className}Adapter(
  auth: ${className}ForumAuth,
  config?: Partial<${className}Config>
): ${className}Adapter {
  return new ${className}Adapter(auth, config)
}

/**
 * Quick fetch from forum
 */
export async function fetchForumContent(
  auth: ${className}ForumAuth,
  options?: FetchOptions & { config?: Partial<${className}Config> }
): Promise<${className}AdapterOutput> {
  const adapter = create${className}Adapter(auth, options?.config)
  return adapter.extractRawText(options)
}
`
}

function generateForumTypes(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Forum Types
 */

export interface ${className}ForumAuth {
  username?: string
  userId?: string
  apiKey?: string
  token?: string
  cookie?: string
}

export interface ${className}ForumUser {
  id: string
  username: string
  displayName?: string
  avatar?: string
  bio?: string
  signature?: string
  location?: string
  website?: string
  joinedDate: string
  postCount: number
  reputation?: number
}

export interface ${className}ForumPost {
  id: string
  content: string
  author: ${className}ForumUser
  createdAt: string
  updatedAt?: string
  url: string
  replyCount: number
  viewCount?: number
  reactions?: {
    upvotes: number
    downvotes: number
  }
  thread?: {
    id: string
    title: string
  }
  forum?: {
    id: string
    name: string
  }
  tags?: string[]
  parentPostId?: string
}
`
}

function generateForumClient(name: string, className: string, options: CreateOptions): string {
  const authHeaders = generateForumAuthHeaders(options.auth)

  return `/**
 * ${toPascalCase(name)} Forum Client
 *
 * Handles forum API requests with authentication
 */

import type { ${className}Config } from './config'
import type { ${className}ForumAuth, ${className}ForumUser, ${className}ForumPost } from './types'

export class ForumClient {
  private baseURL: string
  private auth: ${className}ForumAuth
  private config: ${className}Config

  constructor(baseURL: string, auth: ${className}ForumAuth, config: ${className}Config) {
    this.baseURL = baseURL
    this.auth = auth
    this.config = config
  }

  /**
   * Authenticate with forum
   */
  async authenticate(): Promise<{ username: string; userId: string } | null> {
    try {
      // Test authentication by fetching user profile
      const response = await this.makeRequest<${className}ForumUser>(
        '/user/profile'
      )

      if (response.ok && response.data) {
        return {
          username: response.data.username,
          userId: response.data.id
        }
      }

      return null
    } catch (error) {
      console.error('Authentication failed:', error)
      return null
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(username: string): Promise<${className}ForumUser | null> {
    try {
      const response = await this.makeRequest<${className}ForumUser>(
        \`/users/\\\${username}\`
      )

      if (response.ok && response.data) {
        return response.data
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Get user's posts
   */
  async getUserPosts(username: string, limit: number): Promise<${className}ForumPost[]> {
    try {
      const response = await this.makeRequest<${className}ForumPost[]>(
        \`/users/\\\${username}/posts?limit=\\\${limit}\`
      )

      if (response.ok && response.data) {
        return response.data
      }

      return []
    } catch {
      return []
    }
  }

  /**
   * Get user's replies
   */
  async getUserReplies(username: string, limit: number): Promise<${className}ForumPost[]> {
    try {
      const response = await this.makeRequest<${className}ForumPost[]>(
        \`/users/\\\${username}/replies?limit=\\\${limit}\`
      )

      if (response.ok && response.data) {
        return response.data
      }

      return []
    } catch {
      return []
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(endpoint: string): Promise<{
    ok: boolean
    data?: T
    status: number
  }> {
    const url = \\\`\\\${this.baseURL}\\\${endpoint}\\\`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'idiomark-protocol-${name}-forum-adapter/1.0.0',
${authHeaders}
    }

    try {
      const response = await fetch(url, { headers })

      if (!response.ok) {
        return { ok: false, status: response.status }
      }

      const data = await response.json() as T
      return { ok: true, data, status: response.status }
    } catch (error) {
      console.error('Forum API request error:', error)
      return { ok: false, status: 0 }
    }
  }
}
`
}

function generateForumParser(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Forum Content Parser
 *
 * Parses forum-specific content and formatting
 */

export class ForumParser {
  /**
   * Parse forum-specific markup to plain text
   */
  parseMarkup(content: string): string {
    let text = content

    // Parse BBCode tags
    text = this.parseBBCode(text)

    // Parse Markdown
    text = this.parseMarkdown(text)

    // Clean up whitespace
    text = text.replace(/\\s+/g, ' ').trim()

    return text
  }

  /**
   * Parse BBCode tags
   */
  private parseBBCode(text: string): string {
    // Bold
    text = text.replace(/\\[b\\](.+?)\\[\\/b\\]/gi, '$1')

    // Italic
    text = text.replace(/\\[i\\](.+?)\\[\\/i\\]/gi, '$1')

    // Underline
    text = text.replace(/\\[u\\](.+?)\\[\\/u\\]/gi, '$1')

    // URLs
    text = text.replace(/\\[url\\](.+?)\\[\\/url\\]/gi, '$1')
    text = text.replace(/\\[url=([^\\]]+)\\](.+?)\\[\\/url\\]/gi, '$2 ($1)')

    // Images
    text = text.replace(/\\[img\\](.+?)\\[\\/img\\]/gi, '[image: $1]')

    // Quotes
    text = text.replace(/\\[quote\\](.+?)\\[\\/quote\\]/gis, '')
    text = text.replace(/\\[quote=([^\\]]+)\\]/gi, 'Quote from $1:')

    // Code blocks
    text = text.replace(/\\[code\\][\\s\\S]*?\\[\\/code\\]/gi, '[code block]')

    // Lists
    text = text.replace(/\\[\\*\\]/g, '•')

    // Remove remaining BBCode tags
    text = text.replace(/\\[\\/?[a-z]+(?:=[^\\]]*)?\\]/gi, '')

    return text
  }

  /**
   * Parse Markdown
   */
  private parseMarkdown(text: string): string {
    // Headers
    text = text.replace(/^#{1,6}\\s+/gm, '')

    // Bold/italic
    text = text.replace(/\\*\\*(.+?)\\*\\*/g, '$1')
    text = text.replace(/\\*(.+?)\\*/g, '$1')
    text = text.replace(/~~(.+?)~~/g, '$1')

    // Links
    text = text.replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')

    // Images
    text = text.replace(/!\\[([^\\]]*)\\]\\([^\\)]+\\)/g, '[image: $1]')

    // Code blocks
    text = text.replace(/\\\`\\\`\\\`[\\s\\S]*?\\\`\\\`\\\`/g, '[code block]')
    text = text.replace(/\\\`([^\\\`]+)\\\`/g, '$1')

    return text
  }

  /**
   * Extract mentions from content
   */
  extractMentions(content: string): string[] {
    const mentions: string[] = []

    // @username format
    const atMentions = content.match(/@[a-zA-Z0-9_-]+/g) || []
    mentions.push(...atMentions.map(m => m.slice(1)))

    return [...new Set(mentions)]
  }

  /**
   * Extract emojis from content
   */
  extractEmojis(content: string): string[] {
    const emojiRegex = /\\p{Emoji}/gu
    return content.match(emojiRegex) || []
  }

  /**
   * Clean forum content for analysis
   */
  cleanContent(content: string): string {
    let cleaned = content

    // Remove signatures
    cleaned = cleaned.replace(/\\n---\\n[\\s\\S]*$/m, '')

    // Remove "edited" markers
    cleaned = cleaned.replace(/\\[Edited[\\s\\S]*?\\]/gi, '')

    // Remove quote blocks
    cleaned = cleaned.replace(/Quote:/g, '')

    return cleaned.trim()
  }
}
`
}

function generateForumConfig(name: string): string {
  return `/**
 * ${toPascalCase(name)} Forum Adapter Configuration
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

function generateForumPackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} forum adapter for Idiomark Protocol`,
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
    }
  }, null, 2)
}

function generateForumTsConfig(): string {
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

function generateForumTsupConfig(): string {
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

function generateForumReadme(name: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name} (Forum)

${options.description || `${name} forum adapter for Idiomark Protocol`}

## Features

- Fetch user posts and replies from ${name}
- Parse BBCode and Markdown content
- Extract user profiles and signatures
- Track post counts and reputation

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(name)}Adapter } from '@idiomark/adapter-${name}'

const adapter = create${toPascalCase(name)}Adapter({
  username: 'your-username',
  token: process.env.${name.toUpperCase()}_TOKEN
})

await adapter.authenticate()

const content = await adapter.fetchData({
  limit: 100,
  includeReplies: true
})
\`\`\`

## Configuration

\`\`\`typescript
const adapter = create${toPascalCase(name)}Adapter(auth, {
  timeout: 30000,
  maxRetries: 3,
  cacheEnabled: true
})
\`\`\`

${options.docs ? `## Documentation

[${name} API Documentation](${options.docs})` : ''}

## Content Parsing

The adapter handles:
- BBCode formatting (\`[b]\`, \`[i]\`, \`[url]\`, etc.)
- Markdown formatting
- User mentions
- Code blocks
- Quotes

## License

MIT
`
}

function generateForumAuthHeaders(authType: string): string {
  switch (authType) {
    case 'bearer':
      return `      ...(this.auth.token && { 'Authorization': \`Bearer \\\${this.auth.token}\` }),`
    case 'apikey':
      return `      ...(this.auth.apiKey && { 'X-API-Key': this.auth.apiKey }),`
    case 'oauth2':
      return `      ...(this.auth.token && { 'Authorization': \`Bearer \\\${this.auth.token}\` }),`
    default:
      return `      ...(this.auth.cookie && { 'Cookie': this.auth.cookie }),`
  }
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
