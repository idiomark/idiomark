/**
 * Idiomark Validator
 *
 * Validates Idiomark files against the protocol schema
 */

import { schema } from './schema'
import type { ValidationResult, ValidationError } from './types'

export interface ValidatorOptions {
  strict: boolean
}

export class IdiomarkValidator {
  private options: ValidatorOptions

  constructor(options: ValidatorOptions) {
    this.options = options
  }

  async validate(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // Basic structure validation
    if (!data.idiomark) {
      errors.push({
        field: 'idiomark',
        message: 'Missing version field',
        code: 'MISSING_VERSION'
      })
    }

    if (!data.id) {
      errors.push({
        field: 'id',
        message: 'Missing ID field',
        code: 'MISSING_ID'
      })
    }

    if (!data.personality) {
      errors.push({
        field: 'personality',
        message: 'Missing personality object',
        code: 'MISSING_PERSONALITY'
      })
    }

    // Zod schema validation
    try {
      schema.parse(data)
    } catch (error: any) {
      if (error.errors && Array.isArray(error.errors)) {
        for (const err of error.errors) {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            code: 'SCHEMA_ERROR'
          })
        }
      }
    }

    // Strict mode additional checks
    if (this.options.strict) {
      // Check for required fields with proper values
      if (data.personality?.voice?.formality === undefined) {
        errors.push({
          field: 'personality.voice.formality',
          message: 'Missing formality score',
          code: 'MISSING_METRIC'
        })
      }

      // Check confidence ranges
      if (data.personality?.voice?.tone?.confidence !== undefined) {
        if (data.personality.voice.tone.confidence < 0 || data.personality.voice.tone.confidence > 1) {
          errors.push({
            field: 'personality.voice.tone.confidence',
            message: 'Confidence must be between 0 and 1',
            code: 'INVALID_RANGE'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      version: data.idiomark || 'unknown',
      id: data.id || 'unknown',
      created: data.created || 'unknown',
      sources: data.metadata?.entity?.sources || [],
      errors
    }
  }
}
