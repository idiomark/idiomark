/**
 * Adapter Registry
 *
 * Central registry for discovering, loading, and managing adapters.
 * Supports dynamic loading from npm packages and local directories.
 */

import type { PlatformAdapter } from '../types'
import { BaseAdapter } from './base'

// ============================================================
// Registry Types
// ============================================================

export interface AdapterInfo {
  name: string
  displayName: string
  description?: string
  version: string
  type: 'code' | 'config'
  category: AdapterCategory
  authType: AuthType
  enabled?: boolean
  factory?: (auth?: any) => PlatformAdapter | Promise<PlatformAdapter>
  configPath?: string
  packageName?: string
}

export type AdapterCategory =
  | 'social'
  | 'development'
  | 'communication'
  | 'content'
  | 'commerce'
  | 'analytics'
  | 'other'

export type AuthType =
  | 'none'
  | 'bearer_token'
  | 'oauth2'
  | 'api_key'
  | 'basic'
  | 'custom'

export interface AdapterLoadOptions {
  auth?: any
  config?: Record<string, any>
}

export interface AdapterHealth {
  name: string
  healthy: boolean
  latency?: number
  error?: string
  lastCheck?: Date
}

export interface AdapterMetrics {
  [adapterName: string]: {
    requests: number
    cacheHits: number
    cacheMisses: number
    retries: number
    errors: number
    avgLatency: number
  }
}

// ============================================================
// Adapter Registry
// ============================================================

export class AdapterRegistry {
  private adapters: Map<string, AdapterInfo> = new Map()
  private instances: Map<string, PlatformAdapter> = new Map()
  private healthChecks: Map<string, AdapterHealth> = new Map()

  /**
   * Register an adapter
   */
  register(info: AdapterInfo): void {
    this.adapters.set(info.name, {
      ...info,
      enabled: info.enabled ?? true
    })

    this.emit('register', info)
  }

  /**
   * Register multiple adapters
   */
  registerMany(adapters: AdapterInfo[]): void {
    adapters.forEach(adapter => this.register(adapter))
  }

  /**
   * Unregister an adapter
   */
  unregister(name: string): boolean {
    const removed = this.adapters.delete(name)

    if (removed) {
      this.emit('unregister', { name })
    }

    return removed
  }

  /**
   * Get adapter instance
   */
  async get(name: string, options?: AdapterLoadOptions): Promise<PlatformAdapter> {
    // Check if already instantiated
    if (this.instances.has(name)) {
      return this.instances.get(name)!
    }

    // Load adapter
    const info = this.adapters.get(name)
    if (!info) {
      throw new AdapterNotFoundError(name)
    }

    if (!info.enabled) {
      throw new AdapterDisabledError(name)
    }

    const adapter = await this.loadAdapter(info, options)
    this.instances.set(name, adapter)

    this.emit('load', { name, adapter })

    return adapter
  }

  /**
   * Load adapter from info
   */
  private async loadAdapter(info: AdapterInfo, options?: AdapterLoadOptions): Promise<PlatformAdapter> {
    if (info.factory) {
      return info.factory(options?.auth)
    }

    if (info.packageName) {
      const module = await import(info.packageName)
      const AdapterClass = module.default || module[info.name]
      return new AdapterClass(options?.auth)
    }

    if (info.configPath) {
      return this.loadConfigAdapter(info.configPath, options)
    }

    throw new AdapterLoadError(`Cannot load adapter ${info.name}: no factory, package, or config path`)
  }

  /**
   * Load config-based adapter
   */
  private async loadConfigAdapter(configPath: string, options?: AdapterLoadOptions): Promise<PlatformAdapter> {
    // For now, return a mock - full implementation would parse the config
    return new (class extends BaseAdapter {
      readonly name = 'config'

      async fetchContent() {
        return []
      }

      normalize(raw: any) {
        return raw
      }
    })('config', { name: 'config' })
  }

  /**
   * List all registered adapters
   */
  list(filter?: { category?: AdapterCategory; authType?: AuthType; enabled?: boolean }): AdapterInfo[] {
    let adapters = Array.from(this.adapters.values())

    if (filter) {
      adapters = adapters.filter(adapter => {
        if (filter.category && adapter.category !== filter.category) return false
        if (filter.authType && adapter.authType !== filter.authType) return false
        if (filter.enabled !== undefined && adapter.enabled !== filter.enabled) return false
        return true
      })
    }

    return adapters.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Search adapters by query
   */
  search(query: string): AdapterInfo[] {
    const lowerQuery = query.toLowerCase()

    return Array.from(this.adapters.values()).filter(adapter =>
      adapter.name.toLowerCase().includes(lowerQuery) ||
      adapter.displayName.toLowerCase().includes(lowerQuery) ||
      adapter.description?.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get adapter info
   */
  getInfo(name: string): AdapterInfo | undefined {
    return this.adapters.get(name)
  }

  /**
   * Check if adapter is registered
   */
  has(name: string): boolean {
    return this.adapters.has(name)
  }

  /**
   * Check if adapter is enabled
   */
  isEnabled(name: string): boolean {
    const adapter = this.adapters.get(name)
    return adapter?.enabled ?? false
  }

  /**
   * Enable adapter
   */
  enable(name: string): void {
    const adapter = this.adapters.get(name)
    if (adapter) {
      adapter.enabled = true
      this.emit('enable', { name })
    }
  }

  /**
   * Disable adapter
   */
  disable(name: string): void {
    const adapter = this.adapters.get(name)
    if (adapter) {
      adapter.enabled = false
      this.emit('disable', { name })
    }
  }

  /**
   * Get adapter health
   */
  async healthCheck(name: string): Promise<AdapterHealth> {
    const health: AdapterHealth = {
      name,
      healthy: false,
      lastCheck: new Date()
    }

    try {
      const adapter = await this.get(name)
      const result = adapter.healthCheck ? await adapter.healthCheck() : { healthy: false }

      health.healthy = result.healthy
      health.latency = result.latency
      health.error = result.error
    } catch (error) {
      health.error = error instanceof Error ? error.message : String(error)
    }

    this.healthChecks.set(name, health)
    this.emit('healthCheck', health)

    return health
  }

  /**
   * Health check all adapters
   */
  async healthCheckAll(): Promise<AdapterHealth[]> {
    const names = Array.from(this.adapters.keys())

    const results = await Promise.all(
      names.map(name => this.healthCheck(name))
    )

    return results
  }

  /**
   * Get all adapter metrics
   */
  getAllMetrics(): AdapterMetrics {
    const metrics: AdapterMetrics = {}

    for (const [name, adapter] of this.instances) {
      metrics[name] = adapter.getMetrics ? adapter.getMetrics() : {
        requests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        retries: 0,
        errors: 0,
        avgLatency: 0
      }
    }

    return metrics
  }

  /**
   * Get adapter metrics
   */
  getMetrics(name: string) {
    const adapter = this.instances.get(name)
    return adapter ? (adapter.getMetrics?.() || null) : null
  }

  /**
   * Unload adapter instance
   */
  async unload(name: string): Promise<void> {
    const adapter = this.instances.get(name)
    if (adapter) {
      if (adapter.dispose) {
        await adapter.dispose()
      }
      this.instances.delete(name)
      this.emit('unload', { name })
    }
  }

  /**
   * Unload all adapter instances
   */
  async unloadAll(): Promise<void> {
    const names = Array.from(this.instances.keys())
    await Promise.all(names.map(name => this.unload(name)))
  }

  /**
   * Reset adapter
   */
  async reset(name: string): Promise<void> {
    const adapter = this.instances.get(name)
    if (adapter) {
      if (adapter.reset) {
        await adapter.reset()
      }
      this.emit('reset', { name })
    }
  }

  /**
   * Reset all adapters
   */
  async resetAll(): Promise<void> {
    for (const adapter of this.instances.values()) {
      if (adapter.reset) {
        await adapter.reset()
      }
    }
    this.emit('resetAll')
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalAdapters: this.adapters.size,
      enabledAdapters: Array.from(this.adapters.values()).filter(a => a.enabled).length,
      loadedInstances: this.instances.size,
      healthyAdapters: Array.from(this.healthChecks.values()).filter(h => h.healthy).length
    }
  }

  /**
   * Clear registry
   */
  async clear(): Promise<void> {
    await this.unloadAll()
    this.adapters.clear()
    this.healthChecks.clear()
    this.emit('clear')
  }

  /**
   * Event emitter methods
   */
  private listeners: Map<string, Set<Function>> = new Map()

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return this
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
    return this
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  }
}

// ============================================================
// Registry Errors
// ============================================================

export class AdapterRegistryError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AdapterRegistryError'
  }
}

export class AdapterNotFoundError extends AdapterRegistryError {
  constructor(name: string) {
    super(`Adapter not found: ${name}`, 'ADAPTER_NOT_FOUND')
    this.name = 'AdapterNotFoundError'
  }
}

export class AdapterDisabledError extends AdapterRegistryError {
  constructor(name: string) {
    super(`Adapter is disabled: ${name}`, 'ADAPTER_DISABLED')
    this.name = 'AdapterDisabledError'
  }
}

export class AdapterLoadError extends AdapterRegistryError {
  constructor(message: string) {
    super(message, 'ADAPTER_LOAD_ERROR')
    this.name = 'AdapterLoadError'
  }
}

// ============================================================
// Global Registry Instance
// ============================================================

/**
 * Global adapter registry instance
 */
export const adapterRegistry = new AdapterRegistry()

// ============================================================
// Convenience Functions
// ============================================================

/**
 * Register an adapter
 */
export function registerAdapter(info: AdapterInfo): void {
  adapterRegistry.register(info)
}

/**
 * Register multiple adapters
 */
export function registerAdapters(adapters: AdapterInfo[]): void {
  adapterRegistry.registerMany(adapters)
}

/**
 * Get adapter instance
 */
export async function getAdapter(name: string, auth?: any): Promise<PlatformAdapter> {
  return adapterRegistry.get(name, { auth })
}

/**
 * List all adapters
 */
export function listAdapters(filter?: {
  category?: AdapterCategory
  authType?: AuthType
  enabled?: boolean
}): AdapterInfo[] {
  return adapterRegistry.list(filter)
}

/**
 * Search adapters
 */
export function searchAdapters(query: string): AdapterInfo[] {
  return adapterRegistry.search(query)
}

/**
 * Get adapter health
 */
export async function checkAdapterHealth(name: string): Promise<AdapterHealth> {
  return adapterRegistry.healthCheck(name)
}

/**
 * Create batch processor for multiple adapters
 */
export async function extractFromMultiple(
  sources: Array<{ name: string; auth?: any; options?: any }>,
  options?: { concurrency?: number }
): Promise<Map<string, any>> {
  const results = new Map<string, any>()
  const concurrency = options?.concurrency || 5

  // Process in batches
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency)

    await Promise.all(
      batch.map(async source => {
        try {
          const adapter = await getAdapter(source.name, source.auth)
          const content = adapter.extract ? await adapter.extract(source.options || {}) : await adapter.fetchData(source.options || {})
          results.set(source.name, content)
        } catch (error) {
          console.error(`Failed to extract from ${source.name}:`, error)
          results.set(source.name, [])
        }
      })
    )
  }

  return results
}
