import type { Patterns, Voice } from './types'

/**
 * Analyze text patterns for personality extraction
 */
export function analyzeTextPatterns(text: string): Patterns {
  const sentences = extractSentences(text)
  const words = extractWords(text)
  const emojis = extractEmojis(text)

  return {
    sentence_length: calculateSentenceStats(sentences),
    emoji_usage: analyzeEmojiUsage(emojis),
    punctuation: analyzePunctuation(text),
    capitalization: analyzeCapitalization(text)
  }
}

function extractSentences(text: string): string[] {
  // Split on sentence-ending punctuation
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function extractWords(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
}

function extractEmojis(text: string): string[] {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu
  return text.match(emojiRegex) || []
}

function calculateSentenceStats(sentences: string[]): { mean: number; stddev: number } {
  if (sentences.length === 0) return { mean: 0, stddev: 0 }

  const lengths = sentences.map(s => s.split(/\s+/).length)
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length
  const stddev = Math.sqrt(variance)

  return { mean: Math.round(mean * 10) / 10, stddev: Math.round(stddev * 10) / 10 }
}

function analyzeEmojiUsage(emojis: string[]): Patterns['emoji_usage'] {
  const frequency: Patterns['emoji_usage']['frequency'] =
    emojis.length === 0 ? 'none' :
    emojis.length === 1 ? 'low' :
    emojis.length < 3 ? 'medium' : 'high'

  // Count emoji occurrences
  const counts = new Map<string, number>()
  emojis.forEach(e => counts.set(e, (counts.get(e) || 0) + 1))

  // Sort by frequency and take top 5
  const topEmojis = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji]) => emoji)

  return {
    frequency,
    top_emojis: topEmojis
  }
}

function analyzePunctuation(text: string): Patterns['punctuation'] {
  const sentences = extractSentences(text)
  const totalSentences = sentences.length || 1

  const exclamations = (text.match(/!/g) || []).length
  const questions = (text.match(/\?/g) || []).length
  const ellipses = (text.match(/\.\.\./g) || []).length

  return {
    exclamation_frequency: Math.round((exclamations / totalSentences) * 100) / 100,
    question_frequency: Math.round((questions / totalSentences) * 100) / 100,
    ellipsis_usage: ellipses === 0 ? 'none' : ellipses < 3 ? 'low' : ellipses < 10 ? 'medium' : 'high'
  }
}

function analyzeCapitalization(text: string): Patterns['capitalization'] {
  const words = extractWords(text)
  const allCapsWords = words.filter(w => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w))

  return {
    all_caps_frequency: words.length > 0 ? allCapsWords.length / words.length : 0,
    random_caps: false // Would need more sophisticated analysis
  }
}

// ============================================================================
// VOICE TRAIT ANALYSIS
// ============================================================================

// Common informal words/phrases
const INFORMAL_WORDS = ['hey', 'wassup', 'gonna', 'wanna', 'lol', 'omg', 'btw', 'tbh', 'idk', 'kinda', 'sorta', 'yeah', 'nope', 'yep']
const FORMAL_WORDS = ['would', 'could', 'shall', 'therefore', 'furthermore', 'moreover', 'consequently', 'accordingly', 'thus', 'hence']
const HUMOR_INDICATORS = ['lol', 'lmao', 'haha', 'hehe', 'hilarious', 'funny', 'joke', 'jk', 'rofl']

/**
 * Analyze voice traits from text
 */
export function analyzeVoiceTraits(text: string): Partial<Voice> {
  const lowerText = text.toLowerCase()
  const words = extractWords(lowerText)

  return {
    formality: calculateFormality(words, lowerText),
    humor: calculateHumor(words, lowerText),
    sarcasm: calculateSarcasm(text, lowerText),
    enthusiasm: calculateEnthusiasm(text),
    directness: calculateDirectness(text)
  }
}

function calculateFormality(words: string[], text: string): number {
  let score = 0.5 // Start neutral

  // Check for informal words
  const informalCount = words.filter(w => INFORMAL_WORDS.includes(w)).length
  score -= informalCount * 0.05

  // Check for formal words
  const formalCount = FORMAL_WORDS.filter(f => text.includes(f)).length
  score += formalCount * 0.05

  // Check for contractions (informal)
  const contractions = (text.match(/\w+\'\w+/g) || []).length
  score -= contractions * 0.02

  // Check for sentence complexity
  const sentences = extractSentences(text)
  const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / (sentences.length || 1)
  if (avgLength > 20) score += 0.1
  if (avgLength < 10) score -= 0.1

  return Math.max(0, Math.min(1, score))
}

function calculateHumor(words: string[], text: string): number {
  const humorCount = words.filter(w => HUMOR_INDICATORS.includes(w)).length
  const humorRatio = humorCount / (words.length || 1)
  return Math.min(1, humorRatio * 10 + 0.2)
}

function calculateSarcasm(originalText: string, lowerText: string): number {
  let score = 0.2 // Base low

  // Quotes often indicate sarcasm
  const quotedPhrases = (originalText.match(/"[^"]+"/g) || []).length
  score += quotedPhrases * 0.1

  // "Sure..." or "Right..." patterns
  if (/^(sure|right|yeah|ok)\.\.\./i.test(lowerText)) score += 0.3

  // Mixed caps can indicate sarcasm
  const mixedCaps = /[a-z][A-Z]|[A-Z]{2,}[a-z]/.test(originalText)
  if (mixedCaps) score += 0.2

  return Math.min(1, score)
}

function calculateEnthusiasm(text: string): number {
  let score = 0.5

  // Multiple exclamations
  const multiExclamations = (text.match(/!{2,}/g) || []).length
  score += multiExclamations * 0.15

  // All caps words
  const allCaps = (text.match(/\b[A-Z]{2,}\b/g) || []).length
  score += allCaps * 0.05

  // Positive words
  const positiveWords = ['amazing', 'awesome', 'incredible', 'fantastic', 'wonderful', 'love', 'best', 'great']
  const positiveCount = positiveWords.filter(w => text.toLowerCase().includes(w)).length
  score += positiveCount * 0.05

  return Math.min(1, Math.max(0, score))
}

function calculateDirectness(text: string): number {
  const sentences = extractSentences(text)
  let score = 0.5

  // Short sentences tend to be more direct
  const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / (sentences.length || 1)
  if (avgLength < 8) score += 0.2
  if (avgLength > 20) score -= 0.2

  // Imperative verbs (commands)
  const imperatives = /^(go|do|make|get|take|give|let|put|try|use|check)/im
  if (imperatives.test(text)) score += 0.1

  return Math.max(0, Math.min(1, score))
}
