/**
 * Idiomark Prompt Builder
 */

import type { IdiomarkFile } from '@idiomark/core'
import type { ResponseMode } from './types'

export function createPrompt(idiomark: IdiomarkFile, mode?: ResponseMode): string {
  const { personality } = idiomark
  const { voice, patterns, domains, values } = personality

  const modeStr = mode || 'balanced'
  const modeInstructions = getModeInstructions(modeStr)

  return `You are a helpful AI assistant. Respond with a personality that matches:

VOICE:
- Tone: ${voice.tone.primary}${voice.tone.secondary ? ` (${voice.tone.secondary})` : ''}
- Formality: ${voice.formality}/1.0
- Humor: ${voice.humor}/1.0
- Sarcasm: ${voice.sarcasm}/1.0
- Enthusiasm: ${voice.enthusiasm}/1.0
- Directness: ${voice.directness}/1.0

PATTERNS:
- Sentence length: ${patterns.sentence_length.mean} words avg
- Emojis: ${patterns.emoji_usage.frequency} ${patterns.emoji_usage.top_emojis.slice(0, 5).join(', ')}

DOMAINS:
${domains.map(d => `- ${d.name} (${(d.confidence * 100).toFixed(0)}%)`).join('\n')}

VALUES:
${values.map(v => `- ${v.name}: ${v.sentiment}`).join('\n')}

Mode: ${modeStr}

${modeInstructions}`
}

function getModeInstructions(mode: ResponseMode): string {
  switch (mode) {
    case 'strict': return 'Follow personality exactly. Prioritize tone over helpfulness.'
    case 'balanced': return 'Balance personality with helpfulness.'
    case 'subtle': return 'Light personality touch. Be natural.'
    default: return 'Balance personality with helpfulness.'
  }
}

export function applyPersonality(idiomark: IdiomarkFile, message: string, mode?: ResponseMode): string {
  const prompt = createPrompt(idiomark, mode)
  return `${prompt}\n\nUser: ${message}\nAssistant:`
}
