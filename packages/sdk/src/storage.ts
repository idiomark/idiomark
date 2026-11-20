/**
 * Idiomark Storage Manager
 *
 * Handles Idiomark file storage operations with API integration and caching
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  SaveResult,
  ReadOptions,
  ListOptions,
  ListResult
} from './types'
import { IdiomarkError, IdiomarkErrorCode } from './types'
// TypeScript's built-in Required type

/**
 * Storage manager configuration
 */
export interface StorageConfig {
  baseURL: string
  apiKey: string
  enableCache: boolean
  timeout: number
  maxRetries: number
  debug: boolean
}

/**
 * In-memory cache entry
 */
interface CacheEntry {
  file: IdiomarkFile
  etag: string
  timestamp: number
}

/**
 * Storage manager for Idiomark files
 */
export class Storage {
  private config: StorageConfig
  private cache: Map<string, CacheEntry> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(config: StorageConfig) {
    this.config = config
  }

  /**
   * Read a Idiomark file by ID
   */
  async read(id: string, options: ReadOptions = {}): Promise<IdiomarkFile> {
    const { useCache = true } = options

    // Check cache first
    if (useCache && this.config.enableCache) {
      const cached = this.cache.get(id)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.debug(`Cache hit for file: ${id}`)
        return cached.file
      }
    }

    // Fetch from API
    this.debug(`Fetching file: ${id}`)
    try {
      const response = await this.fetchWithRetry(`/files/${id}`)
      const file = await response.json() as IdiomarkFile

      // Update cache
      if (this.config.enableCache) {
        this.cache.set(id, {
          file,
          etag: response.headers.get('ETag') || '',
          timestamp: Date.now()
        })
      }

      return file
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Write (create) a Idiomark file
   */
  async create(file: IdiomarkFile): Promise<SaveResult> {
    this.debug(`Creating file: ${file.id}`)

    try {
      const response = await this.fetchWithRetry('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file)
      })

      const result = await response.json() as SaveResult

      // Update cache
      if (this.config.enableCache) {
        this.cache.set(file.id, {
          file,
          etag: result.etag,
          timestamp: Date.now()
        })
      }

      return result
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Update an existing Idiomark file
   */
  async update(file: IdiomarkFile): Promise<SaveResult> {
    this.debug(`Updating file: ${file.id}`)

    // Get cached ETag
    const cached = this.cache.get(file.id)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (cached?.etag) {
      headers['If-Match'] = cached.etag
    }

    try {
      const response = await this.fetchWithRetry(`/files/${file.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(file)
      })

      const result = await response.json() as SaveResult

      // Update cache
      if (this.config.enableCache) {
        this.cache.set(file.id, {
          file,
          etag: result.etag,
          timestamp: Date.now()
        })
      }

      return result
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Save a file (create or update)
   */
  async save(file: IdiomarkFile): Promise<SaveResult> {
    // Try update first, fall back to create
    try {
      return await this.update(file)
    } catch (error) {
      if (error instanceof IdiomarkError && error.code === IdiomarkErrorCode.FILE_NOT_FOUND) {
        return await this.create(file)
      }
      throw error
    }
  }

  /**
   * Delete a Idiomark file
   */
  async delete(id: string): Promise<void> {
    this.debug(`Deleting file: ${id}`)

    try {
      await this.fetchWithRetry(`/files/${id}`, {
        method: 'DELETE'
      })

      // Remove from cache
      this.cache.delete(id)
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * List Idiomark files with optional filters
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    const { source, entityType, limit = 50, cursor } = options

    const params = new URLSearchParams()
    if (source) params.set('source', source)
    if (entityType) params.set('entity_type', entityType)
    if (limit) params.set('limit', limit.toString())
    if (cursor) params.set('cursor', cursor)

    this.debug(`Listing files with params: ${params.toString()}`)

    try {
      const response = await this.fetchWithRetry(`/files?${params.toString()}`)
      const result = await response.json() as ListResult

      // Cache files
      if (this.config.enableCache) {
        for (const file of result.files) {
          this.cache.set(file.id, {
            file,
            etag: '',
            timestamp: Date.now()
          })
        }
      }

      return result
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Validate a Idiomark file
   */
  async validate(file: IdiomarkFile): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Basic structure validation
    if (!file.idiomark) errors.push('Missing Idiomark version')
    if (!file.id) errors.push('Missing file ID')
    if (!file.created) errors.push('Missing created timestamp')
    if (!file.updated) errors.push('Missing updated timestamp')

    // Personality validation
    if (!file.personality) {
      errors.push('Missing personality data')
    } else {
      const { personality } = file

      // Voice validation
      if (!personality.voice) errors.push('Missing voice data')
      else if (typeof personality.voice.tone?.confidence !== 'number' ||
                 personality.voice.tone.confidence < 0 ||
                 personality.voice.tone.confidence > 1) {
        errors.push('Voice tone confidence must be between 0 and 1')
      }

      // Domains validation
      if (personality.domains) {
        for (let i = 0; i < personality.domains.length; i++) {
          const domain = personality.domains[i]
          if (typeof domain.confidence !== 'number' ||
              domain.confidence < 0 ||
              domain.confidence > 1) {
            errors.push(`Domain[${i}] confidence must be between 0 and 1`)
          }
        }
      }

      // Values validation
      if (personality.values) {
        for (let i = 0; i < personality.values.length; i++) {
          const value = personality.values[i]
          if (typeof value.confidence !== 'number' ||
              value.confidence < 0 ||
              value.confidence > 1) {
            errors.push(`Value[${i}] confidence must be between 0 and 1`)
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    this.debug('Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Make API call with retry logic
   */
  private async fetchWithRetry(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.baseURL}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {})
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.debug(`Retry attempt ${attempt}/${this.config.maxRetries} for ${path}`)
          await this.delay(Math.pow(2, attempt) * 1000) // exponential backoff
        }

        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw IdiomarkError.fromResponse(
            response.status,
            `HTTP ${response.status}: ${response.statusText}`
          )
        }

        return response
      } catch (error) {
        lastError = error as Error

        // Don't retry if it's not retryable
        if (error instanceof IdiomarkError && !error.retryable) {
          throw error
        }

        // Continue to retry on timeout or retryable errors
        if (error instanceof Error && error.name === 'AbortError') {
          // Timeout is retryable
          continue
        }
      }
    }

    clearTimeout(timeoutId)

    if (lastError) {
      throw lastError
    }

    throw new IdiomarkError(IdiomarkErrorCode.UNKNOWN, 'Max retries exceeded')
  }

  /**
   * Delay for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Debug logging
   */
  private debug(message: string): void {
    if (this.config.debug) {
      console.log(`[Idiomark Storage] ${message}`)
    }
  }
}
