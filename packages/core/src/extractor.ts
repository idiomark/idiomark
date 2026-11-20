/**
 * Idiomark Extractor
 *
 * Main class for extracting personality data from platforms
 */

import type {
  IdiomarkFile,
  IdiomarkResult,
  ExtractionOptions,
  NormalizedContent,
  PlatformAdapter,
  RawContent
} from './types'
import {
  PersonalityAnalyzer,
  createTextSamples,
  type AnalysisOptions,
  type AnalysisResult
} from './analyzer'
import { promises as fs } from 'fs'
import { join } from 'path'

// Platform adapter package mapping
const ADAPTER_PACKAGES: Record<string, string> = {
  github: '@idiomark/adapter-github',
  twitter: '@idiomark/adapter-twitter',
  reddit: '@idiomark/adapter-reddit',
  discord: '@idiomark/adapter-discord',
  youtube: '@idiomark/adapter-youtube',
  linkedin: '@idiomark/adapter-linkedin'
}

export class IdiomarkExtractor {
  private options: ExtractionOptions
  private analysisOptions: AnalysisOptions
  private adapters: Map<string, PlatformAdapter> = new Map()

  constructor(
    options: ExtractionOptions,
    analysisOptions?: AnalysisOptions
  ) {
    this.options = options
    this.analysisOptions = analysisOptions || {
      provider: 'mock', // Default to mock for now
      cache: true
    }
  }

  /**
   * Extract personality from pre-normalized content
   */
  async extractFromContent(
    content: NormalizedContent[]
  ): Promise<IdiomarkResult> {
    const { sources, sampleSize, verbose } = this.options

    if (verbose) {
      console.log(`Extracting personality from ${content.length} content items...`)
    }

    // Convert normalized content to text samples
    const samples = createTextSamples(
      content.map(item => ({
        text: item.text,
        timestamp: item.timestamp,
        platform: item.platform
      }))
    )

    // Analyze personality
    const analyzer = new PersonalityAnalyzer(this.analysisOptions)
    const analysisResult = await analyzer.analyze(samples)

    if (verbose) {
      console.log(`Analysis complete. Confidence: ${analysisResult.confidence.toFixed(2)}`)
    }

    // Build Idiomark file
    const file: IdiomarkFile = {
      idiomark: '1.0.0',
      id: `idiomark_${this.generateId()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: {
        entity: {
          type: 'human',
          name: content[0]?.author?.name,
          sources: sources
        },
        extraction: {
          date: new Date().toISOString(),
          sample_size: content.length,
          timeframe: this.calculateTimeframe(content)
        },
        validator: this.analysisOptions.provider
      },
      personality: analysisResult.personality
    }

    return {
      file,
      metadata: {
        sampleSize: content.length,
        timeframe: this.formatTimeframe(file.metadata.extraction.timeframe),
        sources
      },
      confidence: analysisResult.confidence,
      save: async (path: string) => this.saveIdiomarkFile(file, path, verbose)
    }
  }

  /**
   * Extract personality from raw text strings
   */
  async extractFromText(
    texts: string[],
    metadata?: { platform?: string; timestamps?: string[] }
  ): Promise<IdiomarkResult> {
    const { sources, sampleSize, verbose } = this.options

    if (verbose) {
      console.log(`Extracting personality from ${texts.length} text samples...`)
    }

    // Convert text to samples
    const samples = texts.map((text, index) => ({
      id: `sample_${index}`,
      text,
      timestamp: metadata?.timestamps?.[index],
      platform: metadata?.platform || sources[0] || 'unknown'
    }))

    // Analyze personality
    const analyzer = new PersonalityAnalyzer(this.analysisOptions)
    const analysisResult = await analyzer.analyze(samples)

    if (verbose) {
      console.log(`Analysis complete. Confidence: ${analysisResult.confidence.toFixed(2)}`)
    }

    // Build Idiomark file
    const timestamps = metadata?.timestamps || []
    const file: IdiomarkFile = {
      idiomark: '1.0.0',
      id: `idiomark_${this.generateId()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: {
        entity: {
          type: 'human',
          sources
        },
        extraction: {
          date: new Date().toISOString(),
          sample_size: texts.length,
          timeframe: {
            from: timestamps[0] || new Date().toISOString(),
            to: timestamps[timestamps.length - 1] || new Date().toISOString()
          }
        },
        validator: this.analysisOptions.provider
      },
      personality: analysisResult.personality
    }

    return {
      file,
      metadata: {
        sampleSize: texts.length,
        timeframe: this.formatTimeframe(file.metadata.extraction.timeframe),
        sources
      },
      confidence: analysisResult.confidence,
      save: async (path: string) => this.saveIdiomarkFile(file, path, verbose)
    }
  }

  /**
   * Main extract method - fetches from platform adapters and analyzes personality
   */
  async extract(): Promise<IdiomarkResult> {
    const { sources, sampleSize, verbose, auth, startDate, endDate } = this.options

    if (verbose) {
      console.log(`Extracting from sources: ${sources.join(', ')}`)
    }

    // 1. Initialize platform adapters based on sources
    const allContent: NormalizedContent[] = []

    for (const source of sources) {
      try {
        if (verbose) {
          console.log(`Initializing adapter for: ${source}`)
        }

        const adapter = await this.getAdapter(source, auth?.[source])
        if (!adapter) {
          console.warn(`No adapter found for source: ${source}, skipping...`)
          continue
        }

        // Authenticate with the platform
        const authenticated = await adapter.authenticate()
        if (!authenticated) {
          console.warn(`Authentication failed for ${source}, skipping...`)
          continue
        }

        // 2. Fetch content from the platform (prefer extract() which has caching/retry)
        if (verbose) {
          console.log(`Fetching content from ${source}...`)
        }

        const fetchOptions: {
          limit?: number
          startDate?: Date
          endDate?: Date
          includeReplies?: boolean
        } = {
          limit: Math.ceil(sampleSize / sources.length), // Distribute limit across sources
        }

        if (startDate) fetchOptions.startDate = startDate
        if (endDate) fetchOptions.endDate = endDate

        let normalized: NormalizedContent[]

        // Use adapter.extract() if available (includes caching, rate limiting, retry)
        if (typeof adapter.extract === 'function') {
          normalized = await adapter.extract(fetchOptions)
        } else {
          // Fall back to fetchData + normalize
          const rawContent = await adapter.fetchData(fetchOptions)
          normalized = rawContent.map(item => adapter.normalize(item))
        }

        if (verbose) {
          console.log(`Fetched ${normalized.length} items from ${source}`)
        }

        allContent.push(...normalized)

      } catch (error) {
        console.error(`Failed to extract from ${source}:`, error)
        // Continue with other sources even if one fails
      }
    }

    // If no content was fetched, fall back to mock
    if (allContent.length === 0) {
      if (verbose) {
        console.warn('No content fetched from any source, returning mock result')
      }
      return this.getMockResult()
    }

    // 4. Pass to extractFromContent for analysis
    return this.extractFromContent(allContent)
  }

  /**
   * Get adapter instance for a platform
   */
  private async getAdapter(platform: string, auth?: any): Promise<PlatformAdapter | null> {
    // Check if already cached
    if (this.adapters.has(platform)) {
      return this.adapters.get(platform)!
    }

    try {
      // Try to dynamically import the adapter package
      const packageName = ADAPTER_PACKAGES[platform]
      if (!packageName) {
        console.warn(`Unknown platform: ${platform}`)
        return null
      }

      // Dynamic import of adapter package
      const adapterModule = await import(packageName)

      // Get the adapter class (could be default export or named export matching platform name)
      const AdapterClass = adapterModule.default ||
                         adapterModule[`${platform.charAt(0).toUpperCase() + platform.slice(1)}Adapter`]

      if (!AdapterClass) {
        console.warn(`Adapter class not found in ${packageName}`)
        return null
      }

      // Create adapter instance with auth
      const adapter = new AdapterClass(auth)

      // Cache the adapter
      this.adapters.set(platform, adapter)

      return adapter
    } catch (error) {
      // Adapter package not installed or other error
      if ((error as any).code === 'MODULE_NOT_FOUND' || (error as any).code === 'ERR_MODULE_NOT_FOUND') {
        console.warn(`Adapter package for ${platform} not found. Install ${ADAPTER_PACKAGES[platform]} to enable.`)
      } else {
        console.error(`Error loading adapter for ${platform}:`, error)
      }
      return null
    }
  }

  /**
   * Generate a mock result when no content is available
   */
  private getMockResult(): IdiomarkResult {
    const { sources, sampleSize, verbose } = this.options

    const file: IdiomarkFile = {
      idiomark: '1.0.0',
      id: `idiomark_${this.generateId()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: {
        entity: {
          type: 'human',
          sources
        },
        extraction: {
          date: new Date().toISOString(),
          sample_size: sampleSize,
          timeframe: {
            from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString()
          }
        }
      },
      personality: {
        voice: {
          tone: {
            primary: 'casual',
            confidence: 0.75
          },
          formality: 0.3,
          humor: 0.6,
          sarcasm: 0.4,
          enthusiasm: 0.7,
          directness: 0.5
        },
        patterns: {
          sentence_length: {
            mean: 12.5,
            stddev: 4.2
          },
          emoji_usage: {
            frequency: 'medium',
            top_emojis: ['🚀', '💻', '🔥']
          },
          punctuation: {
            exclamation_frequency: 0.15,
            question_frequency: 0.08,
            ellipsis_usage: 'low'
          }
        },
        domains: [
          { name: 'technology', confidence: 0.85 },
          { name: 'programming', confidence: 0.78 }
        ],
        values: [
          { name: 'open_source', sentiment: 'positive', confidence: 0.9 },
          { name: 'privacy', sentiment: 'positive', confidence: 0.82 }
        ],
        knowledge: {
          frequent_terms: ['react', 'typescript', 'ai'],
          mentions: {
            people: [],
            projects: ['idiomark-protocol'],
            organizations: []
          },
          topics: {
            primary: ['software_development'],
            secondary: ['ai', 'crypto']
          }
        }
      }
    }

    return {
      file,
      metadata: {
        sampleSize,
        timeframe: '90 days',
        sources
      },
      confidence: 0.5, // Lower confidence for mock data
      save: async (path: string) => this.saveIdiomarkFile(file, path, verbose)
    }
  }

  /**
   * Save Idiomark file to disk
   */
  private async saveIdiomarkFile(
    file: IdiomarkFile,
    path: string,
    verbose: boolean
  ): Promise<void> {
    try {
      const dir = join(process.cwd(), path)
      await fs.mkdir(dir, { recursive: true })

      const filename = `${file.id}.idiomark.json`
      const filepath = join(dir, filename)

      await fs.writeFile(
        filepath,
        JSON.stringify(file, null, 2),
        'utf-8'
      )

      if (verbose) {
        console.log(`Saved Idiomark file to: ${filepath}`)
      }
    } catch (error) {
      throw new Error(`Failed to save Idiomark file: ${error}`)
    }
  }

  /**
   * Calculate timeframe from content
   */
  private calculateTimeframe(content: NormalizedContent[]): {
    from: string
    to: string
  } {
    const timestamps = content
      .map(c => new Date(c.timestamp).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b)

    if (timestamps.length === 0) {
      const now = Date.now()
      return {
        from: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date(now).toISOString()
      }
    }

    return {
      from: new Date(timestamps[0]).toISOString(),
      to: new Date(timestamps[timestamps.length - 1]).toISOString()
    }
  }

  /**
   * Format timeframe for display
   */
  private formatTimeframe(timeframe: { from: string; to: string }): string {
    const from = new Date(timeframe.from)
    const to = new Date(timeframe.to)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

    return `${days} days`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15)
  }
}

/**
 * Convenience function to extract personality from a single text string
 */
export async function extractFromTextString(
  text: string,
  options?: {
    sources?: string[]
    verbose?: boolean
    analysisOptions?: AnalysisOptions
  }
): Promise<IdiomarkResult> {
  const extractor = new IdiomarkExtractor(
    {
      sources: options?.sources || ['text'],
      sampleSize: 1,
      verbose: options?.verbose || false
    },
    options?.analysisOptions
  )

  return extractor.extractFromText([text])
}

/**
 * Convenience function to extract personality from multiple text strings
 */
export async function extractFromTextStrings(
  texts: string[],
  options?: {
    sources?: string[]
    timestamps?: string[]
    verbose?: boolean
    analysisOptions?: AnalysisOptions
  }
): Promise<IdiomarkResult> {
  const extractor = new IdiomarkExtractor(
    {
      sources: options?.sources || ['text'],
      sampleSize: texts.length,
      verbose: options?.verbose || false
    },
    options?.analysisOptions
  )

  return extractor.extractFromText(texts, {
    timestamps: options?.timestamps
  })
}

/**
 * Convenience function to extract personality from multiple platforms
 * Automatically handles adapter loading and authentication
 */
export async function extractFromPlatforms(
  config: {
    sources: string[]
    auth?: Record<string, any>
    sampleSize?: number
    startDate?: Date
    endDate?: Date
    verbose?: boolean
    analysisOptions?: AnalysisOptions
  }
): Promise<IdiomarkResult> {
  const extractor = new IdiomarkExtractor(
    {
      sources: config.sources,
      sampleSize: config.sampleSize || 100,
      verbose: config.verbose || false,
      auth: config.auth,
      startDate: config.startDate,
      endDate: config.endDate
    },
    config.analysisOptions
  )

  return extractor.extract()
}

/**
 * Get list of supported platforms and their adapter package names
 */
export function getSupportedPlatforms(): Record<string, string> {
  return { ...ADAPTER_PACKAGES }
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
  return platform in ADAPTER_PACKAGES
}

/**
 * Get the adapter package name for a platform
 */
export function getAdapterPackage(platform: string): string | undefined {
  return ADAPTER_PACKAGES[platform]
}
