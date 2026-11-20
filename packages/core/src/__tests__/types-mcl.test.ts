/**
 * MCL-Preferences Schema Tests (Section 13)
 *
 * Tests for Machine Consumer Loop preferences validation
 */

import { describe, it, expect } from 'vitest'
import { validateMCLPreferences, type MCLPreferencesInput } from '../types-mcl'

describe('MCL-Preferences', () => {
  describe('Restaurant Preferences', () => {
    it('should validate restaurant preferences', () => {
      const prefs: MCLPreferencesInput = {
        restaurant_preferences: {
          allergies: ['peanuts', 'shellfish'],
          dietary_restrictions: ['vegetarian'],
          seating_preferences: 'booth',
          service_style: 'conversational'
        },
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'neutral',
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject invalid service style', () => {
      const prefs: MCLPreferencesInput = {
        restaurant_preferences: {
          service_style: 'invalid_style' as any
        },
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'neutral',
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(false)
      expect(result.errors?.restaurant_preferences).toBeDefined()
    })
  })

  describe('Medical Data', () => {
    it('should validate medical data with medications', () => {
      const prefs: MCLPreferencesInput = {
        medical_data: {
          blood_type: 'O+',
          conditions: ['asthma'],
          medications: [
            { name: 'Albuterol', dosage: '90mcg', frequency: 'as needed' }
          ],
          emergency_contacts: [
            { name: 'Jane Doe', relationship: 'spouse', phone: '555-1234' }
          ],
          advance_directives: 'DNR on file'
        },
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'neutral',
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })
  })

  describe('Learning Profile', () => {
    it('should validate learning profile', () => {
      const prefs: MCLPreferencesInput = {
        learning_profile: {
          learning_style: 'visual',
          disabilities: [],
          cognitive_load_preference: 'moderate',
          session_duration_minutes: 30
        },
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'neutral',
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject invalid learning style', () => {
      const prefs: MCLPreferencesInput = {
        learning_profile: {
          learning_style: 'invalid' as any,
          disabilities: [],
          cognitive_load_preference: 'moderate',
          session_duration_minutes: 30
        },
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'neutral',
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(false)
      expect(result.errors?.learning_profile).toBeDefined()
    })
  })

  describe('Interaction Preferences', () => {
    it('should reject missing interaction_preferences (required)', () => {
      const prefs: MCLPreferencesInput = {
        restaurant_preferences: {
          service_style: 'quick'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(false)
      expect(result.errors?.interaction_preferences).toBeDefined()
    })

    it('should validate all formality levels', () => {
      const formalityLevels = ['casual', 'neutral', 'formal'] as const

      for (const level of formalityLevels) {
        const prefs: MCLPreferencesInput = {
          interaction_preferences: {
            personality_matching: true,
            formality_level: level,
            feedback_collection: 'standard',
            humor_tolerance: 'light'
          }
        }

        const result = validateMCLPreferences(prefs)
        expect(result.valid).toBe(true)
      }
    })

    it('should reject invalid formality level', () => {
      const prefs: MCLPreferencesInput = {
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'invalid' as any,
          feedback_collection: 'standard',
          humor_tolerance: 'light'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(false)
      expect(result.errors?.interaction_preferences).toBeDefined()
    })

    it('should validate all feedback collection options', () => {
      const feedbackOptions = ['minimal', 'standard', 'detailed'] as const

      for (const option of feedbackOptions) {
        const prefs: MCLPreferencesInput = {
          interaction_preferences: {
            personality_matching: true,
            formality_level: 'neutral',
            feedback_collection: option,
            humor_tolerance: 'light'
          }
        }

        const result = validateMCLPreferences(prefs)
        expect(result.valid).toBe(true)
      }
    })

    it('should validate all humor tolerance options', () => {
      const humorOptions = ['none', 'light', 'any'] as const

      for (const option of humorOptions) {
        const prefs: MCLPreferencesInput = {
          interaction_preferences: {
            personality_matching: true,
            formality_level: 'neutral',
            feedback_collection: 'standard',
            humor_tolerance: option
          }
        }

        const result = validateMCLPreferences(prefs)
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('Complete MCLPreferencesSection', () => {
    it('should validate a complete section with all optional fields', () => {
      const prefs: MCLPreferencesInput = {
        restaurant_preferences: {
          allergies: ['nuts'],
          dietary_restrictions: ['gluten-free'],
          seating_preferences: 'window',
          service_style: 'formal'
        },
        medical_data: {
          blood_type: 'A+',
          conditions: [],
          medications: [],
          emergency_contacts: [
            { name: 'John Smith', relationship: 'brother', phone: '555-9999' }
          ],
          advance_directives: ''
        },
        learning_profile: {
          learning_style: 'reading',
          disabilities: ['dyslexia'],
          cognitive_load_preference: 'minimal',
          session_duration_minutes: 15
        },
        interaction_preferences: {
          personality_matching: false,
          formality_level: 'formal',
          feedback_collection: 'detailed',
          humor_tolerance: 'none'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should validate minimal section with only required fields', () => {
      const prefs: MCLPreferencesInput = {
        interaction_preferences: {
          personality_matching: true,
          formality_level: 'casual',
          feedback_collection: 'minimal',
          humor_tolerance: 'any'
        }
      }

      const result = validateMCLPreferences(prefs)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })
  })
})
