/**
 * Web Scraper Adapter Generator
 *
 * Generates a web scraping adapter with HTML parsing,
 * CSS selectors, and anti-scraping measures.
 */

import type { CreateOptions } from '../commands/adapter'

export async function generateScrapeAdapter(
  name: string,
  options: CreateOptions
): Promise<{ [filePath: string]: string }> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateScrapeIndex(name, className, options),
    'src/types.ts': generateScrapeTypes(name, className),
    'src/scraper.ts': generateScraper(name, className),
    'src/selectors.ts': generateSelectors(name, className),
    'src/config.ts': generateScrapeConfig(name),
    'package.json': generateScrapePackageJson(name, options),
    'tsconfig.json': generateScrapeTsConfig(),
    'tsup.config.ts': generateScrapeTsupConfig(),
    'README.md': generateScrapeReadme(name, options)
  }
}

function generateScrapeIndex(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} Web Scraper Adapter for Idiomark
 *
 * Scrapes user content from ${name} website for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

export type {
  ${className}ScrapedPost,
  ${className}ScrapedProfile,
  ${className}ScrapeOptions
} from './types'

import type {
  ${className}ScrapedPost,
  ${className}ScrapedProfile,
  ${className}ScrapeOptions
} from './types'

import { WebScraper } from './scraper'
import { Selectors } from './selectors'
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
  private scraper: WebScraper
  private selectors: Selectors
  private config: ${className}Config
  private baseUrl = '${options.baseUrl || 'https://' + name + '.com'}'

  constructor(config?: Partial<${className}Config>) {
    this.config = new ${className}Config(config)
    this.scraper = new WebScraper(this.config)
    this.selectors = new Selectors()
  }

  /**
   * Initialize scraper (no authentication for public scraping)
   */
  async authenticate(): Promise<boolean> {
    try {
      // Test connection to the website
      const response = await fetch(this.baseUrl, {
        headers: this.scraper.getHeaders()
      })
      return response.ok
    } catch (error) {
      console.error('${name} website connection error:', error)
      return false
    }
  }

  /**
   * Fetch all relevant data from ${name} for personality analysis
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate, includeReplies = true } = options

    const allContent: RawContent[] = []

    try {
      // 1. Scrape user profile
      const username = (options as any).username
      if (username) {
        const profile = await this.scrapeProfile(username)
        if (profile) {
          allContent.push(this.profileToRawContent(profile))
        }
      }

      // 2. Scrape posts
      const posts = await this.scrapePosts(username, { limit, startDate, endDate })
      allContent.push(...posts.map(p => this.postToRawContent(p)))

      // 3. Scrape comments if requested
      if (includeReplies) {
        const comments = await this.scrapeComments(username, { limit })
        allContent.push(...comments.map(c => this.commentToRawContent(c)))
      }

      return allContent
    } catch (error) {
      throw new Error(\`Failed to scrape ${name}: \${(error as Error).message}\`)
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
   * Scrape user profile
   */
  async scrapeProfile(username: string): Promise<${className}ScrapedProfile | null> {
    try {
      const url = \`\\\${this.baseUrl}/\\\${username}\`
      const html = await this.scraper.fetch(url)

      return this.scraper.parseProfile(html, this.selectors.profile)
    } catch {
      return null
    }
  }

  /**
   * Scrape user posts
   */
  async scrapePosts(
    username: string,
    options: { limit?: number; startDate?: Date; endDate?: Date }
  ): Promise<${className}ScrapedPost[]> {
    const { limit = 100 } = options
    const posts: ${className}ScrapedPost[] = []

    let page = 1
    while (posts.length < limit && page <= this.config.maxPages) {
      try {
        const url = \`\\\${this.baseUrl}/\\\${username}?page=\\\${page}\`
        const html = await this.scraper.fetch(url)

        const pagePosts = this.scraper.parsePosts(html, this.selectors.posts)

        if (pagePosts.length === 0) break

        posts.push(...pagePosts)
        page++

        // Rate limiting - be respectful
        await this.delay(this.config.requestDelay)
      } catch {
        break
      }
    }

    return posts.slice(0, limit)
  }

  /**
   * Scrape user comments
   */
  async scrapeComments(
    username: string,
    options: { limit?: number }
  ): Promise<any[]> {
    // Implementation depends on the site structure
    return []
  }

  /**
   * Convert profile to raw content
   */
  private profileToRawContent(profile: ${className}ScrapedProfile): RawContent {
    const textParts = [
      profile.name,
      profile.bio,
      profile.location
    ].filter(Boolean).join(' ')

    return {
      id: \`profile_\\\${profile.username}\`,
      type: 'profile',
      text: textParts,
      created_at: new Date().toISOString(),
      author: {
        id: profile.username,
        username: profile.username,
        name: profile.name
      },
      metadata: {
        profile: {
          bio: profile.bio,
          location: profile.location,
          website: profile.website
        }
      }
    }
  }

  /**
   * Convert post to raw content
   */
  private postToRawContent(post: ${className}ScrapedPost): RawContent {
    return {
      id: post.id,
      type: 'post',
      text: post.content,
      created_at: post.date,
      author: {
        id: post.author.username,
        username: post.author.username,
        name: post.author.name
      },
      metrics: post.metrics,
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
      text: comment.content,
      created_at: comment.date,
      author: {
        id: comment.author.username,
        username: comment.author.username,
        name: comment.author.name
      },
      metrics: comment.metrics
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create a ${name} scraper adapter instance
 */
export function create${className}Adapter(
  config?: Partial<${className}Config>
): ${className}Adapter {
  return new ${className}Adapter(config)
}
`
}

function generateScrapeTypes(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Web Scraper Types
 */

export interface ${className}ScrapedProfile {
  username: string
  name?: string
  bio?: string
  avatar?: string
  location?: string
  website?: string
  joinedDate?: string
  followers?: number
  following?: number
}

export interface ${className}ScrapedPost {
  id: string
  content: string
  author: {
    username: string
    name?: string
  }
  date: string
  url: string
  metrics?: {
    likes?: number
    shares?: number
    replies?: number
  }
  tags?: string[]
}

export interface ${className}ScrapeOptions {
  username: string
  limit?: number
  includeComments?: boolean
  delay?: number
}

export interface SelectorConfig {
  profile: {
    name: string
    bio: string
    avatar: string
    location: string
    website: string
    stats: string
  }
  posts: string
  postContent: string
  postAuthor: string
  postDate: string
  postMetrics: {
    likes?: string
    shares?: string
    replies?: string
  }
}
`
}

function generateScraper(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Web Scraper
 *
 * Handles HTML fetching and parsing with anti-detection measures
 */

import type { ${className}Config } from './config'
import type { SelectorConfig, ${className}ScrapedProfile, ${className}ScrapedPost } from './types'

export class WebScraper {
  private config: ${className}Config
  private userAgent: string

  constructor(config: ${className}Config) {
    this.config = config
    this.userAgent = this.getUserAgent()
  }

  /**
   * Fetch HTML from a URL
   */
  async fetch(url: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(\`HTTP \\\${response.status}: \\\${response.statusText}\`)
      }

      return await response.text()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Get request headers with anti-detection measures
   */
  getHeaders(): Record<string, string> {
    return {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  }

  /**
   * Parse profile from HTML
   */
  parseProfile(html: string, selectors: SelectorConfig['profile']): ${className}ScrapedProfile | null {
    // Simple HTML parsing using regex
    // In production, use a proper HTML parser like cheerio

    const extractText = (selector: string): string | undefined => {
      // Placeholder for selector-based extraction
      return undefined
    }

    return {
      username: extractText(selectors.name) || '',
      name: extractText(selectors.name),
      bio: extractText(selectors.bio),
      avatar: extractText(selectors.avatar),
      location: extractText(selectors.location),
      website: extractText(selectors.website)
    }
  }

  /**
   * Parse posts from HTML
   */
  parsePosts(html: string, selectors: SelectorConfig['posts']): ${className}ScrapedPost[] {
    // Placeholder for post parsing
    // Implement based on actual HTML structure
    return []
  }

  /**
   * Get a rotating user agent
   */
  private getUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]

    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }

  /**
   * Clean extracted text
   */
  cleanText(text: string): string {
    return text
      .replace(/\\s+/g, ' ')
      .replace(/\\n+/g, ' ')
      .trim()
  }
}
`
}

function generateSelectors(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} CSS Selectors
 *
 * Define the CSS selectors for scraping content
 */

import type { SelectorConfig } from './types'

export class Selectors {
  profile: SelectorConfig['profile'] = {
    name: 'TODO: Add CSS selector for profile name',
    bio: 'TODO: Add CSS selector for profile bio',
    avatar: 'TODO: Add CSS selector for profile avatar',
    location: 'TODO: Add CSS selector for profile location',
    website: 'TODO: Add CSS selector for profile website',
    stats: 'TODO: Add CSS selector for profile stats'
  }

  posts: string = 'TODO: Add CSS selector for posts container'

  postContent: string = 'TODO: Add CSS selector for post content'
  postAuthor: string = 'TODO: Add CSS selector for post author'
  postDate: string = 'TODO: Add CSS selector for post date'

  postMetrics: {
    likes?: string
    shares?: string
    replies?: string
  } = {
    likes: 'TODO: Add CSS selector for likes',
    shares: 'TODO: Add CSS selector for shares',
    replies: 'TODO: Add CSS selector for replies'
  }
}

export default Selectors
`
}

function generateScrapeConfig(name: string): string {
  return `/**
 * ${toPascalCase(name)} Scraper Configuration
 */

export interface ${toPascalCase(name)}ConfigOptions {
  timeout?: number
  requestDelay?: number
  maxRetries?: number
  maxPages?: number
  respectRobotsTxt?: boolean
}

export class ${toPascalCase(name)}Config {
  public timeout: number
  public requestDelay: number
  public maxRetries: number
  public maxPages: number
  public respectRobotsTxt: boolean

  constructor(options: ${toPascalCase(name)}ConfigOptions = {}) {
    this.timeout = options.timeout ?? 30000
    this.requestDelay = options.requestDelay ?? 1000
    this.maxRetries = options.maxRetries ?? 3
    this.maxPages = options.maxPages ?? 10
    this.respectRobotsTxt = options.respectRobotsTxt ?? true
  }
}
`
}

function generateScrapePackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} web scraper adapter for Idiomark Protocol`,
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
      'cheerio': '^1.0.0-rc.12'
    },
    idiomark: {
      type: options.template,
      auth: 'none',
      baseUrl: options.baseUrl,
      docs: options.docs,
      status: 'experimental'
    }
  }, null, 2)
}

function generateScrapeTsConfig(): string {
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

function generateScrapeTsupConfig(): string {
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

function generateScrapeReadme(name: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name} (Web Scraper)

${options.description || `${name} web scraper adapter for Idiomark Protocol`}

## Features

- Scrapes user profiles and posts from ${name}
- Anti-detection measures with rotating user agents
- Respectful rate limiting
- HTML parsing with CSS selectors

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(name)}Adapter } from '@idiomark/adapter-${name}'

const adapter = create${toPascalCaseName()}Adapter({
  requestDelay: 1000,
  maxPages: 10
})

const content = await adapter.fetchData({
  limit: 100,
  username: 'username'
})
\`\`\`

## Configuration

\`\`\`typescript
const adapter = create${toPascalCaseName()}Adapter({
  timeout: 30000,
  requestDelay: 1000,
  maxRetries: 3,
  maxPages: 10,
  respectRobotsTxt: true
})
\`\`\`

## Custom Selectors

To scrape content, you need to update the CSS selectors in \`src/selectors.ts\`:

\`\`\`typescript
export class Selectors {
  profile = {
    name: '.profile-name',
    bio: '.profile-bio',
    // ... more selectors
  }

  posts: '.post-container'
  // ... more selectors
}
\`\`\`

## Important Notes

- Respect the website's \`robots.txt\` and terms of service
- Use appropriate rate limiting to avoid overloading servers
- Consider using official APIs when available
- Be aware that website structure changes may break scrapers

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
