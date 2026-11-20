/**
 * REST API Adapter Template
 *
 * For standard REST APIs with JSON responses.
 * Features:
 * - Automatic pagination
 * - Query building
 * - Response parsing
 * - Auth header management
 */

import { BaseAdapter, type AdapterConfig } from '../base'
import type { PlatformAdapter, NormalizedContent, FetchOptions, RawContent } from '../../types'

// ============================================================
// Template Types
// ============================================================

export interface RESTConfig extends AdapterConfig {
  baseURL: string
  headers?: Record<string, string>
  defaultLimit?: number
}

export interface RequestConfig {
  endpoint: string
  params?: Record<string, any>
  options?: RequestInit
}

export interface ApiResponse<T = any> {
  data?: T
  items?: T[]
  pagination?: PaginationInfo
  links?: LinksInfo
  meta?: MetaInfo
  error?: {
    message: string
    code?: string
  }
}

export interface PaginationInfo {
  page?: number
  perPage?: number
  totalPages?: number
  totalItems?: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface LinksInfo {
  next?: string
  prev?: string
  first?: string
  last?: string
}

export interface MetaInfo {
  has_more?: boolean
  next_cursor?: string
  next_token?: string
  total?: number
}

// ============================================================
// REST API Template
// ============================================================

/**
 * REST API Adapter Template
 *
 * Extend this class for standard REST APIs.
 */
export abstract class RESTAdapterTemplate extends BaseAdapter implements PlatformAdapter {
  protected abstract baseURL: string
  protected abstract endpoints: Record<string, string>

  protected defaultLimit: number = 100
  protected headers: Record<string, string> = {}

  constructor(name: string, config?: Partial<RESTConfig>) {
    super(name, {
      name,
      ...(config || {}),
      rateLimiter: config?.rateLimiter || { maxRequests: 100, windowDuration: 60000 },
      cache: config?.cache || { enabled: true, ttl: 300000 }
    })

    if (config?.baseURL) {
      (this as any).baseURL = config.baseURL
    }

    if (config?.headers) {
      this.headers = config.headers
    }

    if (config?.defaultLimit) {
      this.defaultLimit = config.defaultLimit
    }
  }

  // ============================================================
  // Abstract methods (implement in subclass)
  // ============================================================

  /**
   * Get the primary endpoint to fetch from
   */
  protected abstract getEndpoint(options: FetchOptions): string

  /**
   * Map response items to RawContent
   */
  protected abstract mapResponseItem(item: any): RawContent

  // ============================================================
  // Fetch Implementation
  // ============================================================

  /**
   * Default fetch implementation with pagination
   */
  async fetchContent(options: FetchOptions): Promise<RawContent[]> {
    const results: RawContent[] = []
    const limit = options.limit || this.defaultLimit

    let page = 1
    let hasMore = true
    let nextUrl: string | undefined

    while (hasMore && results.length < limit) {
      const response = await this.makeRequest({
        endpoint: nextUrl || this.buildEndpointPath(options, page),
        params: this.buildRequestParams(options, page)
      })

      // Handle different response formats
      const items = this.extractItems(response)

      // Map items to RawContent
      const mappedItems = items.map(item => this.mapResponseItem(item))
      results.push(...mappedItems.slice(0, limit - results.length))

      // Check for more pages
      hasMore = this.hasMorePages(response, items.length)
      nextUrl = this.getNextUrl(response)
      page++
    }

    return results
  }

  /**
   * Make authenticated request to API
   */
  protected async makeRequest(config: RequestConfig): Promise<ApiResponse> {
    // Rate limit
    await this.rateLimiter.throttle(config.endpoint)

    // Build URL
    const url = this.buildURL(config.endpoint, config.params)

    // Build headers
    const headers = await this.getRequestHeaders()

    const start = Date.now()

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          ...this.headers
        },
        ...config.options
      })

      const latency = Date.now() - start
      this.metrics.recordLatency(latency)
      this.metrics.increment('requests')

      // Update rate limits from headers
      this.rateLimiter.updateFromHeaders(response.headers, config.endpoint)

      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      const data = await response.json()
      return data
    } catch (error) {
      this.metrics.increment('errors')
      throw this.errorHandler.handle(error)
    }
  }

  // ============================================================
  // URL Building
  // ============================================================

  /**
   * Build full URL from endpoint and params
   */
  protected buildURL(endpoint: string, params?: Record<string, any>): string {
    // Check if endpoint is already a full URL
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      const url = new URL(endpoint)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }
      return url.toString()
    }

    const url = new URL(endpoint, this.baseURL)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  /**
   * Build endpoint path (override for custom patterns)
   */
  protected buildEndpointPath(options: FetchOptions, page: number): string {
    return this.getEndpoint(options)
  }

  /**
   * Build request params from fetch options
   */
  protected buildRequestParams(options: FetchOptions, page: number): Record<string, any> {
    const params: Record<string, any> = {}

    // Pagination
    params.page = page
    params.per_page = Math.min(this.defaultLimit, (options.limit || 100))

    // Date range
    if (options.startDate) {
      params.since = options.startDate.toISOString()
    }

    if (options.endDate) {
      params.until = options.endDate.toISOString()
    }

    return params
  }

  /**
   * Get request headers (includes auth if configured)
   */
  protected async getRequestHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Idiomark-Protocol/1.0'
    }

    // Add auth headers if auth manager is configured
    const authHeaders = await this.auth.getHeaders()
    Object.assign(headers, authHeaders)

    return headers
  }

  // ============================================================
  // Response Handling
  // ============================================================

  /**
   * Extract items array from response
   * Handles various response formats
   */
  protected extractItems(response: ApiResponse): any[] {
    if (Array.isArray(response)) {
      return response
    }

    if (Array.isArray(response.data)) {
      return response.data
    }

    if (Array.isArray(response.items)) {
      return response.items
    }

    // Try common nested paths
    const paths = [
      'data.items',
      'data.results',
      'results',
      'items',
      'data'
    ]

    for (const path of paths) {
      const value = this.getNestedValue(response, path)
      if (Array.isArray(value)) {
        return value
      }
    }

    return []
  }

  /**
   * Check if response has more pages
   */
  protected hasMorePages(response: ApiResponse, itemsLength: number): boolean {
    // Check various pagination indicators
    if (response.pagination?.hasNext !== undefined) {
      return response.pagination.hasNext
    }

    if (response.meta?.has_more !== undefined) {
      return response.meta.has_more
    }

    if (response.links?.next) {
      return true
    }

    if (response.meta?.next_cursor || response.meta?.next_token) {
      return true
    }

    // Assume no more pages if we got less items than requested
    return itemsLength >= this.defaultLimit
  }

  /**
   * Get next page URL
   */
  protected getNextUrl(response: ApiResponse): string | undefined {
    return response.links?.next
  }

  /**
   * Handle error response
   */
  protected async handleErrorResponse(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000
      await this.rateLimiter.throttle()
      throw new Error(`Rate limited. Retry after ${waitTime}ms`)
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed: ${response.statusText}`)
    }

    if (response.status === 404) {
      throw new Error(`Resource not found: ${response.url}`)
    }

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.statusText}`)
    }

    throw new Error(`Request failed: ${response.statusText}`)
  }

  // ============================================================
  // Utilities
  // ============================================================

  /**
   * Get nested value from object using dot notation
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Interpolate URL parameters
   * e.g., "/users/{username}/repos" -> "/users/john/repos"
   */
  protected interpolateUrl(url: string, params: Record<string, any>): string {
    return url.replace(/\{([^}]+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match
    })
  }

  /**
   * Parse date string to ISO format
   */
  protected parseDate(date: string | number | Date): string {
    if (typeof date === 'number') {
      // Assume Unix timestamp
      return new Date(date * 1000).toISOString()
    }

    if (date instanceof Date) {
      return date.toISOString()
    }

    // Try parsing as string
    const parsed = new Date(date)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }

    return new Date().toISOString()
  }

  /**
   * Extract username from author object
   */
  protected extractUsername(author: any): string {
    return author?.username ||
           author?.login ||
           author?.handle ||
           author?.id ||
           'unknown'
  }

  /**
   * Extract name from author object
   */
  protected extractName(author: any): string {
    return author?.name ||
           author?.display_name ||
           author?.full_name ||
           this.extractUsername(author)
  }

  /**
   * Extract ID from author object
   */
  protected extractAuthorId(author: any): string {
    return String(
      author?.id ||
      author?.user_id ||
      author?.username ||
      'unknown'
    )
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create a REST adapter from config
 */
export function createRESTAdapter(config: {
  name: string
  baseURL: string
  endpoints: Record<string, string>
  getEndpoint: (options: FetchOptions) => string
  mapResponseItem: (item: any) => RawContent
  headers?: Record<string, string>
}): new (auth?: any) => RESTAdapterTemplate {
  return class extends RESTAdapterTemplate {
    protected baseURL = config.baseURL
    protected endpoints = config.endpoints

    protected getEndpoint(options: FetchOptions): string {
      return config.getEndpoint(options)
    }

    protected mapResponseItem(item: any): RawContent {
      return config.mapResponseItem(item)
    }

    normalize(raw: RawContent): NormalizedContent {
      return raw as unknown as NormalizedContent
    }
  }
}
