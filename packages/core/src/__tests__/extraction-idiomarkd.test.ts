/**
 * IdiomarkD Extraction Integration Tests
 *
 * Tests for behavioral analysis from code samples
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DeveloperBehaviorAnalyzer, type CodeSample } from '@idiomark/core'

describe('IdiomarkD: Behavioral Extraction', () => {
  let analyzer: DeveloperBehaviorAnalyzer

  beforeEach(() => {
    analyzer = new DeveloperBehaviorAnalyzer()
  })

  describe('Code Sample Analysis', () => {
    it('should analyze code samples and produce behavioral layer', async () => {
      const samples: CodeSample[] = [
        {
          filePath: 'src/utils.ts',
          content: `
            /**
             * Utility functions for data processing
             */
            import type { User } from './types'

            /**
             * Processes user data iteratively
             */
            export function processUserData(user: User): User | null {
              if (!user || !user.id) {
                console.warn('Invalid user data')
                return null
              }

              const processed = {
                ...user,
                processedAt: new Date().toISOString()
              }

              return processed
            }

            // Iterative data processing
            export function processUserDataArray(users: User[]): User[] {
              const result: User[] = []

              for (const user of users) {
                const processed = processUserData(user)
                if (processed) {
                  result.push(processed)
                }
              }

              return result
            }

            /**
             * Map-based transformation (functional style)
             */
            export function transformUsers(users: User[]): User[] {
              return users
                .map(u => processUserData(u))
                .filter((u): u is User => u !== null)
            }
          }
          `,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(samples)
      const result = await analyzer.analyze()

      // Check basic structure
      expect(result.behavioral).toBeDefined()
      expect(result.behavioral.cognitive_style).toBeDefined()
      expect(result.behavioral.code_structure).toBeDefined()
      expect(result.behavioral.naming).toBeDefined()
      expect(result.behavioral.error_handling).toBeDefined()

      // Check confidence scores
      expect(result.confidence.overall).toBeGreaterThan(0)
      expect(result.confidence.overall).toBeLessThanOrEqual(1)

      // Check sample count
      expect(result.sampleCount).toBe(1)
    })

    it('should detect functional programming patterns', async () => {
      const functionalSamples: CodeSample[] = [
        {
          filePath: 'src/functional.ts',
          content: `
            export const processData = (data: number[]) => {
              return data
                .map(x => x * 2)
                .filter(x => x > 10)
                .reduce((sum, x) => sum + x, 0)
            }

            export const getUsers = async () => {
              const response = await fetch('/api/users')
              const data = await response.json()
              return data.users || []
            }
          `,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(functionalSamples)
      const result = await analyzer.analyze()

      // Should detect high functional preference
      expect(result.behavioral.code_structure.functional_preference).toBeGreaterThan(0.5)
    })

    it('should detect naming conventions', async () => {
      const namingSamples: CodeSample[] = [
        {
          filePath: 'src/naming.ts',
          content: `
            const MAX_RETRIES = 3
            const API_BASE_URL = 'https://api.example.com'

            interface UserService {
              getUserById(userId: string): Promise<User>
              getAllUsers(): Promise<User[]>
            }

            class UserServiceImpl implements UserService {
              private httpClient: HttpClient

              constructor(httpClient: HttpClient) {
                this.httpClient = httpClient
              }

              async getUserById(userId: string): Promise<User> {
                const response = await this.httpClient.get(\`/users/\${userId}\`)
                return response.data
              }

              async getAllUsers(): Promise<User[]> {
                const response = await this.httpClient.get('/users')
                return response.data.users
              }
            }
          `,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(namingSamples)
      const result = await analyzer.analyze()

      // Should detect PascalCase for types and camelCase for variables
      expect(result.behavioral.naming.conventions.types).toBe('PascalCase')
      expect(result.behavioral.naming.conventions.constants).toBe('UPPER_SNAKE')
      expect(result.behavioral.naming.abbreviations).toContain('api')
      expect(result.behavioral.naming.abbreviations).toContain('http')
    })

    it('should detect error handling patterns', async () => {
      const errorHandlingSamples: CodeSample[] = [
        {
          filePath: 'src/errors.ts',
          content: `
            export async function fetchWithErrorHandling(url: string) {
              try {
                const response = await fetch(url)
                if (!response.ok) {
                  throw new Error(\`HTTP error: \${response.status}\`)
                }
                return await response.json()
              } catch (error) {
                console.error('Fetch failed:', error)
                return null
              }
            }

            export function validateUser(user: any): user is User {
              if (!user || typeof user !== 'object') {
                throw new Error('Invalid user')
              }
              return true
            }
          `,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(errorHandlingSamples)
      const result = await analyzer.analyze()

      // Should detect graceful degradation philosophy
      expect(result.behavioral.error_handling.philosophy).toBeDefined()
      expect(['graceful_degradation', 'fail_fast', 'defensive'])
        .toContain(result.behavioral.error_handling.philosophy)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty samples gracefully', async () => {
      analyzer = new DeveloperBehaviorAnalyzer([])

      await expect(analyzer.analyze()).rejects.toThrow('No code samples to analyze')
    })

    it('should handle samples with no code', async () => {
      const emptySamples: CodeSample[] = [
        {
          filePath: 'src/empty.ts',
          content: '/* Empty file with just comments */',
          language: 'typescript'
        }
      ]

      analyzer.addSamples(emptySamples)
      const result = await analyzer.analyze()

      // Should still produce valid structure
      expect(result.behavioral).toBeDefined()
      expect(result.confidence.overall).toBeLessThan(0.5) // Low confidence for empty code
    })

    it('should handle mixed languages', async () => {
      const mixedSamples: CodeSample[] = [
        {
          filePath: 'src/typescript.ts',
          content: `export const foo = () => { console.log('test') }`,
          language: 'typescript'
        },
        {
          filePath: 'src/python.py',
          content: `def foo(): print('test')`,
          language: 'python'
        }
      ]

      analyzer.addSamples(mixedSamples)
      const result = await analyzer.analyze()

      // Should analyze all samples
      expect(result.sampleCount).toBe(2)
      expect(result.behavioral).toBeDefined()
    })

    it('should handle large files efficiently', async () => {
      const largeContent = `
        // Large file with many functions
        ${Array.from({ length: 100 }, (_, i) => `
          export function function${i}(data: any): any {
            return data
          }
        `).join('\n')}
      `

      const largeSamples: CodeSample[] = [
        {
          filePath: 'src/large.ts',
          content: largeContent,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(largeSamples)
      const result = await analyzer.analyze()

      // Should handle large files
      expect(result.sampleCount).toBe(1)
      expect(result.behavioral.code_structure.max_function_length).toBeGreaterThan(0)
    })
  })

  describe('Confidence Scoring', () => {
    it('should provide lower confidence for minimal samples', async () => {
      const minimalSamples: CodeSample[] = [
        {
          filePath: 'src/minimal.ts',
          content: `export const x = 1`,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(minimalSamples)
      const result = await analyzer.analyze()

      // Low confidence due to minimal data
      expect(result.confidence.overall).toBeLessThan(0.5)
    })

    it('should provide higher confidence for consistent patterns', async () => {
      const consistentSamples: CodeSample[] = [
        {
          filePath: 'src/one.ts',
          content: `
            export function getUser(id: string): User { return {} as User }
            export function updateUser(id: string, data: any): User { return {} as User }
            export function deleteUser(id: string): boolean { return true }
          `,
          language: 'typescript'
        },
        {
          filePath: 'src/two.ts',
          content: `
            export function getProduct(id: string): Product { return {} as Product }
            export function updateProduct(id: string, data: any): Product { return {} as Product }
            export function deleteProduct(id: string): boolean { return true }
          `,
          language: 'typescript'
        }
      ]

      analyzer.addSamples(consistentSamples)
      const result = await analyzer.analyze()

      // Higher confidence due to consistent patterns
      expect(result.confidence.overall).toBeGreaterThan(0.4)
    })
  })
})
