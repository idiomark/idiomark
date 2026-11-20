/**
 * Idiomark Client
 *
 * @deprecated Use IdiomarkSDK instead. This class is kept for backward compatibility.
 *
 * Main client for interacting with Idiomark services
 */

import type { IdiomarkClientOptions } from './index'

export class IdiomarkClient {
  private options: Required<IdiomarkClientOptions>

  constructor(options: IdiomarkClientOptions = {}) {
    this.options = {
      apiKey: options.apiKey || process.env.Idiomark_API_KEY || '',
      baseUrl: options.baseUrl || 'https://api.idiomark.protocol',
      model: options.model || 'gpt-4'
    }
  }

  async generate(options: any): Promise<any> {
    const { message, personality, temperature = 0.7, maxTokens = 500 } = options

    // Generate the personality-enhanced prompt
    const { generatePrompt } = require('./prompt')
    const prompt = generatePrompt(message, personality)

    // TODO: Implement actual API call
    // For now, return a mock response
    return {
      response: `[Mock Response] Generated with ${personality.personality?.voice?.tone?.primary || 'default'} tone`,
      personality: {
        tone: personality.personality?.voice?.tone?.primary || 'unknown',
        confidence: personality.personality?.voice?.tone?.confidence || 0
      },
      model: this.options.model
    }
  }

  async loadPersonality(file: string): Promise<any> {
    // TODO: Implement file loading
    throw new Error('Not implemented')
  }

  async validatePersonality(data: any): Promise<boolean> {
    // TODO: Implement validation
    return true
  }
}
