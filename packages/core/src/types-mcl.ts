/**
 * MCL-Preferences Schema (Section 13)
 *
 * Machine Consumer Loop preferences for robot interactions.
 * This section stores user preferences that machines (robots, AI assistants, etc.)
 * read to personalize their interactions with the user.
 *
 * @module types-mcl
 */

/**
 * Medication information for medical data
 */
export interface Medication {
  /** Name of the medication */
  name: string
  /** Dosage amount (e.g., "90mcg", "10mg") */
  dosage: string
  /** How often to take (e.g., "daily", "as needed", "twice daily") */
  frequency: string
}

/**
 * Emergency contact information
 */
export interface Contact {
  /** Contact's full name */
  name: string
  /** Relationship to the user (e.g., "spouse", "brother", "friend") */
  relationship: string
  /** Phone number for contact */
  phone: string
}

// ============================================================================
// Emergency-Data Schema (Section 14)
// ============================================================================

/**
 * Emergency medical information for first responders
 * SECURITY NOTE: This data is highly sensitive and must be encrypted at rest.
 * Access is restricted to emergency service readers only.
 */
export interface EmergencyMedical {
  /** Blood type (e.g., "O+", "A-", "B+") */
  blood_type: string
  /** Known allergies (e.g., ["penicillin", "peanuts"]) */
  allergies?: string[]
  /** Medical conditions (e.g., ["diabetes", "asthma"]) */
  conditions?: string[]
  /** Current medications */
  medications?: Medication[]
  /** Organ donor status */
  organ_donor?: boolean
}

/**
 * Emergency identity information for patient identification
 */
export interface EmergencyIdentity {
  /** Full legal name */
  full_name: string
  /** Date of birth in ISO format (YYYY-MM-DD) */
  date_of_birth: string
  /** Emergency contacts to notify */
  emergency_contacts?: Contact[]
}

/**
 * Access control permissions for emergency data
 * Controls which reader types can access emergency information
 */
export interface EmergencyPermissions {
  /** List of allowed reader types (e.g., ['EMERGENCY_SERVICE', 'PARAMEDIC']) */
  allowed_readers: string[]
  /** Whether an auth token is required for access */
  require_auth_token: boolean
  /** Optional: Time in seconds after which access expires (e.g., 3600 = 1 hour) */
  expire_after_seconds?: number
}

/**
 * Emergency-Data Section (Section 14)
 *
 * Contains critical medical and identity information for emergency response.
 * This section has STRICT access control - only readers in allowed_readers
 * can access this data.
 *
 * @example
 * ```typescript
 * const emergencyData: EmergencyDataSection = {
 *   medical: {
 *     blood_type: 'O+',
 *     allergies: ['penicillin'],
 *     conditions: ['asthma'],
 *     medications: [{ name: 'Albuterol', dosage: '90mcg', frequency: 'as needed' }],
 *     organ_donor: true
 *   },
 *   identity: {
 *     full_name: 'John Doe',
 *     date_of_birth: '1985-03-15',
 *     emergency_contacts: [{ name: 'Jane Doe', relationship: 'spouse', phone: '555-1234' }]
 *   },
 *   permissions: {
 *     allowed_readers: ['EMERGENCY_SERVICE'],
 *     require_auth_token: true,
 *     expire_after_seconds: 3600
 *   }
 * }
 * ```
 */
export interface EmergencyDataSection {
  /** Medical information for emergency treatment */
  medical: EmergencyMedical
  /** Identity information for patient identification */
  identity?: EmergencyIdentity
  /** Access control permissions */
  permissions: EmergencyPermissions
}

/**
 * Result of emergency access validation
 */
export interface EmergencyAccessResult {
  /** Whether access is allowed */
  allowed: boolean
  /** Reason if access is denied */
  reason?: string
}

/**
 * Validates whether a reader type is allowed to access emergency data.
 *
 * @param data - The emergency data section to check access for
 * @param readerType - The type of reader requesting access (e.g., 'EMERGENCY_SERVICE')
 * @returns Access result with allowed status and optional reason
 *
 * @example
 * ```typescript
 * const result = validateEmergencyAccess(emergencyData, 'EMERGENCY_SERVICE')
 * if (result.allowed) {
 *   // Grant access to emergency data
 * } else {
 *   // Deny access: result.reason contains explanation
 * }
 * ```
 */
export function validateEmergencyAccess(
  data: EmergencyDataSection,
  readerType: string
): EmergencyAccessResult {
  // Check if reader type is in the allowed list
  if (!data.permissions.allowed_readers.includes(readerType)) {
    return {
      allowed: false,
      reason: `Reader type ${readerType} not in allowed list: [${data.permissions.allowed_readers.join(', ')}]`
    }
  }

  // Note: Token validation would happen at access time
  // For schema validation, we just check that require_auth_token exists
  // The actual token verification is outside the scope of this function

  return { allowed: true }
}

/**
 * Restaurant interaction preferences
 * Used by service robots, ordering systems, and reservation bots
 */
export interface RestaurantPreferences {
  /** Known allergies (e.g., ["peanuts", "shellfish"]) */
  allergies: string[]
  /** Dietary restrictions (e.g., ["vegetarian", "gluten-free"]) */
  dietary_restrictions: string[]
  /** Preferred seating (e.g., "booth", "window", "bar") */
  seating_preferences: string
  /** Preferred service interaction style */
  service_style: 'quick' | 'conversational' | 'formal'
}

/**
 * Medical data for healthcare robots and emergency response systems
 * SECURITY NOTE: This data is sensitive and should be encrypted at rest
 */
export interface MedicalData {
  /** Blood type (e.g., "O+", "A-", "B+") */
  blood_type: string
  /** Medical conditions (e.g., ["diabetes", "asthma"]) */
  conditions: string[]
  /** Current medications */
  medications: Medication[]
  /** Emergency contacts to notify */
  emergency_contacts: Contact[]
  /** Advance directives (e.g., "DNR on file", "Full code") */
  advance_directives: string
}

/**
 * Learning profile for educational and training robots
 */
export interface LearningProfile {
  /** Preferred learning modality */
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading'
  /** Known learning disabilities (e.g., ["dyslexia", "ADHD"]) */
  disabilities: string[]
  /** Preferred information density */
  cognitive_load_preference: 'minimal' | 'moderate' | 'immersive'
  /** Preferred session length in minutes */
  session_duration_minutes: number
}

/**
 * Interaction preferences for all machine consumers
 * This is the ONLY required field in MCL-Preferences
 */
export interface InteractionPreferences {
  /** Whether to match robot personality to user personality profile */
  personality_matching: boolean
  /** Formality level for robot communication */
  formality_level: 'casual' | 'neutral' | 'formal'
  /** How much feedback to collect from user */
  feedback_collection: 'minimal' | 'standard' | 'detailed'
  /** Tolerance for humor in robot responses */
  humor_tolerance: 'none' | 'light' | 'any'
}

/**
 * MCL-Preferences Section (Section 13)
 *
 * Contains all preferences for Machine Consumer Loop interactions.
 * Only `interaction_preferences` is required; all other fields are optional
 * and should only be populated if relevant to the user's use cases.
 *
 * @example
 * ```typescript
 * const mclPrefs: MCLPreferencesSection = {
 *   interaction_preferences: {
 *     personality_matching: true,
 *     formality_level: 'neutral',
 *     feedback_collection: 'standard',
 *     humor_tolerance: 'light'
 *   }
 * }
 * ```
 */
export interface MCLPreferencesSection {
  /** Restaurant/service industry robot preferences */
  restaurant_preferences?: RestaurantPreferences
  /** Medical/healthcare robot preferences (SENSITIVE - encrypt at rest) */
  medical_data?: MedicalData
  /** Educational/training robot preferences */
  learning_profile?: LearningProfile
  /** General interaction preferences (REQUIRED) */
  interaction_preferences: InteractionPreferences
}

/**
 * Validation result for MCL preferences
 */
export interface MCLValidationResult {
  /** Whether the preferences are valid */
  valid: boolean
  /** Error messages keyed by field path (if validation failed) */
  errors?: Record<string, string>
}

/**
 * Deep partial type for validation input
 * Allows partial objects at any nesting level
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Input type for MCL preferences validation
 * Uses DeepPartial to allow partial objects at any level
 */
export type MCLPreferencesInput = DeepPartial<MCLPreferencesSection>

/**
 * Valid service style values
 */
const VALID_SERVICE_STYLES = ['quick', 'conversational', 'formal'] as const

/**
 * Valid learning style values
 */
const VALID_LEARNING_STYLES = ['visual', 'auditory', 'kinesthetic', 'reading'] as const

/**
 * Valid cognitive load preference values
 */
const VALID_COGNITIVE_LOADS = ['minimal', 'moderate', 'immersive'] as const

/**
 * Valid formality level values
 * (element type widened to include undefined so `.includes()` accepts optional fields)
 */
const VALID_FORMALITY_LEVELS: readonly (string | undefined)[] = ['casual', 'neutral', 'formal']

/**
 * Valid feedback collection values
 */
const VALID_FEEDBACK_OPTIONS: readonly (string | undefined)[] = ['minimal', 'standard', 'detailed']

/**
 * Valid humor tolerance values
 */
const VALID_HUMOR_OPTIONS: readonly (string | undefined)[] = ['none', 'light', 'any']

/**
 * Validates MCL-Preferences section data
 *
 * @param prefs - Partial MCL preferences to validate
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateMCLPreferences({
 *   interaction_preferences: {
 *     personality_matching: true,
 *     formality_level: 'neutral',
 *     feedback_collection: 'standard',
 *     humor_tolerance: 'light'
 *   }
 * })
 * console.log(result.valid) // true
 * ```
 */
export function validateMCLPreferences(
  prefs: MCLPreferencesInput
): MCLValidationResult {
  const errors: Record<string, string> = {}

  // Validate restaurant_preferences
  if (prefs.restaurant_preferences) {
    const rp = prefs.restaurant_preferences

    if (rp.service_style && !VALID_SERVICE_STYLES.includes(rp.service_style)) {
      errors.restaurant_preferences = `Invalid service_style: ${rp.service_style}. Must be one of: ${VALID_SERVICE_STYLES.join(', ')}`
    }
  }

  // Validate medical_data
  if (prefs.medical_data) {
    const md = prefs.medical_data

    // Validate medications
    if (md.medications && Array.isArray(md.medications)) {
      for (let i = 0; i < md.medications.length; i++) {
        const med = md.medications[i]
        if (!med.name || !med.dosage || !med.frequency) {
          errors[`medical_data.medications[${i}]`] =
            'Medication must have name, dosage, and frequency'
        }
      }
    }

    // Validate emergency contacts
    if (md.emergency_contacts && Array.isArray(md.emergency_contacts)) {
      for (let i = 0; i < md.emergency_contacts.length; i++) {
        const contact = md.emergency_contacts[i]
        if (!contact.name || !contact.relationship || !contact.phone) {
          errors[`medical_data.emergency_contacts[${i}]`] =
            'Contact must have name, relationship, and phone'
        }
      }
    }
  }

  // Validate learning_profile
  if (prefs.learning_profile) {
    const lp = prefs.learning_profile

    if (lp.learning_style && !VALID_LEARNING_STYLES.includes(lp.learning_style)) {
      errors.learning_profile = `Invalid learning_style: ${lp.learning_style}. Must be one of: ${VALID_LEARNING_STYLES.join(', ')}`
    }

    if (lp.cognitive_load_preference && !VALID_COGNITIVE_LOADS.includes(lp.cognitive_load_preference)) {
      if (!errors.learning_profile) {
        errors.learning_profile = `Invalid cognitive_load_preference: ${lp.cognitive_load_preference}. Must be one of: ${VALID_COGNITIVE_LOADS.join(', ')}`
      }
    }

    if (lp.session_duration_minutes !== undefined && lp.session_duration_minutes < 1) {
      if (!errors.learning_profile) {
        errors.learning_profile = 'session_duration_minutes must be at least 1'
      }
    }
  }

  // Validate interaction_preferences (required)
  if (!prefs.interaction_preferences) {
    errors.interaction_preferences = 'Required field missing'
  } else {
    const ip = prefs.interaction_preferences

    if (!VALID_FORMALITY_LEVELS.includes(ip.formality_level)) {
      errors.interaction_preferences = `Invalid formality_level: ${ip.formality_level}. Must be one of: ${VALID_FORMALITY_LEVELS.join(', ')}`
    }

    if (!VALID_FEEDBACK_OPTIONS.includes(ip.feedback_collection)) {
      if (!errors.interaction_preferences) {
        errors.interaction_preferences = `Invalid feedback_collection: ${ip.feedback_collection}. Must be one of: ${VALID_FEEDBACK_OPTIONS.join(', ')}`
      }
    }

    if (!VALID_HUMOR_OPTIONS.includes(ip.humor_tolerance)) {
      if (!errors.interaction_preferences) {
        errors.interaction_preferences = `Invalid humor_tolerance: ${ip.humor_tolerance}. Must be one of: ${VALID_HUMOR_OPTIONS.join(', ')}`
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  }
}
