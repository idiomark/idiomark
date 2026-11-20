/**
 * Idiomark Inference Types
 */

import type { IdiomarkFile } from '@idiomark/core'

export type ResponseMode = 'strict' | 'balanced' | 'subtle' | 'custom'

export interface InferenceOptions {
  idiomark: IdiomarkFile
  provider?: 'anthropic' | 'openai' | 'gemini' | 'local' | 'mock'
  mode?: ResponseMode
  apiKey?: string
  cache?: boolean
}

export interface InferenceResponse {
  content: string
  personalityApplied: {
    tone?: { primary: string; secondary?: string; confidence: number }
    formality?: number
    humor?: number
    sarcasm?: number
    emojisUsed?: number
    modeUsed: ResponseMode
  }
  provider: string
  tokensUsed?: number
  cost?: number
}

export interface InferenceMessage {
  content: string
  contextId?: string
}

export interface ConversationContext {
  messages: InferenceMessage[]
  idiomark: IdiomarkFile
  mode: ResponseMode
  preferences?: {
    useEmojis?: boolean
    useCodeExamples?: boolean
    beConcise?: boolean
    addHumor?: boolean
  }
}
