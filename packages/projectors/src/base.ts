/**
 * Base Projection Adapter
 *
 * Mirrors BaseAdapter but for projecting Idiomark personalities
 * TO external systems instead of extracting FROM them.
 *
 * Direction: Idiomark Personality → External System
 */

import { EventEmitter } from 'events'
import type {
  ProjectionInput,
  ProjectionOutput,
  ProjectionOptions,
  ResponseResult,
  PersonalityMode,
  PersonalityTransformOptions,
  ProjectionHealth,
  ProjectionMetrics,
  ConversationContext
} from './types'
import type { IdiomarkFile } from '@idiomark/core'

// ============================================================
// Local Utility Classes (simplified from core)
// ============================================================

export interface RateLimiterConfig {
  maxRequests: number
  windowDuration: number
}

export interface CacheConfig {
  enabled: boolean
  ttl: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

class RateLimiter {
  private config: RateLimiterConfig
  private requests: number[] = []
  private emitter: EventEmitter

  constructor(config: RateLimiterConfig, emitter: EventEmitter) {
    this.config = config
    this.emitter = emitter
  }

  async throttle(): Promise<void> {
    const now = Date.now()
    const windowStart = now - this.config.windowDuration

    // Clean old requests
    this.requests = this.requests.filter(time => time > windowStart)

    // Check if limit reached
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = oldestRequest + this.config.windowDuration - now
      this.emitter.emit('rateLimit', { waitTime })
      await sleep(waitTime)
    }

    this.requests.push(now)
  }

  reset(): void {
    this.requests = []
  }
}

class CacheManager {
  private cache = new Map<string, { value: unknown; expiry: number }>()
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  async get(key: string): Promise<unknown | undefined> {
    if (!this.config.enabled) return undefined

    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  async set(key: string, value: unknown): Promise<void> {
    if (!this.config.enabled) return

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.config.ttl
    })
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async close(): Promise<void> {
    this.cache.clear()
  }
}

class RetryHandler {
  private config: RetryConfig
  private emitter: EventEmitter

  constructor(config: RetryConfig, emitter: EventEmitter) {
    this.config = config
    this.emitter = emitter
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.emitter.emit('retry', { attempt, error: lastError })

        if (attempt < this.config.maxRetries) {
          const delay = Math.min(
            this.config.baseDelay * Math.pow(2, attempt),
            this.config.maxDelay
          )
          await sleep(delay)
        }
      }
    }

    throw lastError
  }

  reset(): void {
    // Reset state if needed
  }
}

class MetricsCollector {
  private metrics = new Map<string, number>()
  private latencies: number[] = []

  recordLatency(latency: number): void {
    this.latencies.push(latency)
  }

  increment(metric: string): void {
    const current = this.metrics.get(metric) || 0
    this.metrics.set(metric, current + 1)
  }

  getCount(metric: string): number {
    return this.metrics.get(metric) || 0
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0
    const sum = this.latencies.reduce((a, b) => a + b, 0)
    return sum / this.latencies.length
  }

  reset(): void {
    this.metrics.clear()
    this.latencies = []
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// Configuration
// ============================================================

export interface ProjectionAdapterConfig {
  name: string
  rateLimiter?: RateLimiterConfig
  cache?: CacheConfig
  retry?: RetryConfig
}

export interface ProjectionProgress {
  processed: number
  total: number
  percent: number
  currentResult?: ResponseResult
}

// ============================================================
// Base Projection Adapter
// ============================================================

/**
 * Base class for all projection adapters
 *
 * Provides:
 * - Rate limiting (for outgoing requests)
 * - Caching (for personality applications)
 * - Retry logic (for failed sends)
 * - Metrics collection
 * - Event emission
 */
export abstract class BaseProjectionAdapter {
  readonly name: string
  protected config: ProjectionAdapterConfig
  protected personality: IdiomarkFile | null = null

  // Built-in components (mirrors BaseAdapter)
  protected readonly rateLimiter: RateLimiter
  protected readonly cache: CacheManager
  protected readonly retry: RetryHandler
  protected readonly metrics: MetricsCollector
  protected readonly emitter: EventEmitter

  constructor(name: string, config: ProjectionAdapterConfig = { name }) {
    this.name = name
    this.config = config

    this.emitter = new EventEmitter()
    this.emitter.setMaxListeners(100)

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

    this.metrics = new MetricsCollector()
  }

  // ============================================================
  // Abstract methods (must be implemented by subclasses)
  // ============================================================

  /**
   * Transform input using personality into output format
   */
  abstract transform(input: ProjectionInput): Promise<ProjectionOutput>

  /**
   * Send output to target platform/system
   */
  abstract send(output: ProjectionOutput): Promise<ResponseResult>

  /**
   * Start the adapter (for server-type adapters)
   */
  abstract start?(options: ProjectionOptions): Promise<void>

  /**
   * Stop the adapter (cleanup resources)
   */
  abstract stop?(): Promise<void>

  // ============================================================
  // High-level methods
  // ============================================================

  /**
   * Main projection method with caching, retry, and metrics
   */
  async apply(options: ProjectionOptions): Promise<ResponseResult> {
    const start = Date.now()

    try {
      // Load personality
      if (!this.personality) {
        this.personality = options.personality
      }

      this.emitter.emit('projectionStart', { options })

      // Check cache
      const cacheKey = this.getCacheKey(options)
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        this.emitter.emit('cacheHit', { key: cacheKey })
        return {
          success: true,
          content: cached[0]?.content || '',
          duration: Date.now() - start
        }
      }

      // Rate limit (for outgoing requests)
      await this.rateLimiter.throttle()

      // Transform and send with retry
      const result = await this.retry.execute(async () => {
        const output = await this.transform({ message: options.target || '', context: undefined })
        return await this.send(output)
      })

      // Cache successful results
      if (result.success && result.content) {
        await this.cache.set(cacheKey, [{ content: result.content, format: 'text' }])
      }

      // Record metrics
      const duration = Date.now() - start
      this.metrics.recordLatency(duration)
      this.metrics.increment('requests')
      this.metrics.increment(result.success ? 'successes' : 'failures')

      this.emitter.emit('projectionComplete', { result, duration })

      return {
        ...result,
        duration
      }

    } catch (error) {
      const duration = Date.now() - start
      this.metrics.increment('failures')

      this.emitter.emit('projectionError', { error, duration })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      }
    }
  }

  /**
   * Apply personality transformation to a message
   * Subclasses can override for custom logic
   */
  protected async applyPersonality(
    message: string,
    options: PersonalityTransformOptions = { mode: 'balanced' }
  ): Promise<string> {
    if (!this.personality) {
      throw new Error('Personality not loaded. Call apply() with ProjectionOptions first.')
    }

    // Use the inference package to apply personality
    const { buildSystemPrompt } = await import('@idiomark/inference')

    const systemPrompt = buildSystemPrompt(this.personality, options.mode)

    // For now, return the system prompt + message
    // Subclasses can override to use actual LLM generation
    return `[System: ${systemPrompt}]\n[User: ${message}]`
  }

  // ============================================================
  // Health & Metrics
  // ============================================================

  /**
   * Health check for adapter
   */
  async healthCheck(): Promise<ProjectionHealth> {
    const start = Date.now()

    try {
      return {
        healthy: true,
        latency: Date.now() - start
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get adapter metrics
   */
  getMetrics(): ProjectionMetrics {
    return {
      requests: this.metrics.getCount('requests'),
      successes: this.metrics.getCount('successes'),
      failures: this.metrics.getCount('failures'),
      avgLatency: this.metrics.getAverageLatency(),
      totalRequestsProcessed: this.metrics.getCount('requests')
    }
  }

  // ============================================================
  // Utility methods
  // ============================================================

  /**
   * Get adapter events
   */
  on(event: string, listener: (...args: unknown[]) => void): this {
    this.emitter.on(event, listener)
    return this
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: unknown[]) => void): this {
    this.emitter.off(event, listener)
    return this
  }

  /**
   * Reset adapter state
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

  /**
   * Generate cache key from options
   */
  protected getCacheKey(options: ProjectionOptions): string {
    return JSON.stringify({
      target: options.target,
      mode: options.mode,
      personality: options.personality.personality?.voice?.tone?.primary || 'default'
    })
  }
}

// Re-export sleep utility
export { sleep }
