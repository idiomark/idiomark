/**
 * IdiomarkD Migration Tests
 *
 * Test that IdiomarkD maintains backward compatibility with Idiomark
 * Tests graceful degradation (unknown fields ignored)
 */

import { describe, it, expect } from 'vitest'
import { validateIdiomarkD } from '../validator-dev'
import type { IdiomarkDFile } from '../types-dev'

// Minimal valid IdiomarkD data for testing
const createMinimalIdiomarkD = (overrides: Partial<IdiomarkDFile> = {}): IdiomarkDFile => ({
  idiomark: '1.1.0',
  profile_type: 'developer',
  metadata: {
    identity: {},
    created: '2026-02-13T00:00:00Z',
    updated: '2026-02-13T00:00:00Z',
    sources: ['test']
  },
  behavioral: {
    cognitive_style: {
      problem_solving: 'iterative_refinement',
      learning_style: 'experimentation',
      documentation_preference: 'code_first_comments_selective'
    },
    code_structure: {
      functional_preference: 0.5,
      max_function_length: 20,
      complexity_tolerance: 'moderate',
      file_organization: 'co-located'
    },
    naming: {
      philosophy: 'descriptive_over_brief',
      conventions: {
        variables: 'camelCase',
        types: 'PascalCase',
        constants: 'UPPER_SNAKE',
        files: 'kebab-case'
      },
      abbreviations: [],
      anti_patterns: []
    },
    error_handling: {
      philosophy: 'graceful_degradation',
      fail_fast: false,
      error_context: 'on_error_only',
      logging_level: 'warn'
    },
    testing: {
      temperament: 'pragmatic_not_zealous',
      coverage_threshold: 0.7,
      test_external_dependencies: false,
      mock_strategy: 'minimal'
    },
    code_review: {
      style: 'direct',
      focus_areas: [],
      nit_picks: []
    }
  },
  ai_personality: {
    voice: {
      tone: {
        primary: 'professional',
        certainty: 'confident_with_hedges'
      },
      formality: 0.5,
      humor: 0.3,
      sarcasm: 0.2,
      enthusiasm: 0.6,
      directness: 0.7
    },
    code_generation: {
      prefer_patterns_over_raw_code: true,
      include_explanations: 'selective',
      comment_style: 'why_not_what',
      docstring_preference: 'jsdoc'
    },
    interaction: {
      question_response_style: 'direct_with_options',
      error_communication: 'explain_then_fix',
      suggestion_openness: 'balanced'
    }
  },
  ...overrides
})

describe('IdiomarkD: Migration from Idiomark', () => {
  // Test 1: IdiomarkD files are valid Idiomark files
  it('should validate against Idiomark schema (unknown fields ignored)', async () => {
    const idiomarkd = createMinimalIdiomarkD({
      environmental: {
        optional: true,
        editor: {
          vscode: {
            theme: 'dracula',
            font_size: 14,
            tab_size: 2,
            format_on_save: true
          }
        }
      }
    })

    const result = await validateIdiomarkD(idiomarkd)
    expect(result.valid).toBe(true)
  })

  // Test 2: Idiomark validator doesn't fail on IdiomarkD files with extra fields
  it('should not fail on extra IdiomarkD fields (graceful degradation)', async () => {
    const idiomarkdWithExtraFields = createMinimalIdiomarkD({
      extra_field: 'some_extra_data'
    } as IdiomarkDFile)

    const result = await validateIdiomarkD(idiomarkdWithExtraFields)
    expect(result.valid).toBe(true)
  })

  // Test 3: Idiomark validator handles missing optional fields
  it('should handle missing optional environmental layer', async () => {
    const idiomarkdNoEnvironmental = createMinimalIdiomarkD()
    // environmental is not included (optional)

    const result = await validateIdiomarkD(idiomarkdNoEnvironmental)
    expect(result.valid).toBe(true)
  })

  // Test 4: IdiomarkD files provide all required fields
  it('should fail when required IdiomarkD fields are missing', async () => {
    const idiomarkdMissingRequired = {
      idiomark: '1.1.0',
      profile_type: 'developer',
      metadata: {
        identity: {},
        created: '2026-02-13T00:00:00Z',
        updated: '2026-02-13T00:00:00Z',
        sources: ['test']
      },
      // Missing behavioral (required)
      ai_personality: createMinimalIdiomarkD().ai_personality
    }

    const result = await validateIdiomarkD(idiomarkdMissingRequired)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  // Test 5: IdiomarkD profile_type must be 'developer'
  it('should validate profile_type is developer', async () => {
    const idiomarkdWrongType = createMinimalIdiomarkD({
      profile_type: 'personality'
    } as IdiomarkDFile)

    const result = await validateIdiomarkD(idiomarkdWrongType)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'profile_type', code: 'INVALID_PROFILE_TYPE' })
      ])
    )
  })

  // Test 6: IdiomarkD confidence scores are 0-1 (requires strict mode)
  it('should validate confidence score ranges', async () => {
    const idiomarkdBadConfidence = createMinimalIdiomarkD({
      behavioral: {
        ...createMinimalIdiomarkD().behavioral,
        code_structure: {
          ...createMinimalIdiomarkD().behavioral.code_structure,
          functional_preference: 1.5 // > 1, invalid
        }
      }
    })

    const result = await validateIdiomarkD(idiomarkdBadConfidence, { strict: true })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'behavioral.code_structure.functional_preference', code: 'INVALID_RANGE' })
      ])
    )
  })
})
