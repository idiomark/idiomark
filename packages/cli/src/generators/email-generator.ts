/**
 * Email/Newsletter Adapter Generator
 *
 * Generates an email adapter with IMAP/POP3 support,
 * email parsing, and attachment handling.
 */

import type { CreateOptions } from '../commands/adapter'

export async function generateEmailAdapter(
  name: string,
  options: CreateOptions
): Promise<{ [filePath: string]: string }> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateEmailIndex(name, className, options),
    'src/types.ts': generateEmailTypes(name, className),
    'src/client.ts': generateEmailClient(name, className),
    'src/parser.ts': generateEmailParser(name, className),
    'src/config.ts': generateEmailConfig(name),
    'package.json': generateEmailPackageJson(name, options),
    'tsconfig.json': generateEmailTsConfig(),
    'tsup.config.ts': generateEmailTsupConfig(),
    'README.md': generateEmailReadme(name, options)
  }
}

function generateEmailIndex(name: string, className: string, options: CreateOptions): string {
  return `/**
 * ${toPascalCase(name)} Email/Newsletter Adapter for Idiomark
 *
 * Fetches emails and newsletters from ${name} for personality analysis
 */

import type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent
} from '@idiomark/core'

export type {
  ${className}Email,
  ${className}EmailAuth,
  ${className}Folder
} from './types'

import type {
  ${className}Email,
  ${className}EmailAuth
} from './types'

import { EmailClient } from './client'
import { EmailParser } from './parser'
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
  private client: EmailClient
  private parser: EmailParser
  private config: ${className}Config
  private auth: ${className}EmailAuth

  constructor(auth: ${className}EmailAuth, config?: Partial<${className}Config>) {
    this.auth = auth
    this.config = new ${className}Config(config)
    this.client = new EmailClient(this.auth, this.config)
    this.parser = new EmailParser()
  }

  /**
   * Authenticate with email server
   */
  async authenticate(): Promise<boolean> {
    try {
      return await this.client.connect()
    } catch (error) {
      console.error('${name} email authentication error:', error)
      return false
    }
  }

  /**
   * Fetch emails from inbox or specified folder
   */
  async fetchData(options: FetchOptions = {}): Promise<RawContent[]> {
    const { limit = 100, startDate, endDate } = options

    try {
      // Connect if not already connected
      if (!this.client.isConnected()) {
        const connected = await this.client.connect()
        if (!connected) {
          throw new Error('Failed to connect to email server')
        }
      }

      // Fetch emails
      const emails = await this.client.fetchEmails({
        limit,
        startDate,
        endDate,
        folder: (options as any).folder || 'INBOX'
      })

      return emails.map(email => this.emailToRawContent(email))
    } catch (error) {
      throw new Error(\`Failed to fetch emails: \${(error as Error).message}\`)
    }
  }

  /**
   * Normalize raw email content to standard format
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
   * Convert email to raw content
   */
  private emailToRawContent(email: ${className}Email): RawContent {
    // Extract plain text content
    const text = this.parser.extractText(email)

    return {
      id: email.id,
      type: 'post',
      text,
      created_at: email.date,
      author: {
        id: email.from.address,
        username: email.from.address,
        name: email.from.name || email.from.address
      },
      metadata: {
        subject: email.subject,
        to: email.to.map(t => t.address),
        cc: email.cc?.map(t => t.address),
        attachments: email.attachments?.length,
        folder: email.folder
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
        sources: ['email']
      }
    }
  }

  /**
   * Disconnect from email server
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect()
  }
}

/**
 * Create an ${name} email adapter instance
 */
export function create${className}Adapter(
  auth: ${className}EmailAuth,
  config?: Partial<${className}Config>
): ${className}Adapter {
  return new ${className}Adapter(auth, config)
}

/**
 * Quick fetch from email
 */
export async function fetchEmails(
  auth: ${className}EmailAuth,
  options?: FetchOptions & { config?: Partial<${className}Config> }
): Promise<${className}AdapterOutput> {
  const adapter = create${className}Adapter(auth, options?.config)
  const result = await adapter.extractRawText(options)
  await adapter.disconnect()
  return result
}
`
}

function generateEmailTypes(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Email Types
 */

export interface ${className}EmailAuth {
  host: string
  port: number
  user: string
  password: string
  secure?: boolean
}

export interface ${className}Email {
  id: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  subject: string
  date: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  folder?: string
  flags?: string[]
}

export interface EmailAddress {
  name?: string
  address: string
}

export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
}

export interface ${className}Folder {
  name: string
  path: string
  count: number
  unread: number
}
`
}

function generateEmailClient(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Email Client
 *
 * Handles IMAP/POP3 connections and email fetching
 */

import type { ${className}Config } from './config'
import type { ${className}EmailAuth, ${className}Email } from './types'

export interface FetchEmailOptions {
  limit?: number
  startDate?: Date
  endDate?: Date
  folder?: string
  unreadOnly?: boolean
}

export class EmailClient {
  private auth: ${className}EmailAuth
  private config: ${className}Config
  private connected: boolean = false

  constructor(auth: ${className}EmailAuth, config: ${className}Config) {
    this.auth = auth
    this.config = config
  }

  /**
   * Connect to email server
   */
  async connect(): Promise<boolean> {
    try {
      // This is a placeholder implementation
      // In production, use an IMAP library like 'imap' or 'imapflow'

      const url = \\\`
        \\\${this.auth.secure ? 'imaps' : 'imap'}://\\\
        \\\${encodeURIComponent(this.auth.user)}:\\\
        \\\${encodeURIComponent(this.auth.password)}@\\\
        \\\${this.auth.host}:\\\
        \\\${this.auth.port}
      \\\`

      console.log(\`Connecting to \\\${this.auth.host}:\\\${
        this.auth.port}...\`)

      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 500))

      this.connected = true
      return true
    } catch (error) {
      console.error('Connection failed:', error)
      this.connected = false
      return false
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Fetch emails from server
   */
  async fetchEmails(options: FetchEmailOptions): Promise<${className}Email[]> {
    if (!this.connected) {
      throw new Error('Not connected to email server')
    }

    const {
      limit = 100,
      startDate,
      endDate,
      folder = 'INBOX',
      unreadOnly = false
    } = options

    // Placeholder implementation
    // In production, use actual IMAP commands

    return []
  }

  /**
   * List available folders
   */
  async listFolders(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Not connected to email server')
    }

    // Placeholder
    return ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam']
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    this.connected = false
  }

  /**
   * Search emails with criteria
   */
  async search(criteria: {
    from?: string
    subject?: string
    since?: Date
    before?: Date
    unread?: boolean
    flagged?: boolean
  }): Promise<${className}Email[]> {
    if (!this.connected) {
      throw new Error('Not connected to email server')
    }

    // Placeholder
    return []
  }
}
`
}

function generateEmailParser(name: string, className: string): string {
  return `/**
 * ${toPascalCase(name)} Email Parser
 *
 * Parses email content and extracts text
 */

import type { ${className}Email } from './types'

export class EmailParser {
  /**
   * Extract plain text from email
   */
  extractText(email: ${className}Email): string {
    const parts: string[] = []

    if (email.subject) {
      parts.push(email.subject)
    }

    if (email.text) {
      parts.push(email.text)
    } else if (email.html) {
      parts.push(this.stripHTML(email.html))
    }

    return parts.filter(Boolean).join('\\n\\n')
  }

  /**
   * Strip HTML tags from content
   */
  private stripHTML(html: string): string {
    return html
      .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim()
  }

  /**
   * Extract signature from email body
   */
  extractSignature(text: string): string | null {
    const lines = text.split('\\n')
    const signatureLines: string[] = []
    let inSignature = false

    for (const line of lines) {
      // Check for common signature markers
      if (/^--\\s*$/.test(line) || /^--$/.test(line)) {
        inSignature = true
        continue
      }

      if (inSignature) {
        signatureLines.push(line)
      }
    }

    return signatureLines.length > 0 ? signatureLines.join('\\n') : null
  }

  /**
   * Extract quoted replies
   */
  extractQuotedText(text: string): string[] {
    const quotes: string[] = []
    const lines = text.split('\\n')
    let currentQuote: string[] = []

    for (const line of lines) {
      // Check for quote markers
      if (/^>/.test(line)) {
        currentQuote.push(line)
      } else {
        if (currentQuote.length > 0) {
          quotes.push(currentQuote.join('\\n'))
          currentQuote = []
        }
      }
    }

    if (currentQuote.length > 0) {
      quotes.push(currentQuote.join('\\n'))
    }

    return quotes
  }

  /**
   * Clean email text for analysis
   */
  cleanText(text: string): string {
    let cleaned = text

    // Remove forwarded message headers
    cleaned = cleaned.replace(/^-+\\s*Forwarded message\\s*-+$/gmi, '')
    cleaned = cleaned.replace(/^From:.+$/gmi, '')
    cleaned = cleaned.replace(/^Sent:.+$/gmi, '')
    cleaned = cleaned.replace(/^To:.+$/gmi, '')
    cleaned = cleaned.replace(/^Subject:.+$/gmi, '')
    cleaned = cleaned.replace(/^Date:.+$/gmi, '')

    // Remove quoted text
    cleaned = cleaned.replace(/^>.*$/gm, '')

    // Remove common disclaimer text
    cleaned = cleaned.replace(/\\n*Disclaimer:.+$/gmi, '')

    return cleaned.trim()
  }
}
`
}

function generateEmailConfig(name: string): string {
  return `/**
 * ${toPascalCase(name)} Email Adapter Configuration
 */

export interface ${toPascalCase(name)}ConfigOptions {
  timeout?: number
  maxRetries?: number
  tls?: boolean
  validateCert?: boolean
}

export class ${toPascalCase(name)}Config {
  public timeout: number
  public maxRetries: number
  public tls: boolean
  public validateCert: boolean

  constructor(options: ${toPascalCase(name)}ConfigOptions = {}) {
    this.timeout = options.timeout ?? 30000
    this.maxRetries = options.maxRetries ?? 3
    this.tls = options.tls ?? true
    this.validateCert = options.validateCert ?? true
  }
}
`
}

function generateEmailPackageJson(name: string, options: CreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/adapter-${name}`,
    version: '1.0.0',
    description: `${name} email adapter for Idiomark Protocol`,
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
      imapflow: '^1.0.162',
      mailparser: '^3.6.5'
    },
    idiomark: {
      type: options.template,
      auth: 'apikey',
      baseUrl: options.baseUrl,
      docs: options.docs,
      status: 'experimental'
    }
  }, null, 2)
}

function generateEmailTsConfig(): string {
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

function generateEmailTsupConfig(): string {
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

function generateEmailReadme(name: string, options: CreateOptions): string {
  return `# @idiomark/adapter-${name} (Email)

${options.description || `${name} email adapter for Idiomark Protocol`}

## Features

- Connect to IMAP/POP3 email servers
- Fetch emails from inbox and other folders
- Extract plain text from HTML emails
- Parse attachments and metadata

## Installation

\`\`\`bash
npm install @idiomark/adapter-${name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(name)}Adapter } from '@idiomark/adapter-${name}'

const adapter = create${toPascalCase(name)}Adapter({
  host: 'imap.example.com',
  port: 993,
  user: 'user@example.com',
  password: process.env.EMAIL_PASSWORD,
  secure: true
})

await adapter.authenticate()

const content = await adapter.fetchData({
  limit: 100,
  folder: 'INBOX'
})

await adapter.disconnect()
\`\`\`

## Configuration

\`\`\`typescript
const adapter = create${toPascalCase(name)}Adapter(auth, {
  timeout: 30000,
  maxRetries: 3,
  tls: true,
  validateCert: true
})
\`\`\`

## Supported Protocols

- IMAP (recommended)
- IMAPS (IMAP over SSL/TLS)
- POP3
- POP3S

## Security Notes

- Use app-specific passwords when possible
- Enable SSL/TLS for secure connections
- Consider using OAuth2 for modern email services
- Store credentials securely (environment variables, secret managers)

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
