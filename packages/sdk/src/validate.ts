import type { IdiomarkFile } from '@idiomark/core'
import type { ValidationResult } from './types'

/**
 * Validate a Idiomark file structure
 *
 * @example
 * ```ts
 * import { validateIdiomarkFile } from '@idiomark/sdk'
 *
 * const result = validateIdiomarkFile(idiomarkFile)
 * if (!result.valid) {
 *   console.error('Invalid Idiomark file:', result.errors)
 * }
 * ```
 */
export function validateIdiomarkFile(file: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if it's an object
  if (!file || typeof file !== 'object') {
    return { valid: false, errors: ['File must be an object'], warnings: [] }
  }

  const idiomark = file as Record<string, any>

  // Required fields
  if (!idiomark.idiomark) errors.push('Missing required field: idiomark (version)')
  if (!idiomark.id) errors.push('Missing required field: id')
  if (!idiomark.created) errors.push('Missing required field: created')
  if (!idiomark.personality) errors.push('Missing required field: personality')

  // Validate version format
  if (idiomark.idiomark && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(idiomark.idiomark)) {
    errors.push('Invalid version format. Expected: X.Y.Z or X.Y.Z-suffix')
  }

  // Validate personality structure
  if (idiomark.personality) {
    const p = idiomark.personality

    if (!p.voice) errors.push('Missing personality.voice')
    if (!p.patterns) errors.push('Missing personality.patterns')
    if (!p.domains) warnings.push('Missing personality.domains (optional but recommended)')
    if (!p.values) warnings.push('Missing personality.values (optional but recommended)')
    if (!p.knowledge) warnings.push('Missing personality.knowledge (optional but recommended)')

    // Validate voice values are in range 0-1
    if (p.voice) {
      const voiceFields = ['formality', 'humor', 'sarcasm', 'enthusiasm', 'directness']
      for (const field of voiceFields) {
        if (typeof p.voice[field] === 'number') {
          if (p.voice[field] < 0 || p.voice[field] > 1) {
            errors.push(`voice.${field} must be between 0 and 1`)
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Check if a value looks like a valid Idiomark file
 */
export function isIdiomarkFile(value: unknown): value is IdiomarkFile {
  const result = validateIdiomarkFile(value)
  return result.valid
}
