/**
 * Idiomark SDK
 *
 * Main SDK class providing unified access to storage, sync, and inference
 * Matches iOS/Android SDK functionality
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  IdiomarkConfig,
  SDKState,
  GenerateOptions,
  GenerateResponse,
  SaveResult,
  ListOptions,
  ListResult,
  FileChangeCallback,
  SyncCompleteCallback,
  ErrorCallback,
  StateChangeCallback,
  Personality
} from './types'
import { resolveConfig, validateConfig } from './config'
import { Storage, type StorageConfig } from './storage'
import { Sync, type SyncConfig } from './sync'
import { Inference, type InferenceConfig } from './inference'
import { IdiomarkError, IdiomarkErrorCode } from './types'

/**
 * Idiomark SDK - Main entry point for Idiomark functionality
 *
 * Provides access to:
 * - Storage: Read/write Idiomark files
 * - Sync: Real-time WebSocket synchronization
 * - Inference: Generate personality-powered responses
 *
 * @example
 * ```ts
 * import { IdiomarkSDK } from '@idiomark/sdk'
 *
 * const sdk = new IdiomarkSDK({ apiKey: 'your-key' })
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
 * ```
 */
export class IdiomarkSDK {
  private config: Required<IdiomarkConfig>
  private storage: Storage | null = null
  private sync: Sync | null = null
  private inference: Inference | null = null

  // State management
  private state: SDKState = {
    connected: false,
    reconnecting: false,
    pendingEvents: 0,
    ready: false
  }

  // Callbacks
  private stateListeners: Set<StateChangeCallback> = new Set()
  private fileChangeListener: FileChangeCallback | null = null
  private syncCompleteListener: SyncCompleteCallback | null = null
  private errorCallback: ErrorCallback | null = null

  // Unsubscribe functions for sync
  private syncUnsubscribers: Array<() => void> = []

  /**
   * Create a new Idiomark SDK instance
   */
  constructor(config: IdiomarkConfig = {}) {
    this.config = resolveConfig(config)

    const validation = validateConfig(this.config)
    if (!validation.valid) {
      throw new Error(`Invalid SDK configuration:\n${validation.errors.join('\n')}`)
    }

    this.debug(`SDK created with baseURL: ${this.config.baseURL}`)
  }

  /**
   * Initialize the SDK
   *
   * Sets up storage, sync, and inference managers.
   * Should be called before using other SDK methods.
   */
  async initialize(): Promise<void> {
    this.debug('Initializing SDK...')

    // Initialize storage
    this.storage = new Storage(this.toStorageConfig())

    // Initialize sync (if enabled)
    if (this.config.enableSync) {
      this.sync = new Sync(this.toSyncConfig())

      // Set up sync state listener
      this.syncUnsubscribers.push(
        this.sync.onStateChange((syncState) => {
          this.updateState({
            connected: syncState.connected,
            reconnecting: syncState.reconnecting,
            pendingEvents: syncState.pendingEvents
          })
        })
      )

      // Set up sync event listeners
      this.syncUnsubscribers.push(
        this.sync.on('file_created', (event) => {
          this.fileChangeListener?.(event.file!)
        })
      )

      this.syncUnsubscribers.push(
        this.sync.on('file_updated', (event) => {
          this.fileChangeListener?.(event.file!)
        })
      )

      this.syncUnsubscribers.push(
        this.sync.on('sync_complete', (event) => {
          this.syncCompleteListener?.({
            success: true,
            fileCount: event.data?.fileCount as number || 0,
            duration: event.data?.duration as number
          })
        })
      )

      this.syncUnsubscribers.push(
        this.sync.on('error', (event) => {
          this.errorCallback?.(event.error!)
        })
      )
    }

    // Initialize inference
    this.inference = new Inference(this.toInferenceConfig())

    this.updateState({ ready: true })
    this.debug('SDK initialized')
  }

  // ========================================================================
  // Storage Methods
  // ========================================================================

  /**
   * Load a Idiomark file by ID
   */
  async load(id: string): Promise<IdiomarkFile> {
    this.ensureReady()
    this.debug(`Loading file: ${id}`)

    try {
      return await this.storage!.read(id)
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Save a Idiomark file
   */
  async save(file: IdiomarkFile): Promise<SaveResult> {
    this.ensureReady()
    this.debug(`Saving file: ${file.id}`)

    try {
      // Validate before saving
      const validation = await this.storage!.validate(file)
      if (!validation.valid) {
        throw new IdiomarkError(
          IdiomarkErrorCode.INVALID_RESPONSE,
          `Invalid Idiomark file:\n${validation.errors.join('\n')}`
        )
      }

      const result = await this.storage!.save(file)

      // Trigger sync
      this.sync?.sync(file)

      return result
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Delete a Idiomark file
   */
  async delete(id: string): Promise<void> {
    this.ensureReady()
    this.debug(`Deleting file: ${id}`)

    try {
      await this.storage!.delete(id)
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * List Idiomark files
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    this.ensureReady()
    this.debug('Listing files')

    try {
      return await this.storage!.list(options)
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  // ========================================================================
  // Inference Methods
  // ========================================================================

  /**
   * Generate a response with personality
   */
  async respond(options: GenerateOptions): Promise<GenerateResponse> {
    this.ensureReady()

    const { message, personalityId, personality } = options

    this.debug(`Generating response for: ${message.substring(0, 50)}...`)

    try {
      // Load personality if not provided
      let targetPersonality = personality

      if (!targetPersonality && personalityId) {
        const file = await this.load(personalityId)
        targetPersonality = file.personality
      }

      if (!targetPersonality) {
        throw new IdiomarkError(
          IdiomarkErrorCode.INFERENCE_NOT_AVAILABLE,
          'No personality available for inference'
        )
      }

      // Set active personality
      this.updateState({ activePersonalityId: personalityId })

      return await this.inference!.respond({
        ...options,
        personality: targetPersonality
      })
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Set active personality for responses
   */
  setPersonality(personality: Personality): void {
    this.inference?.setPersonality(personality)
    this.debug('Active personality set')
  }

  /**
   * Clear active personality
   */
  clearPersonality(): void {
    this.inference?.clearPersonality()
    this.updateState({ activePersonalityId: undefined })
    this.debug('Active personality cleared')
  }

  // ========================================================================
  // Sync Methods
  // ========================================================================

  /**
   * Start synchronization
   */
  async startSync(): Promise<void> {
    this.ensureReady()

    if (!this.sync) {
      throw new IdiomarkError(
        IdiomarkErrorCode.SYNC_NOT_AVAILABLE,
        'Sync is not enabled'
      )
    }

    this.debug('Starting sync')

    try {
      await this.sync.connect()
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Stop synchronization
   */
  async stopSync(): Promise<void> {
    this.ensureReady()

    if (!this.sync) {
      return
    }

    this.debug('Stopping sync')

    try {
      await this.sync.disconnect()
    } catch (error) {
      this.handleError(error as Error)
      throw error
    }
  }

  /**
   * Subscribe to file updates
   */
  subscribe(fileId: string): void {
    this.ensureReady()
    this.sync?.subscribe(fileId)
  }

  /**
   * Unsubscribe from file updates
   */
  unsubscribe(fileId: string): void {
    this.ensureReady()
    this.sync?.unsubscribe(fileId)
  }

  // ========================================================================
  // State & Callbacks
  // ========================================================================

  /**
   * Get current SDK state
   */
  getState(): SDKState {
    return { ...this.state }
  }

  /**
   * Check if SDK is ready
   */
  isReady(): boolean {
    return this.state.ready
  }

  /**
   * Check if connected to sync server
   */
  isConnected(): boolean {
    return this.state.connected
  }

  /**
   * Listen to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.add(callback)
    callback(this.getState())

    return () => {
      this.stateListeners.delete(callback)
    }
  }

  /**
   * Set file change callback
   */
  set onFileChanged(callback: FileChangeCallback | null) {
    this.fileChangeListener = callback
  }

  /**
   * Set sync complete callback
   */
  set onSyncComplete(callback: SyncCompleteCallback | null) {
    this.syncCompleteListener = callback
  }

  /**
   * Set error callback
   */
  set onError(callback: ErrorCallback | null) {
    this.errorCallback = callback
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  /**
   * Dispose of SDK resources
   *
   * Disconnects sync, clears listeners, and cleans up resources.
   * Call this when done using the SDK.
   */
  async dispose(): Promise<void> {
    this.debug('Disposing SDK')

    // Unsubscribe from sync events
    for (const unsubscribe of this.syncUnsubscribers) {
      unsubscribe()
    }
    this.syncUnsubscribers = []

    // Disconnect sync
    await this.sync?.disconnect()

    // Clear listeners
    this.stateListeners.clear()
    this.fileChangeListener = null
    this.syncCompleteListener = null
    this.errorCallback = null

    // Update state
    this.updateState({
      ready: false,
      connected: false,
      reconnecting: false,
      pendingEvents: 0,
      activePersonalityId: undefined
    })

    this.debug('SDK disposed')
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  private ensureReady(): void {
    if (!this.state.ready) {
      throw new IdiomarkError(
        IdiomarkErrorCode.INVALID_CONFIG,
        'SDK not initialized. Call initialize() first.'
      )
    }
  }

  private toStorageConfig(): StorageConfig {
    return {
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      enableCache: this.config.enableCache,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      debug: this.config.debug
    }
  }

  private toSyncConfig(): SyncConfig {
    return {
      serverURL: this.config.syncURL,
      token: this.config.apiKey,
      reconnect: this.config.enableReconnect,
      heartbeatInterval: this.config.heartbeatInterval,
      queueOfflineEvents: this.config.enableOfflineQueue,
      timeout: this.config.timeout,
      debug: this.config.debug
    }
  }

  private toInferenceConfig(): InferenceConfig {
    return {
      baseURL: this.config.inferenceURL,
      apiKey: this.config.apiKey,
      enableCache: this.config.enableCache,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      debug: this.config.debug
    }
  }

  private updateState(updates: Partial<SDKState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyStateListeners()
  }

  private notifyStateListeners(): void {
    for (const listener of this.stateListeners) {
      try {
        listener(this.getState())
      } catch (error) {
        this.debug(`State listener error: ${error}`)
      }
    }
  }

  private handleError(error: Error): void {
    this.debug(`Error: ${error.message}`)
    this.errorCallback?.(error)
  }

  private debug(message: string): void {
    if (this.config.debug) {
      console.log(`[Idiomark SDK] ${message}`)
    }
  }
}
