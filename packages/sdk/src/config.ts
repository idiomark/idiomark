/**
 * Idiomark SDK Configuration
 *
 * Configuration options for the Idiomark SDK
 */

/**
 * SDK configuration options
 */
export interface IdiomarkConfig {
  /**
   * Storage API base URL
   * Default: https://api.idiomark.protocol/storage
   */
  baseURL?: string

  /**
   * Inference API base URL
   * Default: derived from baseURL + /inference
   */
  inferenceURL?: string

  /**
   * Sync WebSocket URL
   * Default: wss://api.idiomark.protocol/ws
   */
  syncURL?: string

  /**
   * API key for authentication
   * Can also be set via Idiomark_API_KEY environment variable
   */
  apiKey?: string

  /**
   * Local storage path for caching Idiomark files
   * Default: ./idiomark-cache
   */
  storagePath?: string

  /**
   * Enable automatic synchronization
   * Default: true
   */
  enableSync?: boolean

  /**
   * Enable client-side encryption
   * Default: true
   */
  enableEncryption?: boolean

  /**
   * Enable caching
   * Default: true
   */
  enableCache?: boolean

  /**
   * Sync interval in milliseconds
   * Default: 300000 (5 minutes)
   */
  syncInterval?: number

  /**
   * Heartbeat interval in milliseconds
   * Default: 60000 (1 minute)
   */
  heartbeatInterval?: number

  /**
   * Connection timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Maximum number of retries for network operations
   * Default: 3
   */
  maxRetries?: number

  /**
   * Enable automatic reconnection on connection loss
   * Default: true
   */
  enableReconnect?: boolean

  /**
   * Enable offline event queue
   * Default: true
   */
  enableOfflineQueue?: boolean

  /**
   * Enable debug logging
   * Default: false
   */
  debug?: boolean
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<IdiomarkConfig> = {
  baseURL: 'https://api.idiomark.protocol/storage',
  inferenceURL: 'https://api.idiomark.protocol/inference',
  syncURL: 'wss://api.idiomark.protocol/ws',
  apiKey: '',
  storagePath: './idiomark-cache',
  enableSync: true,
  enableEncryption: true,
  enableCache: true,
  syncInterval: 300000,
  heartbeatInterval: 60000,
  timeout: 30000,
  maxRetries: 3,
  enableReconnect: true,
  enableOfflineQueue: true,
  debug: false
} as const

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(config: IdiomarkConfig = {}): Required<IdiomarkConfig> {
  const apiKey = config.apiKey || process.env.Idiomark_API_KEY || ''

  return {
    baseURL: config.baseURL ?? DEFAULT_CONFIG.baseURL,
    inferenceURL: config.inferenceURL ?? DEFAULT_CONFIG.inferenceURL,
    syncURL: config.syncURL ?? DEFAULT_CONFIG.syncURL,
    apiKey,
    storagePath: config.storagePath ?? DEFAULT_CONFIG.storagePath,
    enableSync: config.enableSync ?? DEFAULT_CONFIG.enableSync,
    enableEncryption: config.enableEncryption ?? DEFAULT_CONFIG.enableEncryption,
    enableCache: config.enableCache ?? DEFAULT_CONFIG.enableCache,
    syncInterval: config.syncInterval ?? DEFAULT_CONFIG.syncInterval,
    heartbeatInterval: config.heartbeatInterval ?? DEFAULT_CONFIG.heartbeatInterval,
    timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
    maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    enableReconnect: config.enableReconnect ?? DEFAULT_CONFIG.enableReconnect,
    enableOfflineQueue: config.enableOfflineQueue ?? DEFAULT_CONFIG.enableOfflineQueue,
    debug: config.debug ?? DEFAULT_CONFIG.debug
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: Required<IdiomarkConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.baseURL || config.baseURL.trim().length === 0) {
    errors.push('baseURL is required')
  }

  try {
    new URL(config.baseURL)
  } catch {
    errors.push('baseURL is not a valid URL')
  }

  if (config.syncURL) {
    try {
      new URL(config.syncURL)
    } catch {
      errors.push('syncURL is not a valid URL')
    }
  }

  if (config.timeout < 0) {
    errors.push('timeout must be positive')
  }

  if (config.maxRetries < 0) {
    errors.push('maxRetries must be positive')
  }

  if (config.syncInterval < 1000) {
    errors.push('syncInterval must be at least 1000ms')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
