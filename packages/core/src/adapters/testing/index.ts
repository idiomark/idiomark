/**
 * Adapter Testing Framework
 *
 * Comprehensive testing utilities for Idiomark adapters.
 * Includes:
 * - Mock HTTP server
 * - Test suite builders
 * - Benchmarking tools
 * - Assertion helpers
 */

import type { PlatformAdapter, NormalizedContent, FetchOptions, RawContent } from '../../types'
import { BaseAdapter } from '../base'
import { createServer, Server } from 'http'
import { EventEmitter } from 'events'

// ============================================================
// Mock Server Types
// ============================================================

export interface MockRoute {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  status?: number
  response: any
  headers?: Record<string, string>
  delay?: number
}

export interface MockServerConfig {
  routes: MockRoute[]
  port?: number
  host?: string
}

export interface MockServerInstance {
  url: string
  port: number
  close: () => Promise<void>
}

// ============================================================
// Mock Server
// ============================================================

/**
 * Create a mock HTTP server for testing
 *
 * Usage:
 * ```typescript
 * const mockServer = await createMockServer({
 *   routes: [
 *     {
 *       path: '/api/posts',
 *       method: 'GET',
 *       response: { data: [{ id: '1', text: 'Hello' }] }
 *     }
 *   ]
 * })
 *
 * // Use mockServer.url in your adapter tests
 *
 * await mockServer.close()
 * ```
 */
export async function createMockServer(config: MockServerConfig): Promise<MockServerInstance> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const route = config.routes.find(r =>
        r.path === req.url && r.method === (req.method as any)
      )

      if (!route) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
        return
      }

      // Add delay if specified
      const sendResponse = () => {
        res.statusCode = route.status || 200

        // Set headers
        if (route.headers) {
          Object.entries(route.headers).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(route.response))
      }

      if (route.delay) {
        setTimeout(sendResponse, route.delay)
      } else {
        sendResponse()
      }
    })

    server.listen(0, config.host || 'localhost', () => {
      const address = server.address() as any
      resolve({
        url: `http://${config.host || 'localhost'}:${address.port}`,
        port: address.port,
        close: () => new Promise<void>((closeResolve, closeReject) => {
          server.close((err) => {
            if (err) closeReject(err)
            else closeResolve()
          })
        })
      })
    })

    server.on('error', reject)
  })
}

// ============================================================
// Test Suite Builder
// ============================================================

export interface TestSuiteOptions {
  adapterName: string
  adapterFactory: (auth?: any) => PlatformAdapter
  mockConfig: MockServerConfig
  validAuth: any
  sampleResponse: any
  sampleNormalized: NormalizedContent
}

export interface BenchmarkOptions {
  requests: number
  concurrency: number
}

export interface BenchmarkResult {
  totalRequests: number
  duration: number
  avgLatency: number
  requestsPerSecond: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
}

/**
 * Create a comprehensive test suite for an adapter
 *
 * Usage:
 * ```typescript
 * describe('MyAdapter', () => {
 *   createAdapterTestSuite({
 *     adapterName: 'myadapter',
 *     adapterFactory: (auth) => new MyAdapter(auth),
 *     mockConfig: { routes: [...] },
 *     validAuth: { token: 'test' },
 *     sampleResponse: { id: '1', text: 'Hello' },
 *     sampleNormalized: { id: '1', platform: 'myadapter', ... }
 *   })
 * })
 * ```
 */
export function createAdapterTestSuite(options: TestSuiteOptions) {
  const {
    adapterName,
    adapterFactory,
    mockConfig,
    validAuth,
    sampleResponse,
    sampleNormalized
  } = options

  let adapter: PlatformAdapter
  let mockServer: MockServerInstance

  return {
    beforeAll: async () => {
      mockServer = await createMockServer(mockConfig)

      // Override base URL if provided
      const auth = {
        ...validAuth,
        baseURL: mockServer.url
      }

      adapter = adapterFactory(auth)
    },

    afterAll: async () => {
      if (adapter.dispose) {
        await adapter.dispose()
      }
      if (mockServer) {
        await mockServer.close()
      }
    },

    tests: {
      authentication: {
        'should authenticate successfully': async () => {
          const isAuthenticated = await adapter.authenticate()
          if (isAuthenticated !== false) {
            // Pass if auth returns true or undefined (no auth required)
            return true
          }
          throw new Error('Authentication failed')
        },

        'should fail with invalid credentials': async () => {
          const badAdapter = adapterFactory({ ...validAuth, token: 'invalid' })
          const isAuthenticated = await badAdapter.authenticate()
          if (isAuthenticated === false) {
            return true
          }
          throw new Error('Expected authentication to fail with invalid credentials')
        }
      },

      fetching: {
        'should fetch content': async () => {
          const content = await adapter.fetchData({ limit: 10 })
          if (content && Array.isArray(content)) {
            return true
          }
          throw new Error('Expected content to be an array')
        },

        'should respect limit option': async () => {
          const content = await adapter.fetchData({ limit: 5 })
          if (content.length <= 5) {
            return true
          }
          throw new Error(`Expected <= 5 items, got ${content.length}`)
        }
      },

      normalization: {
        'should normalize content correctly': async () => {
          const normalized = adapter.normalize(sampleResponse)

          for (const [key, value] of Object.entries(sampleNormalized)) {
            // @ts-ignore - accessing dynamic key on NormalizedContent
            if ((normalized as any)[key] !== value) {
              throw new Error(`Expected ${key} to be ${value}, got ${(normalized as any)[key]}`)
            }
          }

          return true
        },

        'should include required fields': async () => {
          const normalized = adapter.normalize(sampleResponse)

          const requiredFields = ['id', 'platform', 'type', 'text', 'timestamp', 'author']
          for (const field of requiredFields) {
            if (!(field in normalized)) {
              throw new Error(`Missing required field: ${field}`)
            }
          }

          return true
        }
      },

      health: {
        'should return health status': async () => {
          const health = adapter.healthCheck ? await adapter.healthCheck() : { healthy: true }
          if ('healthy' in health) {
            return true
          }
          throw new Error('Expected health check to return healthy status')
        }
      },

      metrics: {
        'should return metrics': async () => {
          const metrics = adapter.getMetrics ? adapter.getMetrics() : undefined
          if (metrics && typeof metrics === 'object') {
            return true
          }
          throw new Error('Expected metrics to be an object')
        }
      }
    }
  }
}

// ============================================================
// Benchmarking
// ============================================================

/**
 * Benchmark adapter performance
 *
 * Usage:
 * ```typescript
 * const result = await benchmarkAdapter(adapter, {
 *   requests: 100,
 *   concurrency: 10
 * })
 *
 * console.log(`Average latency: ${result.avgLatency}ms`)
 * console.log(`Requests/sec: ${result.requestsPerSecond}`)
 * ```
 */
export async function benchmarkAdapter(
  adapter: PlatformAdapter,
  options: BenchmarkOptions
): Promise<BenchmarkResult> {
  const { requests, concurrency } = options
  const latencies: number[] = []

  const startTime = Date.now()

  // Create batches
  const batchSize = Math.ceil(requests / concurrency)
  const batches: Promise<NormalizedContent[][]>[] = []

  for (let i = 0; i < concurrency; i++) {
    const batch: Promise<NormalizedContent[]>[] = []

    for (let j = 0; j < batchSize && batches.length + batch.length < requests; j++) {
      const requestStart = Date.now()

      batch.push(
        adapter.fetchData({ limit: 10 }).then(results => {
          latencies.push(Date.now() - requestStart)
          return results.map(item => adapter.normalize(item))
        })
      )
    }

    batches.push(Promise.all(batch))
  }

  // Execute batches
  const results = await Promise.all(batches)
  const flatResults = results.flat()

  const duration = Date.now() - startTime
  const sortedLatencies = latencies.sort((a, b) => a - b)

  return {
    totalRequests: flatResults.length,
    duration,
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    requestsPerSecond: (flatResults.length / duration) * 1000,
    p50Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0,
    p95Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
    p99Latency: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0
  }
}

// ============================================================
// Assertion Helpers
// ============================================================

/**
 * Assert that normalized content matches Idiomark format
 */
export function assertNormalizedFormat(content: NormalizedContent): void {
  const requiredFields = ['id', 'platform', 'type', 'text', 'timestamp', 'author']

  for (const field of requiredFields) {
    if (!(field in content)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  if (content.author && typeof content.author === 'object') {
    const authorFields = ['id', 'username', 'name']
    for (const field of authorFields) {
      if (!(field in content.author)) {
        throw new Error(`Missing required author field: ${field}`)
      }
    }
  }
}

/**
 * Assert that content is within date range
 */
export function assertDateRange(
  content: NormalizedContent[],
  startDate?: Date,
  endDate?: Date
): void {
  for (const item of content) {
    const timestamp = new Date(item.timestamp)

    if (startDate && timestamp < startDate) {
      throw new Error(`Item ${item.id} is before start date`)
    }

    if (endDate && timestamp > endDate) {
      throw new Error(`Item ${item.id} is after end date`)
    }
  }
}

/**
 * Assert that content does not exceed limit
 */
export function assertLimit(content: NormalizedContent[], limit: number): void {
  if (content.length > limit) {
    throw new Error(`Expected <= ${limit} items, got ${content.length}`)
  }
}

/**
 * Assert that content has unique IDs
 */
export function assertUniqueIds(content: NormalizedContent[]): void {
  const ids = new Set<string>()

  for (const item of content) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate ID found: ${item.id}`)
    }
    ids.add(item.id)
  }
}

// ============================================================
// Test Data Generators
// ============================================================

/**
 * Generate mock normalized content
 */
export function generateMockContent(count: number, platform: string): NormalizedContent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${platform}_mock_${i}`,
    platform,
    type: 'post',
    text: `Mock content ${i} from ${platform}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    author: {
      id: `user_${i}`,
      username: `user${i}`,
      name: `Test User ${i}`
    },
    raw: { mock: true, index: i }
  }))
}

/**
 * Generate mock fetch options
 */
export function generateMockOptions(overrides?: Partial<FetchOptions>): FetchOptions {
  return {
    limit: 100,
    includeReplies: true,
    includeReactions: true,
    ...overrides
  }
}

// ============================================================
// Test Spy
// ============================================================

/**
 * Create a spy for monitoring method calls
 */
export function createSpy<T extends (...args: any[]) => any>(fn?: T) {
  const calls: Array<{ args: Parameters<T>; result: ReturnType<T> }> = []

  const spy = ((...args: Parameters<T>) => {
    const result = fn ? fn(...args) : (undefined as ReturnType<T>)
    calls.push({ args, result })
    return result
  }) as T & {
    calls: typeof calls
    callCount: number
    reset: () => void
  }

  spy.calls = calls
  spy.callCount = 0
  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length
  })

  spy.reset = () => {
    calls.length = 0
  }

  return spy
}

// ============================================================
// Memory Leak Detector
// ====================================================

/**
 * Detect potential memory leaks in adapter
 */
export async function detectMemoryLeaks(
  adapterFactory: () => PlatformAdapter,
  iterations: number = 100
): Promise<{
  hasLeak: boolean
  initialMemory: number
  finalMemory: number
  growth: number
}> {
  if (typeof global.gc !== 'function') {
    throw new Error('Memory leak detection requires --expose-gc flag')
  }

  // Force garbage collection
  global.gc()

  const initialMemory = process.memoryUsage().heapUsed

  // Create and dispose adapters multiple times
  for (let i = 0; i < iterations; i++) {
    const adapter = adapterFactory()
    await adapter.fetchData({ limit: 10 })
    if (adapter.dispose) {
      await adapter.dispose()
    }

    if (i % 10 === 0) {
      global.gc()
    }
  }

  // Final garbage collection
  global.gc()

  const finalMemory = process.memoryUsage().heapUsed
  const growth = finalMemory - initialMemory

  // Consider it a leak if memory grows by more than 10MB
  const hasLeak = growth > 10 * 1024 * 1024

  return {
    hasLeak,
    initialMemory,
    finalMemory,
    growth
  }
}

// ============================================================
// Re-exports
// ============================================================

export { BaseAdapter } from '../base'
export type { AdapterConfig, FetchOptions, NormalizedContent, RawContent } from '../../types'
