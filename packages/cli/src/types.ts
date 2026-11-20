// CLI option types for each command

/**
 * Supported API providers
 */
export type APIProvider = 'anthropic' | 'openai' | 'openai-compatible'

/**
 * Idiomark CLI Configuration structure
 */
export interface IdiomarkConfig {
  apiKey: {
    anthropic?: string
    openai?: string
    'openai-compatible'?: string
  }
  defaults: {
    provider?: APIProvider
    model?: string
    output?: string
  }
}

/**
 * Config command options
 */
export interface ConfigOptions {
  list?: boolean
  set?: string[]
  get?: string
  delete?: string
  reset?: boolean
  path?: boolean
}

export interface ExtractOptions {
  twitter?: boolean
  github?: boolean
  reddit?: boolean
  output?: string
  sampleSize?: string
  verbose?: boolean
}

export interface ExtractDeveloperOptions {
  github?: boolean
  output?: string
  sampleSize?: number
  extensions?: string[]
  includeTests?: boolean
  verbose?: boolean
  token?: string
  username?: string
  repos?: string[]
}

export interface InitOptions {
  name?: string
  type?: 'human' | 'ai' | 'fictional'
  output?: string
}

export interface ValidateOptions {
  strict?: boolean
}

export interface ServeOptions {
  port?: string
  model?: string
}

export interface ChatOptions {
  file: string
  provider?: 'anthropic' | 'openai' | 'openai-compatible'
  model?: string
  verbose?: boolean
  stream?: boolean
}

export interface ApplyOptions {
  file: string
  mcpServer?: string
  mcpTransport?: 'stdio' | 'http'
  mcpPort?: number
  ucpMerchant?: string
  ucpBusinessName?: string
  httpPort?: number
  provider?: 'anthropic' | 'openai' | 'auto'
  llmModel?: string
}

export interface ProjectionApplyOptions {
  /** Path to Idiomark personality file */
  personality?: string
  /** Extract personality from this platform (twitter, github, reddit, etc.) */
  extractFrom?: string
  /** Projection target adapter (mcp, http, gaming, ucp, or custom type:name) */
  target?: string
  /** MCP adapter name */
  mcp?: string
  /** HTTP adapter name */
  http?: string
  /** Gaming adapter type (minecraft, roblox, vrchat, fortnite) */
  gaming?: string
  /** UCP adapter name */
  ucp?: string
  /** Transport type (stdio/http) for MCP/HTTP */
  transport?: 'stdio' | 'http'
  /** Port number for HTTP transport */
  port?: string
  /** Application mode: strict, balanced, subtle */
  mode?: 'strict' | 'balanced' | 'subtle'
  /** Enable streaming responses */
  stream?: boolean
  /** Interactive mode with prompts */
  interactive?: boolean
  /** Game server host (for gaming) */
  host?: string
  /** Game server port (for gaming) */
  'rcon-port'?: number
  /** RCON password (for gaming) */
  'rcon-password'?: string
  /** Merchant ID (for UCP) */
  'merchant-id'?: string
  /** Business name (for UCP) */
  'business-name'?: string
}
