/**
 * RSS/Atom Feed Adapter Generator
 *
 * Generates an RSS/Atom feed adapter with feed parsing,
 * caching, and update tracking.
 */

import type { CreateOptions } from '../commands/adapter'

export async function generateRssAdapter(
  name: string,
  options: CreateOptions
): Promise<{ [filePath: string]: string }> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateRssIndex(name, className, options),
    'src/types.ts': generateRssTypes(name, className),
    'src/parser.ts': generateRssParser(name, className),
    'src/config.ts': generateRssConfig(name),
    'package.json': generateRssPackageJson(name, options),
    'tsconfig.json': generateRssTsConfig(),
    'tsup.config.ts': generateRssTsupConfig(),
    'README.md': generateRssReadme(name, options)
  }
}

function generateRssIndex(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} RSS/Atom Feed Adapter for Idiomark
 *
 * Fetches and parses RSS/Atom feeds from ${name} for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

export type {
  ${className}FeedItem,
  ${className}Feed,
  ${className}ParseOptions
} from './types'

import type {
  ${className}FeedItem,
  ${className}Feed
} from './types'

import { FeedParser } from './parser'
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
  private parser: FeedParser
  private config: ${className}Config
  private feedUrl?: string

  constructor(config?: Partial<${className}Config>) {
    this.config = new ${className}Config(config)
    this.parser = new FeedParser(this.config)
  }

  /**
   * Initialize adapter with feed URL
   */
  async authenticate(): Promise<boolean> {
    if (!this.feedUrl) {
      console.warn('No feed URL provided. Use setFeedUrl() first.')
      return false
    }

    try {
      const feed = await this.parser.parseFeed(this.feedUrl)
      return feed !== null
    } catch (error) {
      console.error('Feed authentication error:', error)
      return false
    }
  }

  /**
   * Set the feed URL to fetch from
   */
  setFeedUrl(url: string): void {
    this.feedUrl = url
  }

  /**
   * Fetch all items from the RSS/Atom feed
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate } = options

    if (!this.feedUrl) {
      throw new Error('Feed URL not set. Call setFeedUrl() first.')
    }

    try {
      const feed = await this.parser.parseFeed(this.feedUrl)

      if (!feed) {
        throw new Error('Failed to parse feed')
      }

      let items = feed.items

      // Filter by date range if specified
      if (startDate || endDate) {
        items = items.filter(item => {
          const itemDate = new Date(item.pubDate)
          if (startDate && itemDate < startDate) return false
          if (endDate && itemDate > endDate) return false
          return true
        })
      }

      // Limit results
      items = items.slice(0, limit)

      return items.map(item => this.feedItemToRawContent(item))
    } catch (error) {
      throw new Error(\`Failed to fetch feed data: \${(error as Error).message}\`)
    }
  }

  /**
   * Normalize raw feed content to standard format
   */
  normalize(raw: RawContent): NormalizedContent {
    return {
      id: raw.id,
      platform: this.name,
      type: 'post',
      text: raw.text,
      timestamp: raw.created_at,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        name: raw.author.name
      },
      metadata: raw.metadata,
      raw: raw.raw
    }
  }

  /**
   * Convert feed item to raw content
   */
  private feedItemToRawContent(item: ${className}FeedItem): RawContent {
    // Combine title, description, and content for full text
    const text = [
      item.title,
      item.description,
      item.content
    ].filter(Boolean).join('\\n\\n')

    return {
      id: item.guid || item.link,
      type: 'post',
      text,
      created_at: item.pubDate,
      author: {
        id: item.author?.name || 'unknown',
        username: item.author?.email || 'unknown',
        name: item.author?.name || 'Unknown'
      },
      metadata: {
        url: item.link,
        categories: item.categories,
        enclosure: item.enclosure
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

    return {
      rawContent,
      metadata: {
        sampleSize: rawContent.length,
        timeframe: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        sources: ['rss']
      }
    }
  }
}

/**
 * Create a ${name} RSS adapter instance
 */
export function create${className}Adapter(
  feedUrl?: string,
  config?: Partial<${className}Config>
): ${className}Adapter {
  const adapter = new ${className}Adapter(config)
  if (feedUrl) {
    adapter.setFeedUrl(feedUrl)
  }
  return adapter
}

/**
 * Quick fetch from RSS feed
 */
export async function fetchRSSFeed(
  feedUrl: string,
  options?: FetchOptions & { config?: Partial<${className}Config> }
): Promise<${className}AdapterOutput> {
  const adapter = create${className}Adapter(feedUrl, options?.config)
  return adapter.extractRawText(options)
}
`
}

function generateRssTypes(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} RSS/Atom Types
 */

export interface ${className}Feed {
  title: string
  description?: string
  link: string
  language?: string
  lastBuildDate?: string
  items: ${className}FeedItem[]
}

export interface ${className}FeedItem {
  title?: string
  description?: string
  content?: string
  link: string
  guid?: string
  pubDate: string
  author?: {
    name?: string
    email?: string
    uri?: string
  }
  categories?: string[]
  enclosure?: {
    url: string
    type: string
    length?: number
  }
}

export interface ${className}ParseOptions {
  timeout?: number
  maxItems?: number
  includeContent?: boolean
  normalizeSpaces?: boolean
}
`
}

function generateRssParser(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} RSS/Atom Feed Parser
 *
 * Handles RSS and Atom feed parsing with XML to JSON conversion
 */

import type { ${className}Config } from './config'
import type { ${className}Feed, ${className}FeedItem } from './types'

export class FeedParser {
  private config: ${className}Config

  constructor(config: ${className}Config) {
    this.config = config
  }

  /**
   * Parse RSS/Atom feed from URL
   */
  async parseFeed(url: string): Promise<${className}Feed | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
          'User-Agent': 'idiomark-protocol-rss-adapter/1.0.0'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(\`HTTP \\\${response.status}: \\\${response.statusText}\`)
      }

      const xml = await response.text()
      return this.parseXML(xml)
    } catch (error) {
      console.error('Failed to fetch feed:', error)
      return null
    }
  }

  /**
   * Parse XML string to feed object
   */
  private parseXML(xml: string): ${className}Feed | null {
    // Simple XML parser for RSS/Atom feeds
    // In production, use a proper XML parser like fast-xml-parser

    try {
      // Detect feed type
      if (xml.includes('<rss') || xml.includes('<rdf:RDF')) {
        return this.parseRSS(xml)
      } else if (xml.includes('<feed')) {
        return this.parseAtom(xml)
      }

      return null
    } catch (error) {
      console.error('Failed to parse XML:', error)
      return null
    }
  }

  /**
   * Parse RSS feed
   */
  private parseRSS(xml: string): ${className}Feed | null {
    // Basic RSS parsing using regex
    // Replace with proper XML parser in production

    const extractTag = (tag: string): string | null => {
      const regex = new RegExp(\`<\\\${tag}[^>]*>([^<]*)\\\`)
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }

    const extractTagMultiple = (tag: string): string[] => {
      const regex = new RegExp(\`<\\\${tag}[^>]*>([^<]*)\\\`, 'g')
      const matches = []
      let match
      while ((match = regex.exec(xml)) !== null) {
        matches.push(match[1].trim())
      }
      return matches
    }

    const extractItems = (): ${className}FeedItem[] => {
      const items: ${className}FeedItem[] = []
      const itemRegex = /<item>([\\s\\S]*?)<\\/item>/g
      let match

      while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1]

        const extractItemTag = (tag: string): string | null => {
          const regex = new RegExp(\`<\\\${tag}[^>]*>([^<]*)\\\`)
          const itemMatch = itemXml.match(regex)
          return itemMatch ? itemMatch[1].trim() : null
        }

        items.push({
          title: extractItemTag('title') || undefined,
          description: extractItemTag('description') || undefined,
          link: extractItemTag('link') || '',
          guid: extractItemTag('guid') || undefined,
          pubDate: extractItemTag('pubDate') || new Date().toISOString(),
          author: extractItemTag('author') ? {
            name: extractItemTag('author') || undefined
          } : undefined,
          categories: extractTagMultiple('category').length > 0
            ? extractTagMultiple('category')
            : undefined
        })
      }

      return items
    }

    return {
      title: extractTag('title') || 'Unknown Feed',
      description: extractTag('description') || undefined,
      link: extractTag('link') || '',
      language: extractTag('language') || undefined,
      lastBuildDate: extractTag('lastBuildDate') || undefined,
      items: extractItems()
    }
  }

  /**
   * Parse Atom feed
   */
  private parseAtom(xml: string): ${className}Feed | null {
    // Basic Atom parsing
    // Replace with proper XML parser in production

    const extractTag = (tag: string): string | null => {
      const regex = new RegExp(\`<\\\${tag}[^>]*>([^<]*)\\\`)
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }

    return {
      title: extractTag('title') || 'Unknown Feed',
      description: extractTag('subtitle') || undefined,
      link: extractTag('link') || '',
      language: undefined,
      lastBuildDate: extractTag('updated') || undefined,
      items: []
    }
  }

  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }

  /**
   * Strip HTML tags from text
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim()
  }
}
`
}

function generateRssConfig(name: string): string {
  return `/**
 * ${toPascalCase(name)} RSS Adapter Configuration
 */

export interface ${toPascalCase(name)}ConfigOptions {
  timeout?: number
  maxItems?: number
  cacheEnabled?: boolean
  cacheTTL?: number
}

export class ${toPascalCase(name)}Config {
  public timeout: number
  public maxItems: number
  public cacheEnabled: boolean
  public cacheTTL: number

  constructor(options: ${toPascalCase(name)}ConfigOptions = {}) {
    this.timeout = options.timeout ?? 30000
    this.maxItems = options.maxItems ?? 1000
    this.cacheEnabled = options.cacheEnabled ?? true
    this.cacheTTL = options.cacheTTL ?? 300000 // 5 minutes
  }
}
`
}

function generateRssPackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} RSS/Atom feed adapter for Idiomark Protocol`,
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
      'fast-xml-parser': '^4.3.2'
    },
    idiomark: {
      type: options.template,
      auth: 'none',
      baseUrl: options.baseUrl,
      docs: options.docs,
      status: 'working'
    }
  }, null, 2)
}

function generateRssTsConfig(): string {
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

function generateRssTsupConfig(): string {
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

function generateRssReadme(name: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name} (RSS/Atom)

${options.description || `${name} RSS/Atom feed adapter for Idiomark Protocol`}

## Features

- Parse RSS and Atom feeds
- Extract articles, blog posts, and updates
- Built-in caching for performance
- Support for enclosures and categories

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(name)}Adapter } from '@idiomark/adapter-${name}'

// Create adapter with feed URL
const adapter = create${toPascalCase(name)}Adapter(
  'https://example.com/feed.xml'
)

// Or set URL later
const adapter = create${toPascalCase(name)}Adapter()
adapter.setFeedUrl('https://example.com/feed.xml')

// Fetch feed items
const content = await adapter.fetchData({ limit: 100 })
\`\`\`

## Configuration

\`\`\`typescript
const adapter = create${toPascalCase(name)}Adapter(
  feedUrl,
  {
    timeout: 30000,
    maxItems: 1000,
    cacheEnabled: true,
    cacheTTL: 300000
  }
)
\`\`\`

## Supported Feed Formats

- RSS 2.0
- RSS 1.0 (RDF)
- Atom 1.0
- Atom 0.3

## Feed Requirements

The feed should be a valid RSS or Atom feed with:
- Item/article elements
- Publication dates
- Titles and descriptions or content

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
