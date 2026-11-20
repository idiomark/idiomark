/**
 * Idiomark Response Generator
 *
 * Generates AI responses using personality data from Idiomark files
 */

import type { IdiomarkFile, Personality } from './types'
import { buildResponsePrompt, buildSystemPrompt } from './personality-prompt'

export interface GenerationOptions {
  /** LLM provider to use */
  provider?: 'anthropic' | 'openai' | 'openai-compatible'
  /** API key for the LLM provider */
  apiKey?: string
  /** Model to use */
  model?: string
  /** Maximum tokens for response */
  maxTokens?: number
  /** Temperature for response randomness (0-1) */
  temperature?: number
  /** Custom API endpoint for OpenAI-compatible APIs */
  endpoint?: string
  /** Enable streaming responses */
  stream?: boolean
  /** Conversation history for context */
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  /** User name for personalization */
  userName?: string
  /** Custom task description */
  task?: string
}

export interface GenerationResult {
  content: string
  model: string
  provider: string
  tokens?: {
    input: number
    output: number
  }
  timestamp: string
}

export interface StreamChunk {
  type: 'content' | 'metadata' | 'error' | 'done'
  content?: string
  metadata?: Record<string, any>
  error?: string
  done?: boolean
}

export type StreamCallback = (chunk: StreamChunk) => void

/**
 * Idiomark Response Generator
 */
export class IdiomarkGenerator {
  private options: GenerationOptions & { provider: string; model: string; maxTokens: number }
  private systemPrompt: string

  constructor(
    private personality: Personality,
    options: GenerationOptions = {}
  ) {
    // Optimized for GLM MAX / z.ai - no artificial token caps
    // GLM-4.7: ~131K output tokens, 200K context window
    // Rate limited by request count - maximize throughput per call
    const envMaxTokens = parseInt(process.env.Idiomark_MAX_TOKENS || '', 10)

    const provider = options.provider || 'anthropic'
    const model = options.model || this.getDefaultModel(provider)

    this.options = {
      provider,
      model,
      maxTokens: options.maxTokens || envMaxTokens || 131072,
      temperature: options.temperature ?? 0.7,
      endpoint: options.endpoint ?? '',
      stream: options.stream ?? false,
      history: options.history ?? [],
      userName: options.userName,
      task: options.task,
      apiKey: options.apiKey || this.getDefaultApiKey(provider)
    }
    this.systemPrompt = buildSystemPrompt(this.personality, {
      userName: this.options.userName,
      task: this.options.task
    })
  }

  /**
   * Generate a response to a user message
   */
  async generate(message: string): Promise<GenerationResult> {
    const prompt = buildResponsePrompt(this.personality, message, {
      history: this.options.history,
      userName: this.options.userName,
      task: this.options.task
    })

    switch (this.options.provider) {
      case 'anthropic':
        return this.generateAnthropic(prompt)
      case 'openai':
      case 'openai-compatible':
        return this.generateOpenAI(prompt)
      default:
        throw new Error(`Unknown provider: ${this.options.provider}`)
    }
  }

  /**
   * Generate a streaming response
   */
  async generateStream(
    message: string,
    callback: StreamCallback
  ): Promise<void> {
    const prompt = buildResponsePrompt(this.personality, message, {
      history: this.options.history,
      userName: this.options.userName,
      task: this.options.task
    })

    switch (this.options.provider) {
      case 'anthropic':
        return this.generateStreamAnthropic(prompt, callback)
      case 'openai':
      case 'openai-compatible':
        return this.generateStreamOpenAI(prompt, callback)
      default:
        callback({ type: 'error', error: `Unknown provider: ${this.options.provider}` })
    }
  }

  /**
   * Generate using Anthropic Claude
   */
  private async generateAnthropic(prompt: string): Promise<GenerationResult> {
    if (!this.options.apiKey) {
      throw new Error('API key is required for Anthropic provider')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.options.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.options.model,
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature,
        system: this.systemPrompt,
        messages: this.buildMessages(prompt)
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      model: this.options.model,
      provider: 'anthropic',
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate streaming using Anthropic Claude
   */
  private async generateStreamAnthropic(
    prompt: string,
    callback: StreamCallback
  ): Promise<void> {
    try {
      if (!this.options.apiKey) {
        callback({ type: 'error', error: 'API key is required for Anthropic provider' })
        return
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.options.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
          system: this.systemPrompt,
          messages: this.buildMessages(prompt),
          stream: true
        })
      })

      if (!response.ok) {
        const error = await response.text()
        callback({ type: 'error', error: `Anthropic API error: ${response.status} - ${error}` })
        return
      }

      // Read the stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        callback({ type: 'error', error: 'No response body' })
        return
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              callback({ type: 'done', done: true })
              continue
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                callback({ type: 'content', content: parsed.delta.text })
              } else if (parsed.type === 'message_stop') {
                callback({ type: 'done', done: true })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      callback({ type: 'error', error: String(error) })
    }
  }

  /**
   * Generate using OpenAI (or compatible)
   */
  private async generateOpenAI(prompt: string): Promise<GenerationResult> {
    if (!this.options.apiKey) {
      throw new Error('API key is required for OpenAI provider')
    }

    const endpoint = this.options.endpoint ||
      (this.options.provider === 'openai-compatible' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.options.apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.buildMessages(prompt)
        ],
        max_tokens: this.options.maxTokens,
        temperature: this.options.temperature
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.choices[0].message.content,
      model: this.options.model,
      provider: this.options.provider,
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate streaming using OpenAI (or compatible)
   */
  private async generateStreamOpenAI(
    prompt: string,
    callback: StreamCallback
  ): Promise<void> {
    if (!this.options.apiKey) {
      callback({ type: 'error', error: 'API key is required for OpenAI provider' })
      return
    }

    const endpoint = this.options.endpoint ||
      (this.options.provider === 'openai-compatible' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.options.apiKey}`
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: 'system', content: this.systemPrompt },
            ...this.buildMessages(prompt)
          ],
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
          stream: true
        })
      })

      if (!response.ok) {
        const error = await response.text()
        callback({ type: 'error', error: `OpenAI API error: ${response.status} - ${error}` })
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        callback({ type: 'error', error: 'No response body' })
        return
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              callback({ type: 'done', done: true })
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                callback({ type: 'content', content })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      callback({ type: 'done', done: true })
    } catch (error) {
      callback({ type: 'error', error: String(error) })
    }
  }

  /**
   * Build message array from prompt
   * Handles conversation history
   */
  private buildMessages(prompt: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add history (history is normalized to [] in the constructor)
    for (const msg of this.options.history ?? []) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    // Add current prompt
    messages.push({ role: 'user', content: prompt })

    return messages
  }

  /**
   * Update conversation history
   */
  addHistory(message: { role: 'user' | 'assistant' | 'system'; content: string }): void {
    this.options.history?.push(message)
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.options.history = []
  }

  /**
   * Update the personality
   */
  updatePersonality(personality: Personality): void {
    this.personality = personality
    this.systemPrompt = buildSystemPrompt(this.personality, {
      userName: this.options.userName,
      task: this.options.task
    })
  }

  /**
   * Get default API key from environment
   */
  private getDefaultApiKey(provider: string): string {
    if (provider === 'anthropic') {
      return process.env.ANTHROPIC_API_KEY || ''
    } else if (provider.startsWith('openai')) {
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
    } else if (provider.startsWith('openai')) {
      return 'gpt-4o'
    }
    return 'unknown'
  }
}

/**
 * Convenience function to create a generator from a Idiomark file
 */
export function createGenerator(
  idiomarkFile: IdiomarkFile,
  options?: GenerationOptions
): IdiomarkGenerator {
  return new IdiomarkGenerator(idiomarkFile.personality, options)
}

/**
 * Convenience function to generate a single response
 */
export async function generateResponse(
  personality: Personality,
  message: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const generator = new IdiomarkGenerator(personality, options)
  return generator.generate(message)
}
