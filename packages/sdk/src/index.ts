/**
 * Idiomark Protocol SDK
 *
 * Developer-friendly SDK for integrating Idiomark into applications
 * Provides storage, sync, and inference functionality
 *
 * @example
 * ```ts
 * import { IdiomarkSDK } from '@idiomark/sdk'
 *
 * const sdk = new IdiomarkSDK({ apiKey: process.env.Idiomark_API_KEY })
 * await sdk.initialize()
 *
 * // Load a personality
 * const file = await sdk.load('personality-id')
 *
 * // Generate a response
 * const response = await sdk.respond({
 *   message: 'Hello!',
 *   personalityId: 'personality-id'
 * })
 *
 * // Cleanup when done
 * await sdk.dispose()
 * ```
 */

// Main SDK class
export { IdiomarkSDK } from './sdk'

// Configuration
export type { IdiomarkConfig } from './config'
export { resolveConfig, validateConfig, DEFAULT_CONFIG } from './config'

// Types
export type {
  // Storage types
  SaveResult,
  ReadOptions,
  ListOptions,
  ListResult,
  // Sync types
  SyncState,
  SyncResult,
  SyncEvent,
  SyncEventType,
  // Inference types
  GenerateOptions,
  GenerateResponse,
  InferenceModel,
  // SDK state
  SDKState,
  // Callbacks
  FileChangeCallback,
  SyncCompleteCallback,
  ErrorCallback,
  StateChangeCallback
} from './types'

// Errors
export { IdiomarkError, IdiomarkErrorCode } from './types'

// Managers (advanced usage)
export { Storage } from './storage'
export { Sync } from './sync'
export { Inference } from './inference'

// Type exports for managers
export type { StorageConfig } from './storage'
export type { SyncConfig } from './sync'
export type { InferenceConfig } from './inference'

// Prompt generation utilities
export { generatePrompt, generateSystemPrompt } from './prompt'

// Re-export core types for convenience
export type { IdiomarkFile } from '@idiomark/core'

// Export Personality from our types module
export type { Personality } from './types'

// Quick extraction helpers
export { extractPersonality, extractFromText, extractFromTexts } from './extract'
export { validateIdiomarkFile, isIdiomarkFile } from './validate'
export type { QuickExtractOptions, ValidationResult } from './types'

// Legacy exports (for backward compatibility)
// @deprecated Use IdiomarkSDK instead
export { IdiomarkClient } from './client'

// IdiomarkClientOptions for backward compatibility
export interface IdiomarkClientOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
}
