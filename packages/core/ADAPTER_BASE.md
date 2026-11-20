# BaseAdapter - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [adapters/base.ts](src/adapters/base.ts)

---

## Overview

`BaseAdapter` provides all common functionality for platform adapters. It implements sophisticated features:

- **Rate Limiting** - Token bucket algorithm with per-endpoint limits
- **Caching** - Two-level LRU cache with TTL expiration
- **Retry Logic** - Exponential backoff with jitter
- **Authentication** - Multiple auth types with token refresh
- **Error Handling** - Error classification and retryable detection
- **Metrics Collection** - Latency tracking and request counting
- **Event Emission** - Progress and status events

**Key Design Principle:** Adapters only need to implement `fetchContent()` and `normalize()`. All other functionality is provided by BaseAdapter.

---

## Quick Start

```typescript
import { BaseAdapter, AdapterConfig } from '@idiomark/core'

class MyPlatformAdapter extends BaseAdapter {
  constructor() {
    super('myplatform', {
      rateLimiter: {
        maxRequests: 100,
        windowDuration: 60000  // 1 minute
      },
      cache: {
        enabled: true,
        ttl: 300000  // 5 minutes
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    })
  }

  // Only implement these two methods
  async fetchContent(options: FetchOptions): Promise<RawContent[]> {
    // Fetch from platform API
    return this.fetchData(options)
  }

  normalize(raw: RawContent): NormalizedContent {
    // Convert to Idiomark format
    return {
      id: raw.id,
      platform: this.name,
      type: 'post',
      text: raw.content,
      timestamp: raw.created_at,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        name: raw.author.name || raw.author.username
      },
      raw
    }
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BaseAdapter                              │
│  ├─ RateLimiter (Token Bucket)                             │
│  ├─ CacheManager (L1/L2 with LRU eviction)              │
│  ├─ RetryHandler (Exponential Backoff)                      │
│  ├─ AuthManager (Multiple Auth Types)                         │
│  ├─ ErrorHandler (Error Classification)                         │
│  └─ MetricsCollector (Performance Tracking)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  All components share: EventEmitter                             │
│  Events emitted: fetchStart, fetchComplete, cacheHit, retry...    │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### AdapterConfig

```typescript
interface AdapterConfig {
  name: string                    // Adapter identifier
  rateLimiter?: RateLimiterConfig
  cache?: CacheConfig
  retry?: RetryConfig
}
```

### RateLimiterConfig

Controls rate limiting behavior.

```typescript
interface RateLimiterConfig {
  maxRequests: number          // Max requests per window
  windowDuration: number        // Window duration in milliseconds
  perEndpoint?: boolean          // Separate limits per endpoint
}
```

**Default:** `{ maxRequests: 100, windowDuration: 60000 }` (100 req/min)

### CacheConfig

Controls caching behavior.

```typescript
interface CacheConfig {
  enabled: boolean              // Enable/disable cache (default: true)
  ttl: number                  // Time-to-live in milliseconds (default: 300000)
  maxSize?: number             // Maximum cache entries
  persistent?: boolean           // Enable disk cache (not implemented)
  persistentPath?: string        // Path for persistent cache
}
```

**Default:** `{ enabled: true, ttl: 300000 }` (5 min cache)

### RetryConfig

Controls retry behavior.

```typescript
interface RetryConfig {
  maxRetries: number           // Maximum retry attempts (default: 3)
  baseDelay: number            // Initial delay in milliseconds (default: 1000)
  maxDelay: number             // Maximum backoff delay (default: 10000)
}
```

---

## Component: RateLimiter

### Token Bucket Algorithm

Implements token bucket rate limiting with:
- Per-endpoint limits
- Dynamic limit adjustment from response headers
- Wait time prediction

### Usage

Automatically used by `BaseAdapter` - no manual setup needed.

### Methods

```typescript
class RateLimiter {
  // Main throttling - wait if needed, then consume token
  async throttle(endpoint?: string): Promise<void>

  // Update from headers - adjust limits from response
  updateFromHeaders(headers: Headers, endpoint?: string): void

  // Get current status
  getStatus(endpoint?: string): RateLimitStatus

  // Reset limiter
  reset(endpoint?: string): void

  // Get request count
  getRequestCount(): number
}
```

### RateLimitStatus

```typescript
interface RateLimitStatus {
  tokensRemaining: number    // Tokens left in current window
  maxTokens: number          // Max tokens per window
  resetAt: Date             // When window resets
  waitTime: number            // Milliseconds until next token
}
```

### Events Emitted

- `rateLimitWait` - When waiting for rate limit

### Example

```typescript
const limiter = new RateLimiter(config, emitter)

// Check before request
await limiter.throttle('/api/posts')

// After response, update from headers
limiter.updateFromHeaders(response.headers, '/api/posts')
```

---

## Component: CacheManager

### Two-Level Cache Architecture

- **L1 (Memory)**: Fast LRU cache with immediate access
- **L2 (Persistent)**: Optional disk cache for larger storage (not implemented)

### LRU Eviction

When cache is full, least-recently-used entries are evicted first.

### Usage

Automatically used by `BaseAdapter`.

### Methods

```typescript
class CacheManager {
  // Get cached data or null
  async get(key: string | FetchOptions): Promise<NormalizedContent[] | null>

  // Set cached data
  async set(key: string | FetchOptions, data: NormalizedContent[]): Promise<void>

  // Clear all cache
  async clear(): Promise<void>

  // Get cache statistics
  getStats(): CacheStats
}
```

### CacheStats

```typescript
interface CacheStats {
  hits: number          // Cache hits
  misses: number        // Cache misses
  size: number          // Current cache size
  hitRate: number       // Hit rate (0-1)
}
```

### Events Emitted

- `cacheHit` - When data found in cache

### Example

```typescript
const cache = new CacheManager({ enabled: true, ttl: 300000 })

// Check cache first
const cached = await cache.get(fetchOptions)
if (cached) {
  console.log('Cache hit!')
  return cached
}

// Cache miss - fetch and store
const result = await this.fetchContent(options)
await cache.set(options, result)
```

---

## Component: RetryHandler

### Exponential Backoff with Jitter

Implements intelligent retry logic:
- Exponential delay: `baseDelay * 2^attempt`
- Random jitter: ±25% of backoff to prevent thundering herd
- Retryable error detection
- Maximum retry limit

### Usage

Automatically used by `BaseAdapter`.

### Methods

```typescript
class RetryHandler {
  // Execute function with retry logic
  async execute<T>(fn: () => Promise<T>): Promise<T>

  // Get retry statistics
  getStats(): RetryStats
}
```

### RetryStats

```typescript
interface RetryStats {
  totalRetries: number       // Total retry attempts
  successfulRetries: number  // Retries that succeeded
  failedRetries: number     // Retries that ultimately failed
}
```

### Retryable Errors

Automatically retried:
- `ECONNRESET` - Connection reset
- `ETIMEDOUT` - Operation timeout
- `ENOTFOUND` - Resource not found
- `ECONNREFUSED` - Connection refused
- `429` - Rate limit exceeded
- `50x` - Server errors

### Events Emitted

- `retry` - When a retry is attempted

### Example

```typescript
const retry = new RetryHandler(config, emitter)

// Use with fetch
const result = await retry.execute(() => this.fetchContent(options))
```

---

## Component: AuthManager

### Authentication Types

```typescript
type AuthType =
  | 'none'           // No authentication
  | 'bearer_token'   // Bearer token header
  | 'oauth2'         // OAuth 2.0 flow
  | 'api_key'        // API key in header
  | 'basic'          // Basic auth header
```

### Usage

```typescript
class AuthManager {
  // Get headers for requests
  async getHeaders(): Promise<Record<string, string>>

  // Get current token
  async getToken(): Promise<string>

  // Refresh token
  async refresh(): Promise<void>

  // Check if authenticated
  isAuthenticated(): boolean
}
```

### AuthConfig

```typescript
interface AuthConfig {
  type: AuthType
  credentials?: Record<string, string>
  tokenProvider?: () => Promise<string>  // For dynamic token refresh
}
```

### Example: Bearer Token

```typescript
const auth = new AuthManager({
  type: 'bearer_token',
  credentials: { token: 'my-token' }
})
```

### Example: API Key

```typescript
const auth = new AuthManager({
  type: 'api_key',
  credentials: { apiKey: 'sk-...' }
})
```

---

## Component: ErrorHandler

### Error Classification

```typescript
class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  )
}

class RateLimitError extends AdapterError {
  constructor(retryAfter?: number)
}

class AuthError extends AdapterError {
  constructor(message = 'Authentication failed')
}
```

### Usage

Automatically used by `BaseAdapter`.

### Methods

```typescript
class ErrorHandler {
  // Handle error and convert to AdapterError
  handle(error: unknown): AdapterError

  // Get error count
  getErrorCount(): number

  // Get all errors
  getErrors(): Record<string, number>
}
```

---

## Component: MetricsCollector

### Performance Tracking

Tracks:
- Request latency (average, median)
- Request counters
- Cache hit/miss ratios

### Usage

Automatically used by `BaseAdapter`.

### Methods

```typescript
class MetricsCollector {
  // Record latency measurement
  recordLatency(ms: number): void

  // Increment counter
  increment(key: string): void

  // Get all metrics
  getAll(): Record<string, number>

  // Reset all metrics
  reset(): void
}
```

### Metrics Response

```typescript
interface AdapterMetrics {
  requests: number
  cacheHits: number
  cacheMisses: number
  retries: number
  errors: number
  avgLatency: number
}
```

---

## BaseAdapter Class

### Required Methods

Implement these two methods to create a functional adapter:

```typescript
abstract class BaseAdapter implements PlatformAdapter {
  // Fetch raw content from platform
  abstract fetchContent(options: FetchOptions): Promise<RawContent[]>

  // Convert to normalized Idiomark format
  abstract normalize(raw: RawContent): NormalizedContent
}
```

### Built-in Methods

BaseAdapter provides these methods automatically:

#### extract()

Main extraction method with automatic:
- Rate limiting
- Caching
- Retry logic
- Progress tracking

```typescript
async extract(options: FetchOptions): Promise<NormalizedContent[]>
```

**Events Emitted:**
- `fetchStart` - When starting fetch
- `cacheHit` - When cache hit occurs
- `fetchComplete` - When fetch completes with data

#### extractWithProgress()

Fetch with progress callback for large datasets.

```typescript
async extractWithProgress(
  options: FetchOptions,
  onProgress: (progress: ExtractionProgress) => void
): Promise<NormalizedContent[]>
```

**Progress Callback:**
```typescript
interface ExtractionProgress {
  fetched: number      // Items fetched so far
  total: number       // Total items to fetch
  percent: number      // Progress percentage
  currentBatch: RawContent[]  // Current batch contents
}
```

#### healthCheck()

Check adapter health status.

```typescript
async healthCheck(): Promise<AdapterHealth>
```

**AdapterHealth Response:**
```typescript
interface AdapterHealth {
  healthy: boolean
  latency?: number
  rateLimit?: RateLimitStatus
  cache?: CacheStats
  retry?: RetryStats
  error?: string
}
```

#### getMetrics()

Get performance metrics.

```typescript
getMetrics(): AdapterMetrics
```

#### reset()

Reset adapter state (clears cache, resets rate limits).

```typescript
async reset(): Promise<void>
```

#### dispose()

Dispose adapter resources.

```typescript
async dispose(): Promise<void>
```

---

## Event System

### Events Emitted

| Event | When | Data |
|-------|-------|-------|
| `fetchStart` | Starting fetch | - |
| `cacheHit` | Cache hit found | Cached data |
| `fetchComplete` | Fetch done | Count, latency |
| `rateLimitWait` | Rate limit active | Wait time |
| `retry` | Retry attempt | Attempt, backoff |
| `reset` | Adapter reset | - |
| `dispose` | Disposing | - |

### Event Subscription

```typescript
const adapter = new MyAdapter()

adapter.on('fetchComplete', (data) => {
  console.log('Fetched', data.count, 'items in', data.latency, 'ms')
})

adapter.on('rateLimitWait', (data) => {
  console.log('Waiting', data.waitTime, 'ms for next token')
})
```

---

## Configuration Examples

### Minimal Configuration

```typescript
class SimpleAdapter extends BaseAdapter {
  constructor() {
    super('simple', {
      cache: { enabled: true }  // Enable caching
    })
  }
}
```

### Full Configuration

```typescript
class ConfiguredAdapter extends BaseAdapter {
  constructor() {
    super('platform', {
      rateLimiter: {
        maxRequests: 1000,      // 1000 req/hour
        windowDuration: 3600000  // 1 hour
        perEndpoint: true          // Separate limits per endpoint
      },
      cache: {
        enabled: true,
        ttl: 600000,             // 10 minutes
        maxSize: 1000            // Max 1000 entries
      },
      retry: {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000
      }
    })
  }
}
```

### With Authentication

```typescript
class AuthenticatedAdapter extends BaseAdapter {
  constructor(token: string) {
    super('authenticated', {
      // Configure auth manager
      auth: {
        type: 'bearer_token',
        credentials: { token }
      }
    })
  }

  // Override authenticate
  async authenticate(): Promise<boolean> {
    return this.auth.isAuthenticated()
  }
}
```

---

## Building Custom Adapters

### Step 1: Extend BaseAdapter

```typescript
import { BaseAdapter, NormalizedContent, RawContent, FetchOptions } from '@idiomark/core'

export class MyPlatformAdapter extends BaseAdapter {
  constructor(apiKey: string) {
    super('myplatform', { name: 'myplatform' })
    this.apiKey = apiKey
  }

  async fetchContent(options: FetchOptions): Promise<RawContent[]> {
    // Your fetch implementation
    const response = await fetch('https://api.example.com/posts', {
      headers: { 'X-API-Key': this.apiKey }
    })

    const data = await response.json()
    return data
  }

  normalize(raw: RawContent): NormalizedContent {
    return {
      id: raw.id,
      platform: this.name,
      type: 'post',
      text: raw.content,
      timestamp: raw.created_at,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        name: raw.author.name
      },
      raw
    }
  }
}
```

### Step 2: Use Extract Method

```typescript
const adapter = new MyPlatformAdapter('api-key')

// Extract with automatic rate limiting, caching, retry
const content = await adapter.extract({
  limit: 100,
  includeReplies: true
})

// Extract with progress tracking
await adapter.extractWithProgress({
  limit: 1000,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent}%`)
  }
})
```

### Step 3: Health Check

```typescript
const health = await adapter.healthCheck()

if (health.healthy) {
  console.log('Adapter healthy - latency:', health.latency, 'ms')
  console.log('Cache hit rate:', health.cache?.hitRate)
  console.log('Rate limit status:', health.rateLimit)
}
```

---

## Best Practices

### 1. Rate Limiting

- **Respect rate limits** - Don't disable limiter
- **Handle waits** - Use `throttle()` before requests
- **Check status** - Use `getStatus()` before critical operations

### 2. Caching

- **Cache wisely** - Cache expensive operations
- **Set appropriate TTL** - Balance freshness vs API load
- **Monitor hit rate** - Use `getStats()` to tune cache

### 3. Error Handling

- **Use retry handler** - Don't implement custom retry
- **Check retryable** - Use `isRetryableError()` before retrying
- **Handle errors** - Use error handler to classify errors

### 4. Performance

- **Track metrics** - Use `getMetrics()` to monitor performance
- **Monitor latency** - Alert on high latency
- **Cache efficiency** - Aim for >80% hit rate

### 5. Testing

```typescript
// For testing without rate limiting
const testAdapter = new MyPlatformAdapter('test-key')
testAdapter.rateLimiter.reset()
```

---

## Advanced Patterns

### Custom Rate Limiting

```typescript
// Override getHeaders to add custom rate limit logic
class CustomRateLimitAdapter extends BaseAdapter {
  override async getHeaders() {
    const headers = await super.getHeaders()

    // Add custom rate limit headers
    headers['X-Rate-Limit-Remaining'] = '9999'

    return headers
  }
}
```

### Dynamic Authentication

```typescript
class DynamicAuthAdapter extends BaseAdapter {
  constructor(tokenProvider: () => Promise<string>) {
    super('dynamic', {
      auth: {
        type: 'bearer_token',
        tokenProvider  // Function that fetches fresh tokens
      }
    })
  }
}
```

### Event-Driven Architecture

```typescript
class EventDrivenAdapter extends BaseAdapter {
  constructor() {
    super('event-driven', {})

    // Listen to all events
    this.on('fetchComplete', (data) => {
      this.emit('data-ready', data)
    })

    this.on('rateLimitWait', (data) => {
      this.emit('backoff', data.waitTime)
    })
  }
}
```

---

## See Also

- [PlatformAdapter Interface](API_REFERENCE.md#platformadapter-interface) - Full interface definition
- [Extractor Documentation](EXTRACTOR.md) - Using adapters in extraction
- [API Reference](API_REFERENCE.md) - All exported APIs
