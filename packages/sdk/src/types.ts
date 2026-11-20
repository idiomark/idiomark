/**
 * Idiomark SDK Types
 *
 * Type definitions for the Idiomark SDK
 */

import type { IdiomarkFile } from '@idiomark/core'

// ============================================================================
// Personality Types (re-exported from @idiomark/core)
// ============================================================================

export interface Voice {
  tone: {
    primary: string
    secondary?: string
    confidence: number
  }
  formality: number
  humor: number
  sarcasm: number
  enthusiasm: number
  directness: number
  openness?: number
  conscientiousness?: number
  extraversion?: number
  agreeableness?: number
  neuroticism?: number
}

export interface Patterns {
  sentence_length: {
    mean: number
    stddev: number
  }
  paragraph_length?: {
    mean: number
    stddev: number
  }
  emoji_usage: {
    frequency: 'none' | 'low' | 'medium' | 'high'
    top_emojis: string[]
    position?: 'start' | 'end' | 'mixed'
  }
  punctuation: {
    exclamation_frequency: number
    question_frequency: number
    ellipsis_usage: 'none' | 'low' | 'medium' | 'high'
  }
  capitalization?: {
    all_caps_frequency: number
    random_caps: boolean
  }
  liwc_categories?: {
    first_person_singular: number
    first_person_plural: number
    third_person: number
    positive_emotion: number
    negative_emotion: number
    cognitive_process: number
    social_words: number
    work_words: number
    achievement_words: number
    articles: number
    long_words: number
  }
}

export interface Domain {
  name: string
  confidence: number
  evidence?: string[]
}

export interface Value {
  name: string
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface Knowledge {
  frequent_terms: string[]
  mentions: {
    people?: string[]
    projects?: string[]
    organizations?: string[]
  }
  topics: {
    primary: string[]
    secondary?: string[]
  }
}

export interface Personality {
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge
}

// ============================================================================
// Configuration
// ============================================================================

export type { IdiomarkConfig, DEFAULT_CONFIG } from './config'

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Result from file save operation
 */
export interface SaveResult {
  /** File ID */
  id: string
  /** Storage version */
  version: string
  /** ETag for cache validation */
  etag: string
  /** Timestamp of creation */
  createdAt: Date
  /** Timestamp of last update */
  updatedAt: Date
}

/**
 * Options for reading a file
 */
export interface ReadOptions {
  /** Use cached version if available */
  useCache?: boolean
  /** Specific version to retrieve */
  version?: string
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /** Filter by source platform */
  source?: string
  /** Filter by entity type */
  entityType?: 'human' | 'brand' | 'bot' | 'fictional'
  /** Maximum number of results */
  limit?: number
  /** Pagination cursor */
  cursor?: string
}

/**
 * Result from file list operation
 */
export interface ListResult {
  /** Array of Idiomark files */
  files: IdiomarkFile[]
  /** Next page cursor */
  nextCursor?: string
  /** Total count (if available) */
  total?: number
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Sync state
 */
export interface SyncState {
  /** Connected to sync server */
  connected: boolean
  /** Reconnecting to sync server */
  reconnecting: boolean
  /** Number of pending events to sync */
  pendingEvents: number
  /** Last successful sync timestamp */
  lastSyncAt?: Date
  /** Current connection ID */
  connectionId?: string
}

/**
 * Sync result from background operation
 */
export interface SyncResult {
  /** Success status */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Number of files synced */
  fileCount: number
  /** Sync duration in milliseconds */
  duration?: number
}

/**
 * Sync event types
 */
export type SyncEventType =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'file_created'
  | 'file_updated'
  | 'file_deleted'
  | 'error'
  | 'sync_complete'

/**
 * Sync event payload
 */
export interface SyncEvent {
  /** Event type */
  type: SyncEventType
  /** Event timestamp */
  timestamp: Date
  /** Associated file (if applicable) */
  file?: IdiomarkFile
  /** Error (if applicable) */
  error?: Error
  /** Additional data */
  data?: Record<string, unknown>
}

// ============================================================================
// Inference Types
// ============================================================================

/**
 * Options for generating a response
 */
export interface GenerateOptions {
  /** User message to respond to */
  message: string
  /** Personality ID to use */
  personalityId: string
  /** Personality file (overrides personalityId) */
  personality?: Personality
  /** Temperature (0.0 - 1.0) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Sampling strategy */
  sampling?: 'temperature' | 'top_k' | 'top_p'
  /** Include raw response data */
  includeRaw?: boolean
}

/**
 * Result from generate operation
 */
export interface GenerateResponse {
  /** Generated response text */
  response: string
  /** Tone used */
  tone: string
  /** Confidence score */
  confidence: number
  /** Model used for generation */
  model: string
  /** Number of tokens used */
  tokensUsed?: number
  /** Generation time in milliseconds */
  duration?: number
  /** Raw API response (if includeRaw=true) */
  raw?: unknown
}

/**
 * Inference model options
 */
export interface InferenceModel {
  /** Model identifier */
  id: string
  /** Model name */
  name: string
  /** Maximum context length */
  maxContext: number
  /** Supported features */
  features: string[]
}

// ============================================================================
// SDK State
// ============================================================================

/**
 * Overall SDK state
 */
export interface SDKState {
  /** Connected to sync server */
  connected: boolean
  /** Reconnecting to sync server */
  reconnecting: boolean
  /** Number of pending events to sync */
  pendingEvents: number
  /** Active personality ID */
  activePersonalityId?: string
  /** SDK ready status */
  ready: boolean
  /** Current error (if any) */
  error?: string
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Idiomark SDK error codes
 */
export enum IdiomarkErrorCode {
  /** File not found */
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  /** Sync not available */
  SYNC_NOT_AVAILABLE = 'SYNC_NOT_AVAILABLE',
  /** Storage not available */
  STORAGE_NOT_AVAILABLE = 'STORAGE_NOT_AVAILABLE',
  /** Inference not available */
  INFERENCE_NOT_AVAILABLE = 'INFERENCE_NOT_AVAILABLE',
  /** Invalid configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Authentication failed */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  /** Rate limited */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Invalid response */
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  /** Timeout */
  TIMEOUT = 'TIMEOUT',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Idiomark SDK error
 */
export class IdiomarkError extends Error {
  readonly code: IdiomarkErrorCode
  readonly statusCode?: number
  readonly retryable: boolean

  constructor(
    code: IdiomarkErrorCode,
    message: string,
    statusCode?: number,
    retryable = false
  ) {
    super(message)
    this.name = 'IdiomarkError'
    this.code = code
    this.statusCode = statusCode
    this.retryable = retryable
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(statusCode: number, message: string): IdiomarkError {
    const code = statusCodeToCode(statusCode)
    return new IdiomarkError(code, message, statusCode, isRetryable(statusCode))
  }

  /**
   * Create network error
   */
  static network(error: Error): IdiomarkError {
    return new IdiomarkError(IdiomarkErrorCode.NETWORK_ERROR, error.message, undefined, true)
  }

  /**
   * Create timeout error
   */
  static timeout(message = 'Request timed out'): IdiomarkError {
    return new IdiomarkError(IdiomarkErrorCode.TIMEOUT, message, undefined, true)
  }
}

function statusCodeToCode(statusCode: number): IdiomarkErrorCode {
  switch (statusCode) {
    case 401:
    case 403:
      return IdiomarkErrorCode.AUTHENTICATION_FAILED
    case 404:
      return IdiomarkErrorCode.FILE_NOT_FOUND
    case 429:
      return IdiomarkErrorCode.RATE_LIMITED
    case 500:
    case 502:
    case 503:
      return IdiomarkErrorCode.NETWORK_ERROR
    default:
      return IdiomarkErrorCode.UNKNOWN
  }
}

function isRetryable(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500
}

// ============================================================================
// Callbacks
// ============================================================================

/**
 * File change callback
 */
export type FileChangeCallback = (file: IdiomarkFile) => void

/**
 * Sync complete callback
 */
export type SyncCompleteCallback = (result: SyncResult) => void

/**
 * Error callback
 */
export type ErrorCallback = (error: Error) => void

/**
 * State change callback
 */
export type StateChangeCallback = (state: SDKState) => void

// ============================================================================
// Quick Extract Types
// ============================================================================

/**
 * Options for quick personality extraction
 */
export interface QuickExtractOptions {
  /** Text samples to analyze */
  texts: string[]
  /** Source name (default: 'text') */
  source?: string
  /** Timestamps for each text (optional) */
  timestamps?: string[]
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Result of Idiomark file validation
 */
export interface ValidationResult {
  /** Whether the file is valid */
  valid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
}
