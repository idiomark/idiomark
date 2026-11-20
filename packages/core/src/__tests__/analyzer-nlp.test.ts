import { describe, it, expect } from 'vitest'
import { analyzeTextPatterns, analyzeVoiceTraits } from '../analyzer-nlp'

describe('analyzeTextPatterns', () => {
  it('should calculate sentence length statistics', () => {
    const text = 'Hello world. This is a test sentence. Short one. This one is longer and has more words in it.'
    const result = analyzeTextPatterns(text)

    expect(result.sentence_length.mean).toBeGreaterThan(0)
    expect(result.sentence_length.stddev).toBeGreaterThanOrEqual(0)
  })

  it('should detect emoji usage', () => {
    const text = 'Hello 🚀 world 💻 this is 🔥 great!'
    const result = analyzeTextPatterns(text)

    expect(result.emoji_usage.frequency).toBe('high')
    expect(result.emoji_usage.top_emojis).toContain('🚀')
  })

  it('should calculate punctuation frequency', () => {
    const text = 'Wow! This is amazing! Really? Yes! Cool.'
    const result = analyzeTextPatterns(text)

    expect(result.punctuation.exclamation_frequency).toBeGreaterThan(0)
    expect(result.punctuation.question_frequency).toBeGreaterThan(0)
  })
})

describe('analyzeVoiceTraits', () => {
  it('should detect casual vs formal tone', () => {
    const casual = 'hey! wassup? gonna grab some food lol'
    const formal = 'I would like to inquire about the availability of your services.'

    const casualResult = analyzeVoiceTraits(casual)
    const formalResult = analyzeVoiceTraits(formal)

    expect(casualResult.formality).toBeLessThan(0.5)
    expect(formalResult.formality).toBeGreaterThan(0.5)
  })

  it('should detect enthusiasm from punctuation', () => {
    const enthusiastic = 'This is amazing!!! So excited!!! Wow!!!'
    const subdued = 'This is acceptable. It works as expected.'

    const enthResult = analyzeVoiceTraits(enthusiastic)
    const subdResult = analyzeVoiceTraits(subdued)

    expect(enthResult.enthusiasm).toBeGreaterThan(subdResult.enthusiasm)
  })

  it('should detect humor indicators', () => {
    const humorous = 'Why did the chicken cross the road? To get to the other side lol'
    const serious = 'The quarterly report shows a 15% increase in revenue.'

    const humResult = analyzeVoiceTraits(humorous)
    const serResult = analyzeVoiceTraits(serious)

    expect(humResult.humor).toBeGreaterThan(serResult.humor)
  })
})
