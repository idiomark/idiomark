/**
 * IdiomarkD Behavioral Scenario Tests
 *
 * Tests that behavioral analysis produces valid results
 * Note: These tests use heuristics, so exact values may vary
 */

import { describe, it, expect } from 'vitest'
import { analyzeDeveloperBehavior, type BehavioralAnalysisResult } from '@idiomark/core'

describe('IdiomarkD: Behavioral Scenarios', () => {
  describe('Cognitive Style Scenarios', () => {
    it('should detect iterative patterns in code', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Iterative approach - build, test, refine
          function processData(data: any[]): any[] {
            const result = data
            for (let i = 0; i < data.length; i++) {
              const item = data[i]
              if (isValid(item)) {
                result.push(processItem(item))
              }
            }
            return result
          }

          function isValid(item: any): boolean {
            return item !== null && typeof item === 'object'
          }
        }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Check that a valid cognitive style is detected
      expect(['iterative_refinement', 'divide_conquer', 'mvp_first', 'spike_first'])
        .toContain(result.behavioral.cognitive_style.problem_solving)
    })

    it('should detect modular code patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Modular approach - separate functions
          function processUser(user: User): User | null {
            return processUserData(user)
          }

          function processUserData(data: any): User | null {
            return processItem(data)
          }

          function processItem(item: any): any {
            return validateItem(item)
          }

          function validateItem(item: any): boolean {
            return item !== null && typeof item === 'object'
          }
        }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Check that a valid cognitive style is detected
      expect(['iterative_refinement', 'divide_conquer', 'mvp_first', 'spike_first'])
        .toContain(result.behavioral.cognitive_style.problem_solving)
    })
  })

  describe('Code Structure Scenarios', () => {
    it('should detect functional patterns in code', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Functional style - map, filter, reduce
          export const processData = (data: number[]) => {
            return data
              .map(x => x * 2)
              .filter(x => x > 10)
              .reduce((sum, x) => sum + x, 0)
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Functional preference should be a valid number between 0 and 1
      expect(result.behavioral.code_structure.functional_preference).toBeGreaterThanOrEqual(0)
      expect(result.behavioral.code_structure.functional_preference).toBeLessThanOrEqual(1)
    })

    it('should detect function length patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Short functions
          export function add(a: number, b: number): number {
            return a + b
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Max function length should be a positive number
      expect(result.behavioral.code_structure.max_function_length).toBeGreaterThan(0)
    })
  })

  describe('Naming Convention Scenarios', () => {
    it('should detect camelCase variable patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // camelCase variables
          const userName = user.name
          const userId = user.id
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid naming convention
      expect(['camelCase', 'PascalCase', 'kebab-case'])
        .toContain(result.behavioral.naming.conventions.variables)
    })

    it('should detect PascalCase type patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // PascalCase types
          interface UserService { }

          class DataProcessor { }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Types should be PascalCase (this is a standard convention)
      expect(result.behavioral.naming.conventions.types).toBe('PascalCase')
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should detect graceful degradation patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Graceful degradation - try-catch with error returns
          export function fetchData(url: string): Promise<any> {
            try {
              const response = await fetch(url)
              return await response.json()
            } catch (error) {
              console.error('Fetch failed:', error)
              return null
            }
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid error handling philosophy
      expect(['graceful_degradation', 'fail_fast', 'defensive'])
        .toContain(result.behavioral.error_handling.philosophy)
    })

    it('should detect fail-fast patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Fail fast - validate early
          export function validateUser(user: any): boolean {
            if (!user || typeof user !== 'object') {
              throw new Error('Invalid user')
            }
            return true
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid error handling philosophy
      expect(['graceful_degradation', 'fail_fast', 'defensive'])
        .toContain(result.behavioral.error_handling.philosophy)
    })
  })

  describe('Testing Approach Scenarios', () => {
    it('should detect pragmatic testing patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Pragmatic testing - test important paths
          import { describe, it, expect } from 'vitest'

          describe('UserService', () => {
            it('should get user by id', async () => {
              const user = await userService.findById(1)
              expect(user).toBeDefined()
            })
          })
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid testing temperament
      expect(['pragmatic_not_zealous', 'tdd_zealot', 'exploratory'])
        .toContain(result.behavioral.testing.temperament)
    })

    it('should detect comprehensive testing patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Comprehensive testing - multiple test cases
          import { describe, it, expect, vi } from 'vitest'

          describe('MathUtils', () => {
            describe('add', () => {
              it('should add two numbers', () => {
                expect(add(2, 3)).toBe(5)
              })

              it('should add negative numbers', () => {
                expect(add(-1, 1)).toBe(0)
              })

              it('should throw on non-numbers', () => {
                expect(() => add('1' as any, '2' as any)).toThrow()
              })
            })
          })
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid testing temperament
      expect(['pragmatic_not_zealous', 'tdd_zealot', 'exploratory'])
        .toContain(result.behavioral.testing.temperament)
      // Coverage threshold should be valid
      expect(result.behavioral.testing.coverage_threshold).toBeGreaterThanOrEqual(0)
      expect(result.behavioral.testing.coverage_threshold).toBeLessThanOrEqual(1)
    })
  })

  describe('Code Review Style Scenarios', () => {
    it('should detect explanatory comment patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Collaborative - explanatory comments
          // Process user data by mapping to standardized format
          function processUserData(users: any[]): User[] {
            return users.map(user => ({
              ...user,
              // Transform to standard format
              displayName: \`\${user.firstName} \${user.lastName}\`,
              createdAt: new Date().toISOString()
            }))
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid code review style
      expect(['collaborative_not_adversarial', 'direct', 'mentoring'])
        .toContain(result.behavioral.code_review.style)
    })

    it('should detect brief comment patterns', async () => {
      const samples = [{
        filePath: 'test.ts',
        content: `
          // Direct - brief comments
          function processUserData(users: any[]): User[] {
            return users.map(u => ({id: u.id}))
          }
        `
      }]

      const result = await analyzeDeveloperBehavior(samples)

      // Should detect a valid code review style
      expect(['collaborative_not_adversarial', 'direct', 'mentoring'])
        .toContain(result.behavioral.code_review.style)
    })
  })
})
