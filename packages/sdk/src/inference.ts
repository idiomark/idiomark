/**
 * Idiomark Inference Manager
 *
 * Handles AI inference with personality injection
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  Personality,
  GenerateOptions,
  GenerateResponse,
  InferenceModel
} from './types'
import { IdiomarkError, IdiomarkErrorCode } from './types'
import { generatePrompt, generateSystemPrompt } from './prompt'

/**
 * Inference manager configuration
 */
export interface InferenceConfig {
  baseURL: string
  apiKey: string
  enableCache: boolean
  timeout: number
  maxRetries: number
  debug: boolean
}

/**
 * Inference request body
 */
interface InferenceRequest {
  message: string
  personality: Personality
  model?: string
  temperature?: number
  max_tokens?: number
  sampling?: 'temperature' | 'top_k' | 'top_p'
}

/**
 * Inference response
 */
interface InferenceResponse {
  response: string
  tone: string
  confidence: number
  model: string
  tokens_used?: number
  duration_ms?: number
}

/**
 * Inference manager for Idiomark
 */
export class Inference {
  private config: InferenceConfig
  private activePersonality: Personality | null = null

  constructor(config: InferenceConfig) {
    this.config = config
  }

  /**
   * Set active personality for responses
   */
  setPersonality(personality: Personality): void {
    this.activePersonality = personality
    this.debug(`Active personality set: ${personality.voice.tone.primary}`)
  }

  /**
   * Clear active personality
   */
  clearPersonality(): void {
    this.activePersonality = null
    this.debug('Active personality cleared')
  }

  /**
   * Get active personality
   */
  getActivePersonality(): Personality | null {
    return this.activePersonality
  }

  /**
   * Generate a response with personality
   */
  async respond(options: GenerateOptions): Promise<GenerateResponse> {
    const {
      message,
      personalityId,
      personality,
      temperature = 0.7,
      maxTokens = 500,
      sampling = 'temperature',
      includeRaw = false
    } = options

    const startTime = Date.now()

    // Use provided personality or fall back to active personality
    const targetPersonality = personality || this.activePersonality

    if (!targetPersonality) {
      throw new IdiomarkError(
        IdiomarkErrorCode.INFERENCE_NOT_AVAILABLE,
        'No personality available for inference'
      )
    }

    this.debug(`Generating response for: ${message.substring(0, 50)}...`)

    try {
      const response = await this.fetchWithRetry('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          personality: targetPersonality,
          temperature,
          max_tokens: maxTokens,
          sampling
        } as InferenceRequest)
      })

      const result = await response.json() as InferenceResponse

      const generateResponse: GenerateResponse = {
        response: result.response,
        tone: result.tone,
        confidence: result.confidence,
        model: result.model,
        tokensUsed: result.tokens_used,
        duration: result.duration_ms || Date.now() - startTime
      }

      if (includeRaw) {
        generateResponse.raw = result
      }

      this.debug(`Response generated in ${generateResponse.duration}ms`)

      return generateResponse
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Generate a response using system prompt (for chat completion APIs)
   */
  async respondWithSystemPrompt(
    message: string,
    personality: Personality,
    model = 'gpt-4',
    temperature = 0.7,
    maxTokens = 500
  ): Promise<GenerateResponse> {
    const startTime = Date.now()

    this.debug(`Generating system prompt response for: ${message.substring(0, 50)}...`)

    try {
      const systemPrompt = generateSystemPrompt({ personality } as IdiomarkFile)

      const response = await this.fetchWithRetry('/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature,
          max_tokens: maxTokens
        })
      })

      const result = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { total_tokens: number }
        model: string
      }

      const content = result.choices[0]?.message.content || ''

      return {
        response: content,
        tone: personality.voice.tone.primary,
        confidence: personality.voice.tone.confidence,
        model: result.model,
        tokensUsed: result.usage?.total_tokens,
        duration: Date.now() - startTime
      }
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Generate a simulated response (fallback when API unavailable)
   */
  async generateSimulatedResponse(message: string): Promise<string> {
    this.debug('Generating simulated response (fallback mode)')

    // Simple simulated responses
    const responses = [
      `I understand you're asking about "${message}". I'd be happy to help with that.`,
      `That's an interesting point about "${message}". Let me share my thoughts.`,
      `Regarding "${message}" - here's what I think about it.`
    ]

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * List available inference models
   */
  async listModels(): Promise<InferenceModel[]> {
    this.debug('Fetching available models')

    try {
      const response = await this.fetchWithRetry('/models')
      const models = await response.json() as InferenceModel[]
      return models
    } catch (error) {
      if (error instanceof IdiomarkError) {
        throw error
      }
      throw IdiomarkError.network(error as Error)
    }
  }

  /**
   * Validate a personality for inference
   */
  validatePersonality(personality: Personality): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!personality.voice) {
      errors.push('Missing voice data')
    } else if (!personality.voice.tone?.primary) {
      errors.push('Missing primary tone')
    }

    if (personality.voice?.tone?.confidence !== undefined &&
        (personality.voice.tone.confidence < 0 || personality.voice.tone.confidence > 1)) {
      errors.push('Voice tone confidence must be between 0 and 1')
    }

    return {
      valid: errors.length === 0,
      errors
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
          await this.delay(Math.pow(2, attempt) * 1000)
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

        if (error instanceof IdiomarkError && !error.retryable) {
          throw error
        }

        if (error instanceof Error && error.name === 'AbortError') {
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
      console.log(`[Idiomark Inference] ${message}`)
    }
  }
}
