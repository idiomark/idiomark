/**
 * Idiomark Adapter Framework
 *
 * Main entry point for adapter functionality.
 * Exports base classes, templates, registry, and testing utilities.
 */

// Base adapter
export {
  BaseAdapter,
  RateLimiter,
  CacheManager,
  RetryHandler,
  AuthManager,
  ErrorHandler,
  MetricsCollector,
  sleep
} from './base'

export type {
  AdapterConfig,
  RateLimiterConfig,
  CacheConfig,
  RetryConfig,
  ExtractionProgress,
  AdapterHealth,
  AdapterMetrics,
  RateLimitStatus,
  CacheStats,
  RetryStats,
  AuthConfig,
  AuthType
} from './base'

// Registry
export {
  AdapterRegistry,
  adapterRegistry,
  registerAdapter,
  registerAdapters,
  getAdapter,
  listAdapters,
  searchAdapters,
  checkAdapterHealth,
  extractFromMultiple
} from './registry'

export type {
  AdapterInfo,
  AdapterCategory,
  AdapterLoadOptions,
  AdapterHealth as RegistryAdapterHealth,
  AdapterMetrics as RegistryAdapterMetrics
} from './registry'

export {
  AdapterRegistryError,
  AdapterNotFoundError,
  AdapterDisabledError,
  AdapterLoadError
} from './registry'

// Templates
export {
  RESTAdapterTemplate,
  createRESTAdapter
} from './templates/rest'

export type {
  RESTConfig,
  RequestConfig,
  ApiResponse,
  PaginationInfo,
  LinksInfo,
  MetaInfo
} from './templates/rest'

// Testing
export {
  createMockServer,
  createAdapterTestSuite,
  benchmarkAdapter,
  assertNormalizedFormat,
  assertDateRange,
  assertLimit,
  assertUniqueIds,
  generateMockContent,
  generateMockOptions,
  createSpy,
  detectMemoryLeaks
} from './testing/index'

export type {
  MockRoute,
  MockServerConfig,
  MockServerInstance,
  TestSuiteOptions,
  BenchmarkOptions,
  BenchmarkResult
} from './testing/index'
