/**
 * IdiomarkF - Idiomark Forms
 *
 * Universal profile schema for form-filling across any service.
 * Part of the Idiomark Ecosystem: IdiomarkF (Forms) + IdiomarkH (Human) + IdiomarkS (Sign) + IdiomarkA+ (Agents)
 *
 * @module types-idiomarkf
 * @version 1.0.0
 */

/**
 * IdiomarkF Profile Version
 */
export const IdiomarkF_VERSION = '1.0.0'

/**
 * Core identity information needed for ANY form
 */
export interface IdiomarkFIdentity {
  /** Name fields */
  name: {
    first: string
    middle?: string
    last: string
    preferred?: string // Nickname or preferred name
    suffix?: string // Jr., Sr., PhD, etc.
  }

  /** Email addresses */
  email: {
    primary: string
    alternatives?: string[]
    verified?: boolean
  }

  /** Phone numbers (optional; many profiles have no phone on file) */
  phone?: {
    primary: string
    alternatives?: string[]
    type?: 'mobile' | 'landline' | 'voip'
    sms_capable?: boolean
  }

  /** Physical address */
  address?: {
    street1: string
    street2?: string
    city: string
    state?: string // or province, region
    postal_code: string
    country: string // ISO 3166-1 alpha-2
  }

  /** Location for remote/digital purposes */
  location?: {
    city: string
    state?: string
    country: string
    timezone?: string // IANA timezone (e.g., "America/New_York")
    locale?: string // e.g., "en-US"
  }

  /** Date of birth */
  birthdate?: string // ISO 8601 date (YYYY-MM-DD)

  /** Profile photo URL */
  avatar_url?: string

  /** Personal website or bio link */
  website?: string

  /** Pronouns */
  pronouns?: string // e.g., "they/them", "she/her"
}

/**
 * Professional/work-related information
 * Used for job applications, business profiles, networking
 */
export interface IdiomarkFProfessional {
  /** Current or target job title */
  title: string

  /** Current employer */
  company?: string

  /** Industry or field */
  industry?: string

  /** Years of experience */
  experience_years?: number

  /** Employment type preference */
  employment_type?: ('full-time' | 'part-time' | 'contract' | 'freelance' | 'internship')[]

  /** Work arrangement preference */
  work_arrangement?: ('onsite' | 'remote' | 'hybrid')[]

  /** Education history */
  education?: IdiomarkFEducation[]

  /** Work history */
  work_history?: IdiomarkFWorkExperience[]

  /** Skills (plain text or categorized) */
  skills?: string[] | IdiomarkFSkills

  /** Certifications and licenses */
  certifications?: IdiomarkFCertification[]

  /** Languages spoken */
  languages?: IdiomarkFLanguage[]

  /** Online profiles */
  profiles?: {
    linkedin?: string
    github?: string
    portfolio?: string
    twitter?: string
    dribbble?: string
    behance?: string
    artstation?: string
    other?: Record<string, string>
  }

  /** Resume/CV document URL */
  resume_url?: string

  /** Salary expectations */
  salary_expectation?: {
    amount: number
    currency: string // ISO 4217
    period: 'hourly' | 'monthly' | 'yearly'
    negotiable?: boolean
  }

  /** Availability */
  availability?: {
    status: 'immediately' | '2-weeks' | '1-month' | 'flexible' | 'not-looking'
    start_date?: string
    notice_period_days?: number
  }
}

/**
 * Education entry
 */
export interface IdiomarkFEducation {
  institution: string
  degree: string // e.g., "Bachelor of Science"
  field: string // e.g., "Computer Science"
  start_date?: string
  end_date?: string
  gpa?: number
  honors?: string[]
  location?: string
  currently_enrolled?: boolean
}

/**
 * Work experience entry
 */
export interface IdiomarkFWorkExperience {
  company: string
  title: string
  start_date: string
  end_date?: string
  currently_employed?: boolean
  location?: string
  remote?: boolean
  description?: string
  achievements?: string[]
  technologies?: string[]
}

/**
 * Categorized skills
 */
export interface IdiomarkFSkills {
  technical?: string[]
  soft?: string[]
  tools?: string[]
  frameworks?: string[]
  languages?: string[] // Programming languages
  domains?: string[] // Domain expertise
}

/**
 * Certification entry
 */
export interface IdiomarkFCertification {
  name: string
  issuer: string
  date_obtained?: string
  expiration_date?: string
  credential_id?: string
  credential_url?: string
}

/**
 * Language proficiency
 */
export interface IdiomarkFLanguage {
  language: string
  proficiency: 'basic' | 'conversational' | 'professional' | 'native' | 'fluent'
  can_read?: boolean
  can_write?: boolean
  can_speak?: boolean
}

/**
 * User preferences for form-filling and communication
 */
export interface IdiomarkFPreferences {
  /** Preferred communication method */
  communication?: 'email' | 'phone' | 'sms' | 'video' | 'chat'

  /** Best times to contact */
  contact_hours?: {
    start: string // e.g., "09:00"
    end: string // e.g., "17:00"
    timezone: string
    days?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]
  }

  /** Language preference */
  language?: string // ISO 639-1 code

  /** Currency preference */
  currency?: string // ISO 4217 code

  /** Date format preference */
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

  /** Measurement system */
  units?: 'metric' | 'imperial'

  /** Marketing preferences */
  marketing?: {
    email_opt_in?: boolean
    sms_opt_in?: boolean
    third_party_opt_in?: boolean
  }

  /** Privacy level preference */
  privacy_level?: 'public' | 'limited' | 'private'
}

/**
 * Emergency contact information
 * Used for healthcare, travel, employment forms
 */
export interface IdiomarkFEmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
  address?: string
  is_primary?: boolean
}

/**
 * Gaming-specific profile extension
 * Aligns with IdiomarkG (Idiomark for Gaming)
 */
export interface IdiomarkFGaming {
  /** Gaming platforms */
  platforms?: {
    steam?: string
    playstation?: string
    xbox?: string
    nintendo?: string
    epic?: string
    battle_net?: string
    riot?: string
    origin?: string
    mobile?: string
    other?: Record<string, string>
  }

  /** Gaming preferences */
  preferences?: {
    genres?: string[]
    playstyle?: 'casual' | 'hardcore' | 'competitive' | 'cooperative'
    play_time?: string // e.g., "weekends", "evenings"
    timezone?: string
  }

  /** Competitive/gaming experience */
  competitive?: {
    rank?: string
    divisions?: string[]
    teams?: string[]
    achievements?: string[]
  }

  /** Streaming/content creation */
  content_creation?: {
    twitch?: string
    youtube?: string
    tiktok?: string
    discord?: string
  }
}

/**
 * Social media and online presence
 */
export interface IdiomarkFSocial {
  twitter?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  youtube?: string
  twitch?: string
  discord?: string
  reddit?: string
  medium?: string
  substack?: string
  mastodon?: string
  bluesky?: string
  other?: Record<string, string>
}

/**
 * Custom fields for extensibility
 */
export interface IdiomarkFCustomField {
  key: string
  value: string | number | boolean | string[] | object
  label?: string // Human-readable label
  type?: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date'
  category?: string // Group custom fields by category
  sensitive?: boolean // Mark as sensitive data
}

/**
 * Service connection record
 * Tracks which services have received this IdiomarkF data
 */
export interface IdiomarkFServiceConnection {
  service_id: string
  service_name: string
  service_type: 'job_board' | 'social' | 'ecommerce' | 'government' | 'business' | 'other'
  connected_at: string
  last_used?: string
  data_shared: string[] // Fields that were shared
  consent_given?: boolean
  deletion_requested?: boolean
  deletion_completed?: boolean
}

/**
 * Environmental impact tracking
 * Measures carbon, time, and paper savings from using IdiomarkF
 */
export interface IdiomarkFImpactMetrics {
  /** Total forms filled with IdiomarkF */
  forms_filled: number

  /** Total time saved in seconds */
  time_saved_seconds: number

  /** Estimated carbon saved in grams CO2e */
  carbon_saved_grams: number

  /** Paper forms eliminated (estimated) */
  paper_forms_eliminated: number

  /** Energy saved in watt-hours */
  energy_saved_wh: number

  /** Breakdown by form type */
  by_type?: Record<string, {
    count: number
    time_saved_seconds: number
    carbon_saved_grams: number
  }>

  /** Tracking period */
  period?: {
    start: string
    end: string
  }
}

/**
 * Single form fill impact record
 */
export interface IdiomarkFFillImpact {
  /** Timestamp of form fill */
  timestamp: string

  /** Form type/category */
  form_type: 'job_application' | 'contact' | 'signup' | 'checkout' | 'government' | 'medical' | 'rental' | 'mortgage' | 'other'

  /** Time saved in seconds (compared to manual fill) */
  time_saved_seconds: number

  /** Carbon saved in grams CO2e */
  carbon_saved_grams: number

  /** Number of fields auto-filled */
  fields_filled: number

  /** Whether this replaced a paper form */
  paper_eliminated: boolean

  /** Service/form URL */
  service?: string

  /** Energy saved in watt-hours */
  energy_saved_wh: number
}

/**
 * Impact calculation constants
 * Based on research estimates for form-filling energy consumption
 */
export const IdiomarkF_IMPACT_CONSTANTS = {
  /** Average time to manually fill one form field (seconds) */
  AVG_TIME_PER_FIELD_SEC: 8,

  /** Average time to auto-fill one field (seconds) */
  AUTO_FILL_TIME_PER_FIELD_SEC: 0.1,

  /** CO2e per second of user device time (grams) - includes device + network */
  CO2_PER_SECOND_GRAMS: 0.2,

  /** Energy per second of form filling (watt-hours) */
  ENERGY_PER_SECOND_WH: 0.5,

  /** CO2e per paper page (grams) - production + disposal */
  CO2_PER_PAPER_PAGE_GRAMS: 5,

  /** Average fields per form by type */
  AVG_FIELDS_BY_TYPE: {
    job_application: 45,
    contact: 8,
    signup: 6,
    checkout: 12,
    government: 35,
    medical: 40,
    rental: 25,
    mortgage: 60,
    other: 15
  } as const
}

/**
 * Complete IdiomarkF Profile
 */
export interface IdiomarkFProfile {
  /** IdiomarkF schema version */
  version: string

  /** Unique profile identifier */
  id: string

  /** Profile creation timestamp */
  created: string

  /** Last update timestamp */
  updated: string

  /** Profile name (for managing multiple profiles) */
  name?: string

  /** Profile type/purpose */
  type?: 'personal' | 'professional' | 'gaming' | 'business' | 'freelance' | 'custom'

  /** Is this the default profile? */
  default?: boolean

  /** Core identity (required) */
  identity: IdiomarkFIdentity

  /** Professional information */
  professional?: IdiomarkFProfessional

  /** User preferences */
  preferences?: IdiomarkFPreferences

  /** Emergency contacts */
  emergency_contacts?: IdiomarkFEmergencyContact[]

  /** Gaming extension */
  gaming?: IdiomarkFGaming

  /** Social media */
  social?: IdiomarkFSocial

  /** Custom fields */
  custom?: IdiomarkFCustomField[]

  /** Service connections (for kill switch) */
  connections?: IdiomarkFServiceConnection[]

  /** Environmental impact tracking */
  impact?: IdiomarkFImpactMetrics

  /** Cryptographic signature */
  signature?: string

  /** Metadata */
  metadata?: {
    source?: string // Where profile was created
    tags?: string[]
    notes?: string
  }
}

/**
 * Input for creating a new IdiomarkF profile
 */
export interface IdiomarkFInput {
  name?: string
  type?: IdiomarkFProfile['type']
  identity: Partial<IdiomarkFIdentity>
  professional?: Partial<IdiomarkFProfessional>
  preferences?: Partial<IdiomarkFPreferences>
  emergency_contacts?: Partial<IdiomarkFEmergencyContact>[]
  gaming?: Partial<IdiomarkFGaming>
  social?: Partial<IdiomarkFSocial>
  custom?: Partial<IdiomarkFCustomField>[]
  metadata?: IdiomarkFProfile['metadata']
}

/**
 * Result of IdiomarkF validation
 */
export interface IdiomarkFValidationResult {
  valid: boolean
  version: string
  id: string
  errors: IdiomarkFValidationError[]
  warnings?: IdiomarkFValidationWarning[]
}

/**
 * Validation error
 */
export interface IdiomarkFValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning'
}

/**
 * Validation warning (non-blocking issues)
 */
export interface IdiomarkFValidationWarning {
  field: string
  message: string
  suggestion?: string
}

/**
 * Form field mapping
 * Used by browser extension to map form fields to IdiomarkF data
 */
export interface IdiomarkFFieldMapping {
  /** Form field name/id/label */
  form_field: string

  /** IdiomarkF field path (dot notation) */
  idiomarkf_field: string

  /** Confidence score for auto-mapping */
  confidence?: number

  /** Transform function name */
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'phone_format' | 'date_format'

  /** Is this field required? */
  required?: boolean
}

/**
 * Form fill request
 */
export interface IdiomarkFFillRequest {
  /** URL of the form */
  url: string

  /** Form fields detected */
  fields: {
    name: string
    type: string
    label?: string
    placeholder?: string
    required?: boolean
    options?: string[]
  }[]

  /** Profile to use for filling */
  profile_id: string

  /** Specific fields to fill (omit for all) */
  fields_to_fill?: string[]

  /** Auto-submit after filling? */
  auto_submit?: boolean
}

/**
 * Form fill result
 */
export interface IdiomarkFFillResult {
  success: boolean
  fields_filled: number
  fields_skipped: string[]
  errors?: string[]
  connection_recorded?: boolean
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a IdiomarkF profile
 */
export function validateIdiomarkF(profile: unknown): IdiomarkFValidationResult {
  const errors: IdiomarkFValidationError[] = []
  const warnings: IdiomarkFValidationWarning[] = []

  // Type guard
  if (typeof profile !== 'object' || profile === null) {
    return {
      valid: false,
      version: 'unknown',
      id: 'unknown',
      errors: [{
        field: 'root',
        message: 'Profile must be an object',
        code: 'INVALID_TYPE',
        severity: 'error'
      }]
    }
  }

  const p = profile as Partial<IdiomarkFProfile>

  // Required fields
  if (!p.version) {
    errors.push({ field: 'version', message: 'Version is required', code: 'MISSING_VERSION', severity: 'error' })
  }

  if (!p.id) {
    errors.push({ field: 'id', message: 'ID is required', code: 'MISSING_ID', severity: 'error' })
  }

  if (!p.created) {
    errors.push({ field: 'created', message: 'Created timestamp is required', code: 'MISSING_CREATED', severity: 'error' })
  }

  if (!p.identity) {
    errors.push({ field: 'identity', message: 'Identity is required', code: 'MISSING_IDENTITY', severity: 'error' })
  } else {
    // Validate identity
    if (!p.identity.name?.first) {
      errors.push({ field: 'identity.name.first', message: 'First name is required', code: 'MISSING_FIRST_NAME', severity: 'error' })
    }
    if (!p.identity.name?.last) {
      errors.push({ field: 'identity.name.last', message: 'Last name is required', code: 'MISSING_LAST_NAME', severity: 'error' })
    }
    if (!p.identity.email?.primary) {
      errors.push({ field: 'identity.email.primary', message: 'Primary email is required', code: 'MISSING_EMAIL', severity: 'error' })
    } else if (!isValidEmail(p.identity.email.primary)) {
      errors.push({ field: 'identity.email.primary', message: 'Invalid email format', code: 'INVALID_EMAIL', severity: 'error' })
    }
    if (p.identity.phone?.primary && !isValidPhone(p.identity.phone.primary)) {
      warnings.push({ field: 'identity.phone.primary', message: 'Phone number format may be invalid', suggestion: 'Use E.164 format: +1234567890' })
    }
  }

  // Warnings for incomplete profiles
  if (!p.professional?.title && p.type === 'professional') {
    warnings.push({ field: 'professional.title', message: 'Professional profile missing job title' })
  }

  return {
    valid: errors.length === 0,
    version: p.version || 'unknown',
    id: p.id || 'unknown',
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates phone number (E.164 or common formats)
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Creates a new IdiomarkF profile with defaults
 */
export function createIdiomarkFProfile(input: IdiomarkFInput): IdiomarkFProfile {
  const now = new Date().toISOString()
  const id = generateIdiomarkFId()

  return {
    version: IdiomarkF_VERSION,
    id,
    created: now,
    updated: now,
    name: input.name,
    type: input.type || 'personal',
    default: false,
    identity: {
      name: {
        first: input.identity?.name?.first || '',
        middle: input.identity?.name?.middle,
        last: input.identity?.name?.last || '',
        preferred: input.identity?.name?.preferred,
        suffix: input.identity?.name?.suffix
      },
      email: {
        primary: input.identity?.email?.primary || '',
        alternatives: input.identity?.email?.alternatives,
        verified: input.identity?.email?.verified
      },
      phone: input.identity?.phone ? { ...input.identity.phone } : undefined,
      address: input.identity?.address,
      location: input.identity?.location,
      birthdate: input.identity?.birthdate,
      avatar_url: input.identity?.avatar_url,
      website: input.identity?.website,
      pronouns: input.identity?.pronouns
    },
    professional: input.professional ? { ...input.professional } as IdiomarkFProfessional : undefined,
    preferences: input.preferences ? { ...input.preferences } as IdiomarkFPreferences : undefined,
    emergency_contacts: input.emergency_contacts?.map(e => ({ ...e })) as IdiomarkFEmergencyContact[] | undefined,
    gaming: input.gaming ? { ...input.gaming } as IdiomarkFGaming : undefined,
    social: input.social ? { ...input.social } as IdiomarkFSocial : undefined,
    custom: input.custom?.map(c => ({ ...c })) as IdiomarkFCustomField[] | undefined,
    metadata: input.metadata
  }
}

/**
 * Generates a unique IdiomarkF ID
 */
function generateIdiomarkFId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `idiomarkf_${timestamp}_${random}`
}

/**
 * Gets a field value from a IdiomarkF profile using dot notation
 */
export function getIdiomarkFField(profile: IdiomarkFProfile, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = profile

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Sets a field value in a IdiomarkF profile using dot notation
 */
export function setIdiomarkFField(profile: IdiomarkFProfile, path: string, value: unknown): IdiomarkFProfile {
  const parts = path.split('.')
  const result = JSON.parse(JSON.stringify(profile)) as IdiomarkFProfile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = result

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
  result.updated = new Date().toISOString()

  return result
}

// ============================================================================
// IMPACT CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculates the environmental impact of a single form fill
 */
export function calculateFillImpact(
  formType: IdiomarkFFillImpact['form_type'],
  fieldsFilled: number,
  options?: {
    paperEliminated?: boolean
    service?: string
  }
): IdiomarkFFillImpact {
  const avgFields = IdiomarkF_IMPACT_CONSTANTS.AVG_FIELDS_BY_TYPE[formType] || IdiomarkF_IMPACT_CONSTANTS.AVG_FIELDS_BY_TYPE.other
  const actualFields = fieldsFilled || avgFields

  // Time saved = (manual time - auto time) * fields
  const manualTime = actualFields * IdiomarkF_IMPACT_CONSTANTS.AVG_TIME_PER_FIELD_SEC
  const autoTime = actualFields * IdiomarkF_IMPACT_CONSTANTS.AUTO_FILL_TIME_PER_FIELD_SEC
  const timeSaved = manualTime - autoTime

  // Carbon saved from reduced device time
  const carbonFromTime = timeSaved * IdiomarkF_IMPACT_CONSTANTS.CO2_PER_SECOND_GRAMS

  // Carbon saved from paper (if applicable)
  const carbonFromPaper = options?.paperEliminated
    ? Math.ceil(actualFields / 10) * IdiomarkF_IMPACT_CONSTANTS.CO2_PER_PAPER_PAGE_GRAMS // ~10 fields per page
    : 0

  // Energy saved
  const energySaved = timeSaved * IdiomarkF_IMPACT_CONSTANTS.ENERGY_PER_SECOND_WH

  return {
    timestamp: new Date().toISOString(),
    form_type: formType,
    time_saved_seconds: Math.round(timeSaved),
    carbon_saved_grams: Math.round((carbonFromTime + carbonFromPaper) * 100) / 100,
    fields_filled: actualFields,
    paper_eliminated: options?.paperEliminated ?? false,
    service: options?.service,
    energy_saved_wh: Math.round(energySaved * 100) / 100
  }
}

/**
 * Aggregates impact metrics from multiple fill records
 */
export function aggregateImpact(fills: IdiomarkFFillImpact[]): IdiomarkFImpactMetrics {
  const byType: Record<string, { count: number; time_saved_seconds: number; carbon_saved_grams: number }> = {}

  let totalTimeSaved = 0
  let totalCarbonSaved = 0
  let totalFields = 0
  let paperForms = 0
  let totalEnergy = 0

  for (const fill of fills) {
    totalTimeSaved += fill.time_saved_seconds
    totalCarbonSaved += fill.carbon_saved_grams
    totalFields += fill.fields_filled
    totalEnergy += fill.energy_saved_wh
    if (fill.paper_eliminated) paperForms++

    // Aggregate by type
    if (!byType[fill.form_type]) {
      byType[fill.form_type] = { count: 0, time_saved_seconds: 0, carbon_saved_grams: 0 }
    }
    byType[fill.form_type].count++
    byType[fill.form_type].time_saved_seconds += fill.time_saved_seconds
    byType[fill.form_type].carbon_saved_grams += fill.carbon_saved_grams
  }

  return {
    forms_filled: fills.length,
    time_saved_seconds: totalTimeSaved,
    carbon_saved_grams: Math.round(totalCarbonSaved * 100) / 100,
    paper_forms_eliminated: paperForms,
    energy_saved_wh: Math.round(totalEnergy * 100) / 100,
    by_type: byType
  }
}

/**
 * Formats impact metrics for display
 */
export function formatImpactMetrics(metrics: IdiomarkFImpactMetrics): {
  time_saved: string
  carbon_saved: string
  energy_saved: string
  paper_saved: string
  forms_count: string
} {
  // Format time
  const hours = Math.floor(metrics.time_saved_seconds / 3600)
  const minutes = Math.floor((metrics.time_saved_seconds % 3600) / 60)
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`

  // Format carbon (convert grams to kg if large)
  const carbonKg = metrics.carbon_saved_grams / 1000
  const carbonStr = carbonKg >= 1
    ? `${carbonKg.toFixed(2)} kg CO2e`
    : `${metrics.carbon_saved_grams.toFixed(0)} g CO2e`

  // Format energy (convert Wh to kWh if large)
  const energyKwh = metrics.energy_saved_wh / 1000
  const energyStr = energyKwh >= 1
    ? `${energyKwh.toFixed(2)} kWh`
    : `${metrics.energy_saved_wh.toFixed(1)} Wh`

  return {
    time_saved: timeStr,
    carbon_saved: carbonStr,
    energy_saved: energyStr,
    paper_saved: `${metrics.paper_forms_eliminated} forms`,
    forms_count: `${metrics.forms_filled} forms`
  }
}

/**
 * Updates a profile's impact metrics with a new fill record
 */
export function recordFillImpact(
  profile: IdiomarkFProfile,
  fill: IdiomarkFFillImpact
): IdiomarkFProfile {
  const currentImpact = profile.impact || {
    forms_filled: 0,
    time_saved_seconds: 0,
    carbon_saved_grams: 0,
    paper_forms_eliminated: 0,
    energy_saved_wh: 0
  }

  const updatedImpact: IdiomarkFImpactMetrics = {
    forms_filled: currentImpact.forms_filled + 1,
    time_saved_seconds: currentImpact.time_saved_seconds + fill.time_saved_seconds,
    carbon_saved_grams: currentImpact.carbon_saved_grams + fill.carbon_saved_grams,
    paper_forms_eliminated: currentImpact.paper_forms_eliminated + (fill.paper_eliminated ? 1 : 0),
    energy_saved_wh: currentImpact.energy_saved_wh + fill.energy_saved_wh,
    by_type: {
      ...currentImpact.by_type,
      [fill.form_type]: {
        count: (currentImpact.by_type?.[fill.form_type]?.count || 0) + 1,
        time_saved_seconds: (currentImpact.by_type?.[fill.form_type]?.time_saved_seconds || 0) + fill.time_saved_seconds,
        carbon_saved_grams: (currentImpact.by_type?.[fill.form_type]?.carbon_saved_grams || 0) + fill.carbon_saved_grams
      }
    }
  }

  return {
    ...profile,
    impact: updatedImpact,
    updated: new Date().toISOString()
  }
}

/**
 * Common form field mappings
 * Used by browser extension for auto-detection
 */
export const COMMON_FIELD_MAPPINGS: IdiomarkFFieldMapping[] = [
  // Identity - Name
  { form_field: 'first_name', idiomarkf_field: 'identity.name.first', confidence: 0.95 },
  { form_field: 'firstname', idiomarkf_field: 'identity.name.first', confidence: 0.95 },
  { form_field: 'fname', idiomarkf_field: 'identity.name.first', confidence: 0.9 },
  { form_field: 'last_name', idiomarkf_field: 'identity.name.last', confidence: 0.95 },
  { form_field: 'lastname', idiomarkf_field: 'identity.name.last', confidence: 0.95 },
  { form_field: 'lname', idiomarkf_field: 'identity.name.last', confidence: 0.9 },
  { form_field: 'full_name', idiomarkf_field: 'identity.name.first', confidence: 0.7 },
  { form_field: 'name', idiomarkf_field: 'identity.name.first', confidence: 0.6 },
  { form_field: 'middle_name', idiomarkf_field: 'identity.name.middle', confidence: 0.9 },
  { form_field: 'middleinitial', idiomarkf_field: 'identity.name.middle', confidence: 0.85 },

  // Identity - Contact
  { form_field: 'email', idiomarkf_field: 'identity.email.primary', confidence: 0.95 },
  { form_field: 'email_address', idiomarkf_field: 'identity.email.primary', confidence: 0.95 },
  { form_field: 'e-mail', idiomarkf_field: 'identity.email.primary', confidence: 0.95 },
  { form_field: 'phone', idiomarkf_field: 'identity.phone.primary', confidence: 0.9 },
  { form_field: 'phone_number', idiomarkf_field: 'identity.phone.primary', confidence: 0.95 },
  { form_field: 'tel', idiomarkf_field: 'identity.phone.primary', confidence: 0.9 },
  { form_field: 'mobile', idiomarkf_field: 'identity.phone.primary', confidence: 0.9 },
  { form_field: 'cell', idiomarkf_field: 'identity.phone.primary', confidence: 0.85 },

  // Identity - Location
  { form_field: 'city', idiomarkf_field: 'identity.location.city', confidence: 0.9 },
  { form_field: 'state', idiomarkf_field: 'identity.location.state', confidence: 0.9 },
  { form_field: 'country', idiomarkf_field: 'identity.location.country', confidence: 0.9 },
  { form_field: 'zip', idiomarkf_field: 'identity.address.postal_code', confidence: 0.9 },
  { form_field: 'zip_code', idiomarkf_field: 'identity.address.postal_code', confidence: 0.95 },
  { form_field: 'postal_code', idiomarkf_field: 'identity.address.postal_code', confidence: 0.95 },
  { form_field: 'address', idiomarkf_field: 'identity.address.street1', confidence: 0.8 },
  { form_field: 'address1', idiomarkf_field: 'identity.address.street1', confidence: 0.95 },
  { form_field: 'street', idiomarkf_field: 'identity.address.street1', confidence: 0.9 },
  { form_field: 'address2', idiomarkf_field: 'identity.address.street2', confidence: 0.95 },
  { form_field: 'street2', idiomarkf_field: 'identity.address.street2', confidence: 0.9 },

  // Identity - Other
  { form_field: 'birthday', idiomarkf_field: 'identity.birthdate', confidence: 0.9 },
  { form_field: 'dob', idiomarkf_field: 'identity.birthdate', confidence: 0.95 },
  { form_field: 'birth_date', idiomarkf_field: 'identity.birthdate', confidence: 0.95 },
  { form_field: 'website', idiomarkf_field: 'identity.website', confidence: 0.9 },
  { form_field: 'url', idiomarkf_field: 'identity.website', confidence: 0.7 },

  // Professional
  { form_field: 'title', idiomarkf_field: 'professional.title', confidence: 0.85 },
  { form_field: 'job_title', idiomarkf_field: 'professional.title', confidence: 0.95 },
  { form_field: 'position', idiomarkf_field: 'professional.title', confidence: 0.85 },
  { form_field: 'company', idiomarkf_field: 'professional.company', confidence: 0.9 },
  { form_field: 'employer', idiomarkf_field: 'professional.company', confidence: 0.85 },
  { form_field: 'organization', idiomarkf_field: 'professional.company', confidence: 0.7 },
  { form_field: 'industry', idiomarkf_field: 'professional.industry', confidence: 0.9 },
  { form_field: 'skills', idiomarkf_field: 'professional.skills', confidence: 0.9 },
  { form_field: 'linkedin', idiomarkf_field: 'professional.profiles.linkedin', confidence: 0.95 },
  { form_field: 'linkedin_url', idiomarkf_field: 'professional.profiles.linkedin', confidence: 0.95 },
  { form_field: 'github', idiomarkf_field: 'professional.profiles.github', confidence: 0.95 },
  { form_field: 'portfolio', idiomarkf_field: 'professional.profiles.portfolio', confidence: 0.9 },
  { form_field: 'resume', idiomarkf_field: 'professional.resume_url', confidence: 0.9 },

  // Social
  { form_field: 'twitter', idiomarkf_field: 'social.twitter', confidence: 0.95 },
  { form_field: 'instagram', idiomarkf_field: 'social.instagram', confidence: 0.95 },
  { form_field: 'facebook', idiomarkf_field: 'social.facebook', confidence: 0.95 },
  { form_field: 'discord', idiomarkf_field: 'social.discord', confidence: 0.95 },

  // Gaming (for gaming job boards)
  { form_field: 'steam', idiomarkf_field: 'gaming.platforms.steam', confidence: 0.95 },
  { form_field: 'steam_id', idiomarkf_field: 'gaming.platforms.steam', confidence: 0.95 },
  { form_field: 'battlenet', idiomarkf_field: 'gaming.platforms.battle_net', confidence: 0.9 },
  { form_field: 'riot', idiomarkf_field: 'gaming.platforms.riot', confidence: 0.95 },
  { form_field: 'twitch', idiomarkf_field: 'gaming.content_creation.twitch', confidence: 0.95 },
]
