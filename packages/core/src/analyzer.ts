/**
 * Idiomark Personality Analyzer
 *
 * Main class for analyzing personality from text content using LLM
 */

import type {
  Personality,
  Voice,
  Patterns,
  Domain,
  Value,
  Knowledge
} from './types'
import type { TextSample, AnalysisContext } from './prompts'

// Re-export prompt types for convenience
export type { TextSample, AnalysisContext } from './prompts'
import {
  PERSONALITY_ANALYSIS_SYSTEM,
  buildAnalysisPrompt,
  buildChunkAnalysisPrompt,
  buildMergePrompt,
  buildRefinementPrompt,
  buildValidationPrompt
} from './prompts'

export interface AnalysisOptions {
  /** LLM provider to use ('anthropic' | 'openai' | 'mock') */
  provider?: 'anthropic' | 'openai' | 'mock'
  /** API key for the LLM provider (optional, can use environment variable) */
  apiKey?: string
  /** Model to use (e.g., 'claude-3-5-sonnet-20241022') */
  model?: string
  /** Maximum tokens for LLM response */
  maxTokens?: number
  /** Chunk size for large texts (in characters) */
  chunkSize?: number
  /** Enable result caching */
  cache?: boolean
  /** Custom API endpoint (for OpenAI-compatible endpoints) */
  endpoint?: string
}

export interface AnalysisResult {
  personality: Personality
  confidence: number
  metadata: {
    samplesAnalyzed: number
    totalWords: number
    chunksProcessed: number
    provider: string
    model: string
    timestamp: string
  }
}

export interface LLMResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * Cache for storing analysis results
 */
class AnalysisCache {
  private cache = new Map<string, { result: AnalysisResult; timestamp: number }>()
  private readonly TTL = 1000 * 60 * 60 // 1 hour

  set(key: string, result: AnalysisResult): void {
    this.cache.set(key, { result, timestamp: Date.now() })
  }

  get(key: string): AnalysisResult | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.result
  }

  clear(): void {
    this.cache.clear()
  }

  generateKey(samples: TextSample[]): string {
    // Generate a hash-like key from sample content
    const content = samples.map(s => s.text).join('|')
    return Buffer.from(content).toString('base64').substring(0, 32)
  }
}

/**
 * Main personality analyzer class
 */
export class PersonalityAnalyzer {
  private options: Required<AnalysisOptions>
  private cache: AnalysisCache

  constructor(options: AnalysisOptions = {}) {
    // Optimized for GLM MAX / z.ai - large context windows, no artificial token caps
    // GLM-4.7: ~131K output tokens, 200K context window
    // Rate limited by request count, not tokens - maximize per-request throughput
    const envMaxTokens = parseInt(process.env.Idiomark_MAX_TOKENS || '', 10)
    const envChunkSize = parseInt(process.env.Idiomark_CHUNK_SIZE || '', 10)

    this.options = {
      provider: options.provider || 'mock',
      apiKey: options.apiKey || this.getDefaultApiKey(options.provider || 'mock'),
      model: options.model || this.getDefaultModel(options.provider || 'mock'),
      maxTokens: options.maxTokens || envMaxTokens || 131072,
      chunkSize: options.chunkSize || envChunkSize || 200000,
      cache: options.cache !== false,
      endpoint: options.endpoint || ''
    }
    this.cache = new AnalysisCache()
  }

  /**
   * Analyze text samples to extract personality
   */
  async analyze(samples: TextSample[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    // Check cache
    if (this.options.cache) {
      const cached = this.cache.get(this.cache.generateKey(samples))
      if (cached) {
        return cached
      }
    }

    // Prepare context
    const context = this.buildContext(samples)

    // Determine if chunking is needed
    const totalChars = samples.reduce((sum, s) => sum + s.text.length, 0)
    const needsChunking = totalChars > this.options.chunkSize

    let personality: Personality

    if (needsChunking) {
      personality = await this.analyzeWithChunking(samples)
    } else {
      personality = await this.analyzeDirect(context)
    }

    const metadata = {
      samplesAnalyzed: samples.length,
      totalWords: context.totalWordCount,
      chunksProcessed: needsChunking ? Math.ceil(totalChars / this.options.chunkSize) : 1,
      provider: this.options.provider,
      model: this.options.model,
      timestamp: new Date().toISOString()
    }

    const result: AnalysisResult = {
      personality,
      confidence: this.calculateConfidence(personality, samples.length),
      metadata
    }

    // Cache result
    if (this.options.cache) {
      this.cache.set(this.cache.generateKey(samples), result)
    }

    return result
  }

  /**
   * Analyze samples directly (no chunking)
   */
  private async analyzeDirect(context: AnalysisContext): Promise<Personality> {
    const prompt = buildAnalysisPrompt(context)
    const response = await this.callLLM(prompt)
    return this.parsePersonality(response.content)
  }

  /**
   * Analyze samples with chunking (for large texts)
   */
  private async analyzeWithChunking(samples: TextSample[]): Promise<Personality> {
    // Combine all text
    const combinedText = samples.map(s => s.text).join('\n\n---\n\n')
    const chunks = this.chunkText(combinedText, this.options.chunkSize)

    // Analyze each chunk
    const chunkAnalyses: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      const prompt = buildChunkAnalysisPrompt(chunks[i], i, chunks.length)
      const response = await this.callLLM(prompt)
      chunkAnalyses.push(response.content)
    }

    // Merge analyses
    const mergePrompt = buildMergePrompt(chunkAnalyses)
    const mergeResponse = await this.callLLM(mergePrompt)
    return this.parsePersonality(mergeResponse.content)
  }

  /**
   * Refine an existing analysis with additional context
   */
  async refine(
    currentPersonality: Personality,
    additionalContext: string
  ): Promise<Personality> {
    const analysis = JSON.stringify(currentPersonality, null, 2)
    const prompt = buildRefinementPrompt(analysis, additionalContext)
    const response = await this.callLLM(prompt)
    return this.parsePersonality(response.content)
  }

  /**
   * Validate an analysis for quality
   */
  async validate(personality: Personality): Promise<{
    valid: boolean
    issues: string[]
    confidence: number
    recommendations: string[]
  }> {
    const analysis = JSON.stringify(personality, null, 2)
    const prompt = buildValidationPrompt(analysis)
    const response = await this.callLLM(prompt)

    try {
      return JSON.parse(response.content)
    } catch {
      return {
        valid: true,
        issues: [],
        confidence: 0.5,
        recommendations: []
      }
    }
  }

  /**
   * Call the LLM API
   */
  private async callLLM(prompt: string): Promise<LLMResponse> {
    switch (this.options.provider) {
      case 'anthropic':
        return this.callAnthropic(prompt)
      case 'openai':
        return this.callOpenAI(prompt)
      case 'mock':
        return this.callMock(prompt)
      default:
        throw new Error(`Unknown provider: ${this.options.provider}`)
    }
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(prompt: string): Promise<LLMResponse> {
    const apiKey = this.options.apiKey

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: this.options.maxTokens,
          system: PERSONALITY_ANALYSIS_SYSTEM,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Anthropic API error: ${response.status} - ${error}`)
      }

      const data = await response.json()

      return {
        content: data.content[0].text,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Failed to call Anthropic API: ${error}`)
    }
  }

  /**
   * Call OpenAI API (or compatible endpoint)
   */
  private async callOpenAI(prompt: string): Promise<LLMResponse> {
    const apiKey = this.options.apiKey
    const endpoint = this.options.endpoint || 'https://api.openai.com/v1/chat/completions'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: PERSONALITY_ANALYSIS_SYSTEM
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.options.maxTokens,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${response.status} - ${error}`)
      }

      const data = await response.json()

      return {
        content: data.choices[0].message.content,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0
        }
      }
    } catch (error) {
      throw new Error(`Failed to call OpenAI API: ${error}`)
    }
  }

  /**
   * Mock LLM call for testing (returns realistic mock data)
   */
  private async callMock(prompt: string): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    // Generate mock personality data
    const mockPersonality: Personality = {
      voice: {
        tone: {
          primary: 'casual',
          secondary: 'technical',
          confidence: 0.82
        },
        formality: 0.35,
        humor: 0.58,
        sarcasm: 0.42,
        enthusiasm: 0.71,
        directness: 0.63
      },
      patterns: {
        sentence_length: {
          mean: 14.2,
          stddev: 5.8
        },
        paragraph_length: {
          mean: 42.3,
          stddev: 18.7
        },
        emoji_usage: {
          frequency: 'medium',
          top_emojis: ['🚀', '💻', '🔥', '✨', '👍'],
          position: 'end'
        },
        punctuation: {
          exclamation_frequency: 0.18,
          question_frequency: 0.12,
          ellipsis_usage: 'low'
        },
        capitalization: {
          all_caps_frequency: 0.03,
          random_caps: false
        }
      },
      domains: [
        {
          name: 'software_development',
          confidence: 0.91,
          evidence: ['References to React and TypeScript', 'Discussions about architecture patterns']
        },
        {
          name: 'ai/machine_learning',
          confidence: 0.78,
          evidence: ['Comments on LLM capabilities', 'Mentions of model training']
        },
        {
          name: 'open_source',
          confidence: 0.85,
          evidence: ['Contributions to GitHub projects', 'Discussions about licensing']
        }
      ],
      values: [
        { name: 'open_source', sentiment: 'positive', confidence: 0.92 },
        { name: 'developer_experience', sentiment: 'positive', confidence: 0.88 },
        { name: 'privacy', sentiment: 'positive', confidence: 0.81 },
        { name: 'bureaucracy', sentiment: 'negative', confidence: 0.74 },
        { name: 'technical_debt', sentiment: 'negative', confidence: 0.67 }
      ],
      knowledge: {
        frequent_terms: [
          'react', 'typescript', 'api', 'interface', 'component',
          'async', 'await', 'promise', 'function', 'class',
          'llm', 'claude', 'model', 'training', 'inference'
        ],
        mentions: {
          people: ['@anthropic', '@typescript'],
          projects: ['idiomark-protocol', 'react', 'typescript'],
          organizations: ['GitHub', 'Anthropic', 'Microsoft']
        },
        topics: {
          primary: ['software_development', 'web_development', 'ai'],
          secondary: ['open_source', 'developer_tools', 'api_design']
        }
      }
    }

    return {
      content: JSON.stringify(mockPersonality, null, 2),
      usage: {
        inputTokens: prompt.length / 4,
        outputTokens: JSON.stringify(mockPersonality).length / 4
      }
    }
  }

  /**
   * Parse personality from LLM response
   */
  private parsePersonality(content: string): Personality {
    // Try to extract JSON from the response
    let jsonContent = content.trim()

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```')) {
      const lines = jsonContent.split('\n')
      const startIdx = lines[0].includes('json') ? 1 : 1
      const endIdx = lines.findIndex(l => l.trim() === '```')
      jsonContent = lines.slice(startIdx, endIdx === -1 ? undefined : endIdx).join('\n')
    }

    try {
      const parsed = JSON.parse(jsonContent)
      return this.validateAndNormalizePersonality(parsed)
    } catch (error) {
      throw new Error(`Failed to parse personality from LLM response: ${error}`)
    }
  }

  /**
   * Validate and normalize personality data
   */
  private validateAndNormalizePersonality(data: any): Personality {
    // Ensure all required fields exist with valid values
    const personality: Personality = {
      voice: this.normalizeVoice(data.voice || {}),
      patterns: this.normalizePatterns(data.patterns || {}),
      domains: this.normalizeDomains(data.domains || []),
      values: this.normalizeValues(data.values || []),
      knowledge: this.normalizeKnowledge(data.knowledge || {})
    }

    return personality
  }

  private normalizeVoice(data: any): Voice {
    return {
      tone: {
        primary: data.tone?.primary || 'casual',
        secondary: data.tone?.secondary,
        confidence: this.clamp(data.tone?.confidence || 0.5, 0, 1)
      },
      formality: this.clamp(data.formality ?? 0.5, 0, 1),
      humor: this.clamp(data.humor ?? 0.5, 0, 1),
      sarcasm: this.clamp(data.sarcasm ?? 0.5, 0, 1),
      enthusiasm: this.clamp(data.enthusiasm ?? 0.5, 0, 1),
      directness: this.clamp(data.directness ?? 0.5, 0, 1)
    }
  }

  private normalizePatterns(data: any): Patterns {
    return {
      sentence_length: {
        mean: data.sentence_length?.mean ?? 15,
        stddev: data.sentence_length?.stddev ?? 5
      },
      paragraph_length: data.paragraph_length ? {
        mean: data.paragraph_length.mean ?? 50,
        stddev: data.paragraph_length.stddev ?? 20
      } : undefined,
      emoji_usage: {
        frequency: data.emoji_usage?.frequency || 'medium',
        top_emojis: data.emoji_usage?.top_emojis || [],
        position: data.emoji_usage?.position
      },
      punctuation: {
        exclamation_frequency: this.clamp(data.punctuation?.exclamation_frequency ?? 0.1, 0, 1),
        question_frequency: this.clamp(data.punctuation?.question_frequency ?? 0.1, 0, 1),
        ellipsis_usage: data.punctuation?.ellipsis_usage || 'low'
      },
      capitalization: data.capitalization ? {
        all_caps_frequency: this.clamp(data.capitalization.all_caps_frequency ?? 0, 0, 1),
        random_caps: data.capitalization.random_caps ?? false
      } : undefined
    }
  }

  private normalizeDomains(data: any[]): Domain[] {
    return (data || []).map((d: any) => ({
      name: d.name || 'unknown',
      confidence: this.clamp(d.confidence ?? 0.5, 0, 1),
      evidence: d.evidence || []
    }))
  }

  private normalizeValues(data: any[]): Value[] {
    return (data || []).map((v: any) => ({
      name: v.name || 'unknown',
      sentiment: v.sentiment || 'neutral',
      confidence: this.clamp(v.confidence ?? 0.5, 0, 1)
    }))
  }

  private normalizeKnowledge(data: any): Knowledge {
    return {
      frequent_terms: data.frequent_terms || [],
      mentions: {
        people: data.mentions?.people || [],
        projects: data.mentions?.projects || [],
        organizations: data.mentions?.organizations || []
      },
      topics: {
        primary: data.topics?.primary || [],
        secondary: data.topics?.secondary
      }
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Build analysis context from samples
   */
  private buildContext(samples: TextSample[]): AnalysisContext {
    const platforms = [...new Set(samples.map(s => s.platform || 'unknown'))]
    const totalWordCount = samples.reduce(
      (sum, s) => sum + s.text.split(/\s+/).length,
      0
    )

    const timestamps = samples
      .map(s => s.timestamp)
      .filter((t): t is string => t !== undefined)
      .sort()

    const dateRange = {
      from: timestamps[0] || new Date().toISOString(),
      to: timestamps[timestamps.length - 1] || new Date().toISOString()
    }

    return { samples, totalWordCount, dateRange, platforms }
  }

  /**
   * Split text into chunks
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    let currentPos = 0

    while (currentPos < text.length) {
      let endPos = currentPos + chunkSize

      // Try to break at a sentence boundary
      if (endPos < text.length) {
        const sentenceEnd = text.lastIndexOf('. ', endPos)
        const paragraphEnd = text.lastIndexOf('\n\n', endPos)

        if (paragraphEnd > currentPos && paragraphEnd > endPos - 500) {
          endPos = paragraphEnd + 2
        } else if (sentenceEnd > currentPos && sentenceEnd > endPos - 300) {
          endPos = sentenceEnd + 2
        }
      }

      chunks.push(text.slice(currentPos, endPos).trim())
      currentPos = endPos
    }

    return chunks.filter(c => c.length > 0)
  }

  /**
   * Calculate confidence score based on sample size and analysis quality
   */
  private calculateConfidence(personality: Personality, sampleCount: number): number {
    // Base confidence on sample count (diminishing returns)
    const sampleConfidence = Math.min(0.5 + Math.log10(sampleCount) * 0.15, 0.95)

    // Factor in tone confidence
    const toneConfidence = personality.voice.tone.confidence

    // Factor in domain confidence
    const avgDomainConfidence =
      personality.domains.length > 0
        ? personality.domains.reduce((sum, d) => sum + d.confidence, 0) / personality.domains.length
        : 0.5

    // Combine with weights
    return (sampleConfidence * 0.4 + toneConfidence * 0.3 + avgDomainConfidence * 0.3)
  }

  /**
   * Get default API key from environment
   */
  private getDefaultApiKey(provider: string): string {
    if (provider === 'anthropic') {
      return process.env.ANTHROPIC_API_KEY || ''
    } else if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || ''
    }
    return ''
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: string): string {
    if (provider === 'anthropic') {
      return 'claude-3-5-sonnet-20241022'
    } else if (provider === 'openai') {
      return 'gpt-4o'
    }
    return 'mock'
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Utility function to create text samples from raw content
 */
export function createTextSamples(
  content: Array<{ text: string; timestamp?: string; platform?: string }>
): TextSample[] {
  return content.map((item, index) => ({
    id: `sample_${index}_${Date.now()}`,
    text: item.text,
    timestamp: item.timestamp,
    platform: item.platform
  }))
}

/**
 * Utility function to analyze text content directly
 */
export async function analyzeText(
  text: string | string[],
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  const analyzer = new PersonalityAnalyzer(options)

  const samples = Array.isArray(text)
    ? text.map((t, i) => ({ id: `sample_${i}`, text: t }))
    : [{ id: 'sample_0', text }]

  return analyzer.analyze(samples)
}
