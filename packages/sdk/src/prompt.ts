/**
 * Prompt Generator
 *
 * Generates AI prompts with personality injection
 */

import type { IdiomarkFile } from '@idiomark/core'

export function generatePrompt(userQuery: string, idiomarkData: IdiomarkFile): string {
  const personality = idiomarkData.personality

  const voice = personality.voice
  const patterns = personality.patterns
  const domains = personality.domains
  const values = personality.values

  let prompt = `You are an AI assistant with the following personality characteristics:\n\n`

  // Voice characteristics
  prompt += `VOICE:\n`
  prompt += `- Primary tone: ${voice.tone.primary} (confidence: ${(voice.tone.confidence * 100).toFixed(0)}%)\n`
  prompt += `- Formality: ${(voice.formality * 100).toFixed(0)}% (0=casual, 100=formal)\n`
  prompt += `- Humor: ${(voice.humor * 100).toFixed(0)}% (0=serious, 100=very humorous)\n`
  prompt += `- Sarcasm: ${(voice.sarcasm * 100).toFixed(0)}% (0=sincere, 100=heavily sarcastic)\n`
  prompt += `- Enthusiasm: ${(voice.enthusiasm * 100).toFixed(0)}% (0=flat, 100=high energy)\n`
  prompt += `- Directness: ${(voice.directness * 100).toFixed(0)}% (0=euphemistic, 100=blunt)\n\n`

  // Communication patterns
  prompt += `COMMUNICATION PATTERNS:\n`
  prompt += `- Emoji usage: ${patterns.emoji_usage.frequency}\n`
  if (patterns.emoji_usage.top_emojis.length > 0) {
    prompt += `- Top emojis: ${patterns.emoji_usage.top_emojis.join(' ')}\n`
  }
  prompt += `- Typical sentence length: ${patterns.sentence_length.mean} words\n`
  prompt += `- Exclamation frequency: ${(patterns.punctuation.exclamation_frequency * 100).toFixed(0)}%\n\n`

  // Domains
  if (domains.length > 0) {
    const domainList = domains.map(d => `${d.name} (${(d.confidence * 100).toFixed(0)}%)`).join(', ')
    prompt += `DOMAINS OF EXPERTISE: ${domainList}\n\n`
  }

  // Values
  if (values.length > 0) {
    const valueList = values.map(v => `${v.name} (${v.sentiment})`).join(', ')
    prompt += `VALUES AND BELIEFS: ${valueList}\n\n`
  }

  prompt += `INSTRUCTIONS:\n`
  prompt += `1. Stay in character at all times\n`
  prompt += `2. Match the voice and communication patterns specified above\n`
  prompt += `3. Draw upon your domains of expertise when relevant\n`
  prompt += `4. Align your responses with the stated values and beliefs\n`
  prompt += `5. Be authentic to this personality - don't break character\n\n`
  prompt += `User query: ${userQuery}\n\n`
  prompt += `Your response:`

  return prompt
}

export function generateSystemPrompt(idiomarkData: IdiomarkFile): string {
  const personality = idiomarkData.personality
  const voice = personality.voice

  let prompt = `You are an AI with a ${voice.tone.primary} tone. `

  if (voice.formality < 0.3) {
    prompt += `You communicate casually and informally. `
  } else if (voice.formality > 0.7) {
    prompt += `You communicate formally and professionally. `
  }

  if (voice.humor > 0.6) {
    prompt += `You frequently use humor and jokes. `
  }

  if (voice.enthusiasm > 0.7) {
    prompt += `You are high-energy and enthusiastic. `
  }

  return prompt.trim()
}
