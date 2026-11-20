/**
 * IdiomarkD Integration Tests
 *
 * Tests for platform-agnostic integration and editor integrations
 */

import { describe, it, expect } from 'vitest'
import {
  EditorIntegration,
  DevBehavior,
  CodeTransformation,
  CommentGenerationOptions,
  createIntegration,
  applyCodeStyle,
  generateComment
} from '@idiomark/core'

describe('IdiomarkD: Integration Layer', () => {
  describe('Platform-Agnostic Interface', () => {
    it('should create integration instance', () => {
      const integration = createIntegration({
        name: 'test-integration'
      })

      expect(integration.name).toBe('test-integration')
    })

    it('should load behavior profile', async () => {
      const integration = createIntegration({
        name: 'test-integration',
        loadBehavior: async () => {
          return {
            metadata: { identity: { name: 'Test Developer' } },
            behavioral: {
              cognitive_style: {
                problem_solving: 'iterative_refinement',
                learning_style: 'experimental',
                documentation_preference: 'code_first_comments_selective'
              },
              code_structure: {
                functional_preference: 0.7,
                max_function_length: 25,
                complexity_tolerance: 'moderate',
                file_organization: 'co-located'
              }
            }
          } as DevBehavior
        }
      })

      const profile = await integration.loadBehavior('test.idiomarkd.json')

      expect(profile).toBeDefined()
      expect(profile?.metadata?.identity?.name).toBe('Test Developer')
    })

    it('should apply code style transformation', () => {
      const integration = createIntegration({
        name: 'test-integration'
      })

      const behavior: DevBehavior = {
        metadata: { identity: { name: 'Test' } },
        behavioral: {
          naming: {
            philosophy: 'descriptive_over_brief',
            conventions: {
              variables: 'camelCase'
            }
          }
        }
      } as DevBehavior

      const code = 'const x = 1'
      const result = integration.applyBehavior(code, behavior)

      expect(result.original).toBe(code)
      expect(result.transformed).toBeDefined()
      expect(result.transformed).not.toBe(code)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should generate comment matching developer style', () => {
      const integration = createIntegration({
        name: 'test-integration',
        generateComment: (options: CommentGenerationOptions) => {
          const { code, type = 'inline', depth = 'brief' } = options

          if (depth === 'why-focused') {
            return `// ${code}: handles edge cases`
          } else if (type === 'jsdoc') {
            return `/** ${code} implementation */`
          }

          return `// ${code}`
        }
      })

      // Canonical nesting: documentation_preference lives inside
      // behavioral.cognitive_style (schemas-dev.ts DeveloperBehaviorSchema;
      // analyzer-dev.ts analyzeCognitiveStyle; docs/idiomarkd/API_REFERENCE.md).
      const behavior: DevBehavior = {
        metadata: { identity: { name: 'Test' } },
        behavioral: {
          cognitive_style: {
            documentation_preference: 'code_first_comments_selective'
          }
        }
      } as DevBehavior

      // The custom generator below only returns "handles edge cases" for
      // depth: 'why-focused'; the call must actually request that depth.
      const result = integration.generateComment({
        code: 'fetchData',
        depth: 'why-focused',
        behavior
      })

      expect(result).toContain('handles edge cases')
    })

    it('should be available', async () => {
      const integration = createIntegration({
        name: 'test-integration'
      })

      const available = await integration.isAvailable()

      expect(available).toBe(true)
    })
  })

  describe('Code Style Transformation', () => {
    it('should apply functional preference', () => {
      const behavior: DevBehavior = {
        behavioral: {
          code_structure: {
            functional_preference: 0.8
          }
        }
      } as DevBehavior

      const code = 'const result = data.map(x => x * 2)'
      const result = applyCodeStyle(code, behavior)

      expect(result.transformed).toContain('.map(')
      expect(result.transformations?.functionStyle).toBeDefined()
    })

    it('should apply naming conventions', () => {
      const behavior: DevBehavior = {
        behavioral: {
          naming: {
            philosophy: 'efficient',
            conventions: {
              variables: 'UPPER_SNAKE'
            }
          }
        }
      } as DevBehavior

      const code = 'const userName = value'
      const result = applyCodeStyle(code, behavior)

      // Should convert to UPPER_SNAKE
      expect(result.transformed).toContain('CONST USERNAME')
    })

    it('should apply comment style', () => {
      const behavior: DevBehavior = {
        behavioral: {
          cognitive_style: {
            documentation_preference: 'comments_first_code_second'
          }
        }
      } as DevBehavior

      const code = 'function calculate() { return result }'
      const result = applyCodeStyle(code, behavior)

      expect(result.transformations?.commentStyle).toContain('comprehensive')
    })
  })

  describe('Comment Generation', () => {
    it('should generate brief comment', () => {
      const behavior: DevBehavior = {
        // Canonical nesting: behavioral.cognitive_style.documentation_preference
        // (schemas-dev.ts DeveloperBehaviorSchema; analyzer-dev.ts analyzeCognitiveStyle).
        behavioral: {
          cognitive_style: {
            documentation_preference: 'code_first_comments_selective'
          }
        }
      } as DevBehavior

      const result = generateComment(behavior, { code: 'processData', depth: 'brief' })

      expect(result).toBe('// processData: implementation')
    })

    it('should generate detailed comment', () => {
      const behavior: DevBehavior = {
        // Canonical nesting: behavioral.cognitive_style.documentation_preference
        // (schemas-dev.ts DeveloperBehaviorSchema; analyzer-dev.ts analyzeCognitiveStyle).
        behavioral: {
          cognitive_style: {
            documentation_preference: 'code_first_comments_selective'
          }
        }
      } as DevBehavior

      const result = generateComment(behavior, { code: 'validateInput', depth: 'detailed' })

      expect(result).toContain('Implements')
      expect(result).toContain('full error handling')
    })

    it('should generate why-focused comment', () => {
      const behavior: DevBehavior = {
        // Canonical nesting: behavioral.cognitive_style.documentation_preference
        // (schemas-dev.ts DeveloperBehaviorSchema; analyzer-dev.ts analyzeCognitiveStyle).
        behavioral: {
          cognitive_style: {
            documentation_preference: 'code_first_comments_selective'
          }
        }
      } as DevBehavior

      const result = generateComment(behavior, { code: 'checkAuth', depth: 'why-focused' })

      expect(result).toContain('handles edge cases')
      expect(result).toContain('clear intent')
    })

    it('should generate jsdoc comment', () => {
      const behavior: DevBehavior = {
        // Canonical nesting: behavioral.cognitive_style.documentation_preference
        // (schemas-dev.ts DeveloperBehaviorSchema; analyzer-dev.ts analyzeCognitiveStyle).
        behavioral: {
          cognitive_style: {
            documentation_preference: 'code_first_comments_selective'
          }
        }
      } as DevBehavior

      const result = generateComment(behavior, {
        code: 'fetchUsers',
        type: 'jsdoc',
        depth: 'brief'
      })

      expect(result).toMatch(/\/\*\*/)
      expect(result).toContain('fetchUsers')
    })
  })
})
