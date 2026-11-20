import { describe, it, expect } from 'vitest'
import { validateIdiomarkFile, isIdiomarkFile } from '../validate'
import type { IdiomarkFile } from '@idiomark/core'

describe('validateIdiomarkFile', () => {
  it('should validate a correct Idiomark file', () => {
    const file: IdiomarkFile = {
      idiomark: '1.0.0',
      id: 'test_123',
      created: '2024-01-15T10:00:00Z',
      updated: '2024-01-15T10:00:00Z',
      metadata: {
        entity: { type: 'human', sources: ['test'] },
        extraction: {
          date: '2024-01-15T10:00:00Z',
          sample_size: 1,
          timeframe: { from: '2024-01-01', to: '2024-01-15' }
        }
      },
      personality: {
        voice: {
          tone: { primary: 'casual', confidence: 0.8 },
          formality: 0.3,
          humor: 0.5,
          sarcasm: 0.2,
          enthusiasm: 0.7,
          directness: 0.6
        },
        patterns: {
          sentence_length: { mean: 10, stddev: 5 },
          emoji_usage: { frequency: 'medium', top_emojis: ['🚀'] },
          punctuation: { exclamation_frequency: 0.1, question_frequency: 0.05, ellipsis_usage: 'low' }
        },
        domains: [],
        values: [],
        knowledge: { frequent_terms: [], mentions: {}, topics: { primary: [] } }
      }
    }

    const result = validateIdiomarkFile(file)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail for missing required fields', () => {
    const result = validateIdiomarkFile({})

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing required field: idiomark (version)')
    expect(result.errors).toContain('Missing required field: id')
  })

  it('should fail for invalid version format', () => {
    const result = validateIdiomarkFile({
      idiomark: 'invalid',
      id: 'test',
      created: '2024-01-15',
      personality: {}
    })

    expect(result.errors).toContain('Invalid version format. Expected: X.Y.Z or X.Y.Z-suffix')
  })

  it('should fail for voice values out of range', () => {
    const result = validateIdiomarkFile({
      idiomark: '1.0.0',
      id: 'test',
      created: '2024-01-15',
      personality: {
        voice: {
          formality: 1.5 // Invalid: > 1
        },
        patterns: {}
      }
    })

    expect(result.errors).toContain('voice.formality must be between 0 and 1')
  })

  it('should return warnings for optional fields', () => {
    const result = validateIdiomarkFile({
      idiomark: '1.0.0',
      id: 'test',
      created: '2024-01-15',
      personality: {
        voice: {},
        patterns: {}
      }
    })

    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('isIdiomarkFile', () => {
  it('should return true for valid files', () => {
    const file = {
      idiomark: '1.0.0',
      id: 'test',
      created: '2024-01-15',
      updated: '2024-01-15',
      metadata: {},
      personality: {
        voice: {},
        patterns: {}
      }
    }

    expect(isIdiomarkFile(file)).toBe(true)
  })

  it('should return false for invalid files', () => {
    expect(isIdiomarkFile(null)).toBe(false)
    expect(isIdiomarkFile({})).toBe(false)
    expect(isIdiomarkFile('not an object')).toBe(false)
  })
})
