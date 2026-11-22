/**
 * Idiomark Inference Engine
 */

import type { IdiomarkFile } from '@idiomark/core'
import type { InferenceOptions, InferenceResponse, ResponseMode, ConversationContext } from './types'
import { createPrompt } from './prompts'

export class InferenceEngine {
  private idiomark: IdiomarkFile
  private provider: NonNullable<InferenceOptions['provider']>
  private mode: ResponseMode
  private context?: ConversationContext
  private cache = new Map<string, InferenceResponse>()

  constructor(options: InferenceOptions) {
    this.idiomark = options.idiomark
    this.provider = options.provider || 'mock'
    this.mode = options.mode || 'balanced'
  }

  async respond(message: string): Promise<InferenceResponse> {
    const cacheKey = `${message}-${this.mode}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const { personality } = this.idiomark
    const response = this.generateMockResponse(message)

    this.cache.set(cacheKey, response)
    return response
  }

  private generateMockResponse(message: string): InferenceResponse {
    const { personality } = this.idiomark
    const { voice, patterns } = personality

    const emojis = patterns.emoji_usage.top_emojis.slice(0, 3)
    const emojiStr = emojis.join(' ')

    const responses = {
      casual: `Sure thing! ${emojiStr} Here's what I know about ${message.toLowerCase()}...`,
      formal: `I understand your inquiry regarding ${message}. Allow me to provide assistance.`,
      humorous: `Ha! Good question! ${emojiStr} Let me break it down for you...`,
      technical: `Got it. Here's the technical breakdown of ${message.toLowerCase()}:`
    }

    const tone = voice.tone.primary
    const content = responses[tone as keyof typeof responses] || responses.casual

    return {
      content,
      personalityApplied: {
        tone: voice.tone,
        formality: voice.formality,
        humor: voice.humor,
        sarcasm: voice.sarcasm,
        emojisUsed: patterns.emoji_usage.top_emojis.length,
        modeUsed: this.mode
      },
      provider: this.provider,
      tokensUsed: Math.floor(Math.random() * 500) + 100,
      cost: Math.random() * 0.01
    }
  }

  setPersonality(idiomark: IdiomarkFile): void {
    this.idiomark = idiomark
    this.cache.clear()
  }

  setMode(mode: ResponseMode): void {
    this.mode = mode
  }

  setContext(context: ConversationContext): void {
    this.context = context
  }

  clearContext(): void {
    this.context = undefined
  }

  getContext() {
    return this.context
  }
}
