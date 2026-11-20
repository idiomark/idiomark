import { describe, it, expect } from 'vitest'
import { extractPersonality, extractFromText } from '../extract'

describe('extractPersonality', () => {
  it('should extract personality from text samples', async () => {
    const texts = [
      'I love building things! 🚀 This is amazing!',
      'Just shipped a new feature. Really excited about it.',
      'Open source is the future. Collaboration is key.'
    ]

    const result = await extractPersonality({ texts })

    expect(result.file).toBeDefined()
    expect(result.file.idiomark).toBe('1.0.0')
    expect(result.file.personality).toBeDefined()
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('should include source in metadata', async () => {
    const result = await extractPersonality({
      texts: ['Test text'],
      source: 'twitter'
    })

    expect(result.metadata.sources).toContain('twitter')
  })
})

describe('extractFromText', () => {
  it('should extract from single text', async () => {
    const result = await extractFromText('Hello world!')

    expect(result.file).toBeDefined()
    expect(result.metadata.sampleSize).toBe(1)
  })
})
