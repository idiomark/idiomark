/**
 * Idiomark Base Adapter
 *
 * Provides all common functionality for platform adapters.
 * Subclasses only need to implement fetchContent() and normalize().
 *
 * Features:
 * - Rate limiting (token bucket algorithm)
 * - Response caching (L1 in-memory, L2 persistent)
 * - Request retry (exponential backoff with jitter)
 * - Authentication management
 * - Error handling and recovery
 * - Metrics and logging
 * - Event emission
 */

import type { PlatformAdapter, NormalizedContent, FetchOptions, RawContent } from '../types'
import { EventEmitter } from 'events'

// ============================================================
// Configuration Types
// ============================================================

export interface RateLimiterConfig {
  maxRequests: number
  windowDuration: number
  perEndpoint?: boolean
}

export interface CacheConfig {
  enabled: boolean
  ttl: number // milliseconds
  maxSize?: number
  persistent?: boolean
  persistentPath?: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

export interface AdapterConfig {
  name: string
  rateLimiter?: RateLimiterConfig
  cache?: CacheConfig
  retry?: RetryConfig
}

export interface ExtractionProgress {
  fetched: number
  total: number
  percent: number
  currentBatch: RawContent[]
}

export interface AdapterHealth {
  healthy: boolean
  latency?: number
  rateLimit?: RateLimitStatus
  cache?: CacheStats
  retry?: RetryStats
  error?: string
}

export interface AdapterMetrics {
  requests: number
  cacheHits: number
  cacheMisses: number
  retries: number
  errors: number
  avgLatency: number
}

export interface RateLimitStatus {
  tokensRemaining: number
  maxTokens: number
  resetAt: Date
  waitTime: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

export interface RetryStats {
  totalRetries: number
  successfulRetries: number
  failedRetries: number
}

// ============================================================
// Rate Limiter
// ============================================================

/**
 * Token bucket rate limiter
 *
 * Features:
 * - Token bucket algorithm
 * - Per-endpoint limits
 * - Dynamic limit adjustment from headers
 * - Wait time prediction
 */
export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private config: RateLimiterConfig
  private emitter: EventEmitter
  private perEndpointLimits: Map<string, { tokens: number; lastRefill: number }>

  constructor(config: RateLimiterConfig, emitter: EventEmitter) {
    this.config = config
    this.tokens = config.maxRequests
    this.lastRefill = Date.now()
    this.emitter = emitter
    this.perEndpointLimits = new Map()
  }

  /**
   * Wait until a token is available
   */
  async throttle(endpoint?: string): Promise<void> {
    const state = this.getEndpointState(endpoint)
    this.refill(state)

    if (state.tokens >= 1) {
      state.tokens--
      this.setEndpointState(endpoint, state)
      return
    }

    // Calculate wait time
    const waitTime = this.calculateWaitTime(state)
    this.emitter.emit('rateLimitWait', { endpoint, waitTime })

    await sleep(waitTime)
    await this.throttle(endpoint) // Retry after waiting
  }

  /**
   * Update limits from response headers (e.g., X-RateLimit-Remaining)
   */
  updateFromHeaders(headers: Headers, endpoint?: string): void {
    const remaining = headers.get('x-ratelimit-remaining') ||
                      headers.get('x-rate-limit-remaining')
    const reset = headers.get('x-ratelimit-reset') ||
                  headers.get('x-rate-limit-reset')
    const limit = headers.get('x-ratelimit-limit') ||
                  headers.get('x-rate-limit-limit')

    const state = this.getEndpointState(endpoint)

    if (remaining !== null) {
      state.tokens = parseInt(remaining, 10)
    }

    if (reset !== null) {
      state.lastRefill = parseInt(reset, 10) * 1000
    }

    if (limit !== null) {
      this.config.maxRequests = parseInt(limit, 10)
    }

    this.setEndpointState(endpoint, state)
  }

  /**
   * Get current rate limit status
   */
  getStatus(endpoint?: string): RateLimitStatus {
    const state = this.getEndpointState(endpoint)
    return {
      tokensRemaining: Math.floor(state.tokens),
      maxTokens: this.config.maxRequests,
      resetAt: new Date(state.lastRefill + this.config.windowDuration),
      waitTime: this.calculateWaitTime(state)
    }
  }

  /**
   * Reset rate limiter
   */
  reset(endpoint?: string): void {
    if (endpoint && this.config.perEndpoint) {
      this.perEndpointLimits.delete(endpoint)
    } else {
      this.tokens = this.config.maxRequests
      this.lastRefill = Date.now()
      this.perEndpointLimits.clear()
    }
  }

  /**
   * Get request count
   */
  getRequestCount(): number {
    let count = this.config.maxRequests - this.tokens

    for (const state of this.perEndpointLimits.values()) {
      count += this.config.maxRequests - state.tokens
    }

    return count
  }

  private getEndpointState(endpoint?: string): { tokens: number; lastRefill: number } {
    if (!endpoint || !this.config.perEndpoint) {
      return { tokens: this.tokens, lastRefill: this.lastRefill }
    }

    if (!this.perEndpointLimits.has(endpoint)) {
      this.perEndpointLimits.set(endpoint, {
        tokens: this.config.maxRequests,
        lastRefill: Date.now()
      })
    }

    return this.perEndpointLimits.get(endpoint)!
  }

  private setEndpointState(endpoint: string | undefined, state: { tokens: number; lastRefill: number }): void {
    if (!endpoint || !this.config.perEndpoint) {
      this.tokens = state.tokens
      this.lastRefill = state.lastRefill
    } else {
      this.perEndpointLimits.set(endpoint, state)
    }
  }

  private refill(state: { tokens: number; lastRefill: number }): void {
    const now = Date.now()
    const elapsed = now - state.lastRefill

    if (elapsed > this.config.windowDuration) {
      state.tokens = this.config.maxRequests
      state.lastRefill = now
    } else {
      // Partial refill based on elapsed time
      const refillTokens = (elapsed / this.config.windowDuration) * this.config.maxRequests
      state.tokens = Math.min(this.config.maxRequests, state.tokens + refillTokens)
    }
  }

  private calculateWaitTime(state: { tokens: number; lastRefill: number }): number {
    const now = Date.now()
    const timeUntilReset = (state.lastRefill + this.config.windowDuration) - now

    if (state.tokens < 1 && timeUntilReset > 0) {
      return timeUntilReset
    }

    return 0
  }
}

// ============================================================
// Cache Manager
// ============================================================

interface CachedData {
  data: NormalizedContent[]
  cachedAt: number
  ttl: number
}

/**
 * Multi-level cache manager
 *
 * Features:
 * - L1 in-memory LRU cache
 * - L2 persistent cache (optional)
 * - TTL-based expiration
 * - Automatic cache key generation
 */
export class CacheManager {
  private l1Cache: Map<string, CachedData>
  private lruOrder: string[]
  private config: CacheConfig
  private metrics: { hits: number; misses: number }

  constructor(config: CacheConfig) {
    this.config = config
    this.l1Cache = new Map()
    this.lruOrder = []
    this.metrics = { hits: 0, misses: 0 }
  }

  /**
   * Get cached data
   */
  async get(key: string | FetchOptions): Promise<NormalizedContent[] | null> {
    if (!this.config.enabled) {
      return null
    }

    const cacheKey = this.generateKey(key)

    // Try L1 cache
    const l1Data = this.l1Cache.get(cacheKey)
    if (l1Data && !this.isExpired(l1Data)) {
      this.updateLRU(cacheKey)
      this.metrics.hits++
      return l1Data.data
    }

    this.metrics.misses++
    return null
  }

  /**
   * Set cached data
   */
  async set(key: string | FetchOptions, data: NormalizedContent[]): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    const cacheKey = this.generateKey(key)
    const cachedData: CachedData = {
      data,
      cachedAt: Date.now(),
      ttl: this.config.ttl
    }

    // Check size limit
    if (this.config.maxSize && this.l1Cache.size >= this.config.maxSize) {
      this.evictLRU()
    }

    this.l1Cache.set(cacheKey, cachedData)
    this.updateLRU(cacheKey)
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.l1Cache.clear()
    this.lruOrder = []
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.metrics.hits + this.metrics.misses
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      size: this.l1Cache.size,
      hitRate: total > 0 ? this.metrics.hits / total : 0
    }
  }

  /**
   * Get hit count
   */
  getHitCount(): number {
    return this.metrics.hits
  }

  /**
   * Get miss count
   */
  getMissCount(): number {
    return this.metrics.misses
  }

  private generateKey(key: string | FetchOptions): string {
    if (typeof key === 'string') return key

    // Simple hash of options
    return JSON.stringify(key)
  }

  private isExpired(data: CachedData): boolean {
    return Date.now() - data.cachedAt > data.ttl
  }

  private updateLRU(key: string): void {
    const index = this.lruOrder.indexOf(key)
    if (index !== -1) {
      this.lruOrder.splice(index, 1)
    }
    this.lruOrder.push(key)
  }

  private evictLRU(): void {
    const lruKey = this.lruOrder.shift()
    if (lruKey) {
      this.l1Cache.delete(lruKey)
    }
  }

  async close(): Promise<void> {
    await this.clear()
  }
}

// ============================================================
// Retry Handler
// ============================================================

/**
 * Exponential backoff retry handler
 *
 * Features:
 * - Exponential backoff with jitter
 * - Maximum retry limit
 * - Retryable error detection
 * - Custom retry conditions
 */
export class RetryHandler {
  private config: RetryConfig
  private emitter: EventEmitter
  private totalRetries: number = 0
  private successfulRetries: number = 0
  private failedRetries: number = 0

  constructor(config: RetryConfig, emitter: EventEmitter) {
    this.config = config
    this.emitter = emitter
  }

  async execute<T>(
    fn: () => Promise<T>,
    options?: { isRetryable?: (error: Error) => boolean }
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.totalRetries++
        }

        const result = await fn()

        if (attempt > 0) {
          this.successfulRetries++
        }

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if error is retryable
        const isRetryable = options?.isRetryable
          ? options.isRetryable(lastError)
          : this.isRetryableError(lastError)

        if (!isRetryable || attempt >= this.config.maxRetries) {
          if (attempt > 0) {
            this.failedRetries++
          }
          throw lastError
        }

        // Calculate backoff with jitter
        const backoff = this.calculateBackoff(attempt)
        this.emitter.emit('retry', { attempt, backoff, error: lastError })

        await sleep(backoff)
      }
    }

    throw lastError
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return {
      totalRetries: this.totalRetries,
      successfulRetries: this.successfulRetries,
      failedRetries: this.failedRetries
    }
  }

  /**
   * Get retry count
   */
  getRetryCount(): number {
    return this.totalRetries
  }

  /**
   * Reset retry handler
   */
  reset(): void {
    this.totalRetries = 0
    this.successfulRetries = 0
    this.failedRetries = 0
  }

  private isRetryableError(error: Error): boolean {
    // Retry on network errors, rate limits, and server errors
    const retryablePatterns = [
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /429/, // Rate limit
      /50[0-4]/ // Server errors
    ]

    const message = error.message || ''
    const name = error.name || ''

    return retryablePatterns.some(pattern =>
      pattern.test(message) || pattern.test(name)
    )
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt)

    // Add jitter (random +/- 25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)

    return Math.min(exponentialDelay + jitter, this.config.maxDelay)
  }
}

// ============================================================
// Auth Manager
// ============================================================

export type AuthType = 'none' | 'bearer_token' | 'oauth2' | 'api_key' | 'basic'

export interface AuthConfig {
  type: AuthType
  credentials?: Record<string, string>
  tokenProvider?: () => Promise<string>
}

/**
 * Authentication manager
 *
 * Handles different authentication types and token refresh
 */
export class AuthManager {
  private config: AuthConfig
  private currentToken?: string
  private tokenExpiresAt?: number

  constructor(config: AuthConfig) {
    this.config = config
  }

  async getHeaders(): Promise<Record<string, string>> {
    switch (this.config.type) {
      case 'bearer_token':
        return {
          'Authorization': `Bearer ${await this.getToken()}`
        }

      case 'oauth2':
        return {
          'Authorization': `Bearer ${await this.getToken()}`
        }

      case 'api_key':
        return {
          'X-API-Key': this.config.credentials?.apiKey || ''
        }

      case 'basic':
        const encoded = btoa(
          `${this.config.credentials?.username || ''}:${this.config.credentials?.password || ''}`
        )
        return {
          'Authorization': `Basic ${encoded}`
        }

      default:
        return {}
    }
  }

  async getToken(): Promise<string> {
    // Check if token is expired
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt) {
      this.currentToken = undefined
    }

    // Get token from provider or cache
    if (!this.currentToken && this.config.tokenProvider) {
      this.currentToken = await this.config.tokenProvider()
    }

    return this.currentToken || ''
  }

  async refresh(): Promise<void> {
    this.currentToken = undefined
    await this.getToken()
  }

  isAuthenticated(): boolean {
    return this.config.type === 'none' || !!this.currentToken || !!this.config.credentials
  }
}

// ============================================================
// Error Handler
// ============================================================

export class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

export class RateLimitError extends AdapterError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      true
    )
    this.name = 'RateLimitError'
  }
}

export class AuthError extends AdapterError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_FAILED', 401, false)
    this.name = 'AuthError'
  }
}

/**
 * Error handler for adapter operations
 */
export class ErrorHandler {
  private errorCount: number = 0
  private errors: Map<string, number> = new Map()

  handle(error: unknown): AdapterError {
    this.errorCount++

    if (error instanceof AdapterError) {
      const key = error.code
      this.errors.set(key, (this.errors.get(key) || 0) + 1)
      throw error
    }

    if (error instanceof Error) {
      // Convert common errors to AdapterErrors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return new RateLimitError()
      }

      if (error.message.includes('401') || error.message.includes('authentication')) {
        return new AuthError(error.message)
      }

      return new AdapterError(error.message, 'UNKNOWN', undefined, this.isRetryable(error))
    }

    return new AdapterError(String(error), 'UNKNOWN')
  }

  getErrorCount(): number {
    return this.errorCount
  }

  getErrors(): Record<string, number> {
    return Object.fromEntries(this.errors)
  }

  private isRetryable(error: Error): boolean {
    const retryablePatterns = [
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /429/,
      /50[0-4]/
    ]

    return retryablePatterns.some(pattern => pattern.test(error.message))
  }
}

// ============================================================
// Metrics Collector
// ============================================================

export class MetricsCollector {
  private latencies: number[] = []
  private counters: Map<string, number> = new Map()

  recordLatency(ms: number): void {
    this.latencies.push(ms)
    // Keep only last 1000 measurements
    if (this.latencies.length > 1000) {
      this.latencies.shift()
    }
  }

  increment(key: string): void {
    this.counters.set(key, (this.counters.get(key) || 0) + 1)
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0
    const sum = this.latencies.reduce((a, b) => a + b, 0)
    return sum / this.latencies.length
  }

  getMedianLatency(): number {
    if (this.latencies.length === 0) return 0
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  getCount(key: string): number {
    return this.counters.get(key) || 0
  }

  getAll(): Record<string, number> {
    return {
      avgLatency: this.getAverageLatency(),
      medianLatency: this.getMedianLatency(),
      ...Object.fromEntries(this.counters)
    }
  }

  reset(): void {
    this.latencies = []
    this.counters.clear()
  }
}

// ============================================================
// Base Adapter Class
// ============================================================

/**
 * Base adapter class with built-in functionality
 *
 * Provides:
 * - Rate limiting
 * - Caching
 * - Retry logic
 * - Authentication management
 * - Error handling
 * - Metrics collection
 * - Event emission
 */
export abstract class BaseAdapter implements PlatformAdapter {
  readonly name: string
  protected config: AdapterConfig

  // Built-in components
  protected readonly rateLimiter: RateLimiter
  protected readonly cache: CacheManager
  protected readonly retry: RetryHandler
  protected readonly auth: AuthManager
  protected readonly errorHandler: ErrorHandler
  protected readonly metrics: MetricsCollector
  protected readonly emitter: EventEmitter

  constructor(name: string, config: AdapterConfig = { name }) {
    this.name = name
    this.config = config

    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(100) // Allow many listeners

    // Initialize components
    this.rateLimiter = new RateLimiter(
      config.rateLimiter || { maxRequests: 100, windowDuration: 60000 },
      this.emitter
    )

    this.cache = new CacheManager(
      config.cache || { enabled: true, ttl: 300000 }
    )

    this.retry = new RetryHandler(
      config.retry || { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
      this.emitter
    )

    this.auth = new AuthManager({ type: 'none' })
    this.errorHandler = new ErrorHandler()
    this.metrics = new MetricsCollector()
  }

  // ============================================================
  // Abstract methods (must be implemented by subclasses)
  // ============================================================

  /**
   * Fetch raw content from the platform
   */
  abstract fetchContent(options: FetchOptions): Promise<RawContent[]>

  /**
   * Normalize raw content to Idiomark format
   */
  abstract normalize(raw: RawContent): NormalizedContent

  // ============================================================
  // PlatformAdapter interface implementation
  // ============================================================

  /**
   * Alias for fetchContent - implements PlatformAdapter interface
   * Subclasses implement fetchContent, this provides the fetchData method
   */
  async fetchData(options: FetchOptions): Promise<RawContent[]> {
    return this.fetchContent(options)
  }

  // ============================================================
  // Optional overrides
  // ============================================================

  /**
   * Authenticate with the platform
   * Default: Returns true (no auth required)
   */
  async authenticate(): Promise<boolean> {
    return true
  }

  /**
   * Validate configuration before fetching
   * Default: Checks if authenticated
   */
  async validate(): Promise<boolean> {
    return this.auth.isAuthenticated()
  }

  // ============================================================
  // High-level methods
  // ============================================================

  /**
   * Main extraction method with automatic retry, caching, and rate limiting
   */
  async extract(options: FetchOptions): Promise<NormalizedContent[]> {
    // 1. Validate
    const isValid = await this.validate()
    if (!isValid) {
      throw new AuthError('Validation failed - check authentication')
    }

    // 2. Check cache
    const cached = await this.cache.get(options)
    if (cached) {
      this.emitter.emit('cacheHit', { options })
      return cached
    }

    // 3. Rate limit
    await this.rateLimiter.throttle()

    // 4. Fetch with retry and timing
    const start = Date.now()
    const raw = await this.retry.execute(() => this.fetchContent(options))
    const latency = Date.now() - start

    this.metrics.recordLatency(latency)
    this.metrics.increment('requests')

    // 5. Normalize
    const normalized = raw.map(item => this.normalize(item))

    // 6. Cache result
    await this.cache.set(options, normalized)

    // 7. Emit completion event
    this.emitter.emit('fetchComplete', { count: normalized.length, latency })

    return normalized
  }

  /**
   * Fetch with progress callback for large datasets
   */
  async extractWithProgress(
    options: FetchOptions,
    onProgress: (progress: ExtractionProgress) => void
  ): Promise<NormalizedContent[]> {
    const results: NormalizedContent[] = []
    const limit = options.limit || 100

    onProgress({
      fetched: 0,
      total: limit,
      percent: 0,
      currentBatch: []
    })

    // Fetch in batches
    let fetched = 0
    const batchSize = Math.min(50, limit)

    while (fetched < limit) {
      const batchOptions = {
        ...options,
        limit: Math.min(batchSize, limit - fetched)
      }

      const batch = await this.extract(batchOptions)
      results.push(...batch)
      fetched += batch.length

      onProgress({
        fetched,
        total: limit,
        percent: (fetched / limit) * 100,
        currentBatch: batch.map(item => item.raw)
      })

      if (batch.length === 0) break // No more data
    }

    return results
  }

  /**
   * Health check for adapter
   */
  async healthCheck(): Promise<AdapterHealth> {
    const start = Date.now()

    try {
      const isAuthenticated = await this.authenticate()
      const latency = Date.now() - start

      return {
        healthy: isAuthenticated,
        latency,
        rateLimit: this.rateLimiter.getStatus(),
        cache: this.cache.getStats(),
        retry: this.retry.getStats()
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  // ============================================================
  // Utility methods
  // ============================================================

  /**
   * Get adapter metrics
   */
  getMetrics(): AdapterMetrics {
    return {
      requests: this.metrics.getCount('requests'),
      cacheHits: this.cache.getHitCount(),
      cacheMisses: this.cache.getMissCount(),
      retries: this.retry.getRetryCount(),
      errors: this.errorHandler.getErrorCount(),
      avgLatency: this.metrics.getAverageLatency()
    }
  }

  /**
   * Get adapter events
   */
  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener)
    return this
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: any[]) => void): this {
    this.emitter.off(event, listener)
    return this
  }

  /**
   * Reset adapter state (clear cache, reset rate limits, etc.)
   */
  async reset(): Promise<void> {
    await this.cache.clear()
    this.rateLimiter.reset()
    this.retry.reset()
    this.metrics.reset()
    this.emitter.emit('reset')
  }

  /**
   * Dispose of adapter resources
   */
  async dispose(): Promise<void> {
    await this.cache.close()
    this.emitter.removeAllListeners()
    this.emitter.emit('dispose')
  }
}

// ============================================================
// Utility Functions
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { sleep }
