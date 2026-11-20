/**
 * IdiomarkD Validator
 *
 * Validates IdiomarkD (Idiomark for Developers) files against the protocol schema
 * Extends Idiomark validation to support developer profiles
 */

import { z } from 'zod'
import type { ValidationResult, ValidationError } from './types'
import type {
  IdiomarkDFile,
  DeveloperBehavior,
  DeveloperAIPersonality,
  DeveloperEnvironment
} from './types-dev'
import {
  DeveloperBehaviorSchema,
  DeveloperAIPersonalitySchema,
  DeveloperEnvironmentSchema,
  IdiomarkDSchema
} from './schemas-dev'

export interface IdiomarkDValidatorOptions {
  strict?: boolean        // Same as Idiomark
  checkBehavioral?: boolean  // Additional: Validate behavioral layer
  checkAIPersonality?: boolean  // Additional: Validate AI personality layer
}

/**
 * IdiomarkD-specific validator
 * Extends Idiomark validation to support developer profiles
 */
export class IdiomarkDValidator {
  private options: IdiomarkDValidatorOptions

  constructor(options: IdiomarkDValidatorOptions = {}) {
    this.options = {
      strict: options.strict ?? false,
      checkBehavioral: options.checkBehavioral ?? true,
      checkAIPersonality: options.checkAIPersonality ?? true
    }
  }

  async validate(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // === Idiomark VALIDATION (inherited) ===

    // Basic structure validation (profile_type check)
    if (data.profile_type !== 'developer') {
      errors.push({
        field: 'profile_type',
        message: `Invalid profile type "${data.profile_type}": IdiomarkD requires "developer"`,
        code: 'INVALID_PROFILE_TYPE'
      })
    }

    // === IdiomarkD-SPECIFIC VALIDATION ===

    // Behavioral layer is required
    if (!data.behavioral) {
      errors.push({
        field: 'behavioral',
        message: 'Missing behavioral layer (required for IdiomarkD)',
        code: 'MISSING_BEHAVIORAL'
      })
    }

    // AI personality layer is required
    if (!data.ai_personality) {
      errors.push({
        field: 'ai_personality',
        message: 'Missing AI personality layer (required for IdiomarkD)',
        code: 'MISSING_AI_PERSONALITY'
      })
    }

    // Environmental layer is optional (no error if missing)
    // But if present, validate it

    // === ZOD SCHEMA VALIDATION ===

    // Validate behavioral layer against schema
    if (data.behavioral && this.options.checkBehavioral) {
      try {
        DeveloperBehaviorSchema.parse(data.behavioral)
      } catch (error: any) {
        if (error.errors && Array.isArray(error.errors)) {
          for (const err of error.errors) {
            errors.push({
              field: `behavioral.${err.path.join('.')}`,
              message: err.message,
              code: 'BEHAVIORAL_SCHEMA_ERROR'
            })
          }
        }
      }
    }

    // Validate AI personality layer against schema
    if (data.ai_personality && this.options.checkAIPersonality) {
      try {
        DeveloperAIPersonalitySchema.parse(data.ai_personality)
      } catch (error: any) {
        if (error.errors && Array.isArray(error.errors)) {
          for (const err of error.errors) {
            errors.push({
              field: `ai_personality.${err.path.join('.')}`,
              message: err.message,
              code: 'AI_PERSONALITY_SCHEMA_ERROR'
            })
          }
        }
      }
    }

    // Validate environmental layer against schema (only if present)
    if (data.environmental) {
      try {
        DeveloperEnvironmentSchema.parse(data.environmental)
      } catch (error: any) {
        if (error.errors && Array.isArray(error.errors)) {
          for (const err of error.errors) {
            errors.push({
              field: `environmental.${err.path.join('.')}`,
              message: err.message,
              code: 'ENVIRONMENTAL_SCHEMA_ERROR'
            })
          }
        }
      }
    }

    // Full IdiomarkD file validation
    try {
      IdiomarkDSchema.parse(data)
    } catch (error: any) {
      if (error.errors && Array.isArray(error.errors)) {
        for (const err of error.errors) {
          errors.push({
            field: err.path.join('.'),
            message: err.message,
            code: 'FULL_SCHEMA_ERROR'
          })
        }
      }
    }

    // === STRICT MODE ADDITIONAL CHECKS ===

    if (this.options.strict && data.behavioral) {
      // Check cognitive_style has valid enum values
      const validProblemSolving = ['iterative_refinement', 'divide_conquer', 'mvp_first', 'spike_first']
      const validLearningStyle = ['experimentation', 'research_driven', 'copy_existing_similar']
      const validDocumentationPreference = ['code_first_comments_selective', 'comments_first_code_second', 'docstring_driven']

      if (data.behavioral.cognitive_style?.problem_solving &&
          !validProblemSolving.includes(data.behavioral.cognitive_style.problem_solving)) {
        errors.push({
          field: 'behavioral.cognitive_style.problem_solving',
          message: `Invalid problem_solving value: ${data.behavioral.cognitive_style.problem_solving}`,
          code: 'INVALID_ENUM_VALUE'
        })
      }

      if (data.behavioral.cognitive_style?.learning_style &&
          !validLearningStyle.includes(data.behavioral.cognitive_style.learning_style)) {
        errors.push({
          field: 'behavioral.cognitive_style.learning_style',
          message: `Invalid learning_style value: ${data.behavioral.cognitive_style.learning_style}`,
          code: 'INVALID_ENUM_VALUE'
        })
      }

      if (data.behavioral.cognitive_style?.documentation_preference &&
          !validDocumentationPreference.includes(data.behavioral.cognitive_style.documentation_preference)) {
        errors.push({
          field: 'behavioral.cognitive_style.documentation_preference',
          message: `Invalid documentation_preference value: ${data.behavioral.cognitive_style.documentation_preference}`,
          code: 'INVALID_ENUM_VALUE'
        })
      }

      // Check code_structure: functional_preference is 0-1
      if (data.behavioral.code_structure?.functional_preference !== undefined) {
        const fp = data.behavioral.code_structure.functional_preference
        if (typeof fp !== 'number' || fp < 0 || fp > 1) {
          errors.push({
            field: 'behavioral.code_structure.functional_preference',
            message: `functional_preference must be between 0 and 1, got ${fp}`,
            code: 'INVALID_RANGE'
          })
        }
      }

      // Check code_structure: max_function_length is positive
      if (data.behavioral.code_structure?.max_function_length !== undefined) {
        const mfl = data.behavioral.code_structure.max_function_length
        if (typeof mfl !== 'number' || mfl <= 0) {
          errors.push({
            field: 'behavioral.code_structure.max_function_length',
            message: `max_function_length must be positive, got ${mfl}`,
            code: 'INVALID_VALUE'
          })
        }
      }
    }

    if (this.options.strict && data.ai_personality) {
      // Check voice tone certainty is in enum
      const validCertainty = ['confident_with_hedges', 'very_certain', 'uncertain_and_ask']

      if (data.ai_personality.voice?.tone?.certainty &&
          !validCertainty.includes(data.ai_personality.voice.tone.certainty)) {
        errors.push({
          field: 'ai_personality.voice.tone.certainty',
          message: `Invalid certainty value: ${data.ai_personality.voice.tone.certainty}`,
          code: 'INVALID_ENUM_VALUE'
        })
      }

      // Check formality, humor, sarcasm, enthusiasm, directness are 0-1
      const zeroToOneFields = ['formality', 'humor', 'sarcasm', 'enthusiasm', 'directness']

      for (const field of zeroToOneFields) {
        if (data.ai_personality.voice?.[field] !== undefined) {
          const value = data.ai_personality.voice[field]
          if (typeof value !== 'number' || value < 0 || value > 1) {
            errors.push({
              field: `ai_personality.voice.${field}`,
              message: `${field} must be between 0 and 1, got ${value}`,
              code: 'INVALID_RANGE'
            })
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      version: data.idiomark || 'unknown',
      id: data.id || 'unknown',
      created: data.created || 'unknown',
      sources: data.metadata?.sources || [],
      profile_type: data.profile_type || 'unknown',
      errors
    }
  }
}

/**
 * Convenience function to validate a IdiomarkD file
 */
export async function validateIdiomarkD(data: any, options?: IdiomarkDValidatorOptions): Promise<ValidationResult> {
  const validator = new IdiomarkDValidator(options)
  return validator.validate(data)
}
