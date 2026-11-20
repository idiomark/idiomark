/**
 * Idiomark Protocol Types
 */

import type { PersonalityV2 } from './types-v2'

/**
 * Section numbers for Idiomark V2 binary format
 * Each section contains different types of personality/consumption data
 */
export enum SectionNumber {
  // Core personality sections (1-12)
  CORE_PERSONALITY = 1,
  VOICE = 2,
  PATTERNS = 3,
  DOMAINS = 4,
  VALUES = 5,
  KNOWLEDGE = 6,
  BIG_FIVE = 7,
  LINGUISTIC_MARKERS = 8,
  COMMUNICATION_STYLE = 9,
  COGNITIVE_PATTERNS = 10,
  EMOTIONAL_PATTERNS = 11,
  SOCIAL_DYNAMICS = 12,

  // Machine Consumer Loop sections (13-17)
  MCL_PREFERENCES = 13,      // Robot interaction preferences
  EMERGENCY_DATA = 14,       // Emergency response data
  MCL_INTERACTIONS = 15,     // IdiomarkA storage - interaction history
  ROBOT_EFFECTIVENESS = 16,  // IdiomarkA storage - effectiveness metrics
  BEHAVIORAL_STREAM = 17,    // Real-time behavioral data

  // Robot Profile sections (18+)
  ROBOT_PROFILE = 18         // Idiomark-R robot persona profile
}

export interface IdiomarkFile {
  idiomark: string                     // Version: "1.0.0", "1.1.0", "2.0.0-beta", etc.
  id: string
  created: string
  updated: string
  metadata: IdiomarkMetadata
  personality: Personality          // V1 core (stable)
  personality_v2?: PersonalityV2  // V2 experimental (optional, for beta features)
  signature?: string
}

/**
 * Personality V2 type import
 * Import the experimental V2 types if needed
 */
export type { PersonalityV2, BigFiveTraits, LinguisticMarkers, CommunicationStyle, CognitivePatterns, EmotionalPatterns, SocialDynamics } from './types-v2'

/**
 * MCL-Preferences type import (Section 13)
 * Machine Consumer Loop preferences for robot interactions
 */
export type {
  MCLPreferencesSection,
  MCLPreferencesInput,
  RestaurantPreferences,
  MedicalData,
  LearningProfile,
  InteractionPreferences,
  Medication,
  Contact,
  MCLValidationResult
} from './types-mcl'

export { validateMCLPreferences } from './types-mcl'

/**
 * Emergency-Data type import (Section 14)
 * Emergency response data with strict access control
 */
export type {
  EmergencyDataSection,
  EmergencyMedical,
  EmergencyIdentity,
  EmergencyPermissions,
  EmergencyAccessResult
} from './types-mcl'

export { validateEmergencyAccess } from './types-mcl'

/**
 * Robot Profile type import (Idiomark-R)
 * Robot persona profiles for human-robot matching
 */
export type {
  IdiomarkRFile,
  RobotPersona,
  RobotVoice,
  RobotPersonalityTraits,
  RobotConstraints,
  RobotCapability,
  RobotMetadata,
  RobotPerformanceMetrics,
  IdiomarkRInput,
  RobotValidationResult
} from './types-robot'

export {
  validateRobotProfile,
  validateRobotVoice,
  validateRobotTraits
} from './types-robot'

/**
 * Human-Robot Matching types
 */
export type {
  HumanRobotMatchScore,
  MatchingFactors,
  MatchRecommendation,
  MatchingRequest,
  MatchingResponse,
  MatchOptions
} from './types-robot'

export interface IdiomarkMetadata {
  entity: {
    name?: string
    type: 'human' | 'brand' | 'bot' | 'fictional'
    sources: string[]
  }
  extraction: {
    date: string
    sample_size: number
    timeframe: {
      from: string
      to: string
    }
  }
  validator?: string
}

export interface Personality {
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge
}

export interface Voice {
  tone: {
    primary: string
    secondary?: string
    confidence: number
  }
  // Core communication style (0.0 - 1.0)
  formality: number
  humor: number
  sarcasm: number
  enthusiasm: number
  directness: number

  // Big Five / OCEAN traits (scientifically validated)
  // Based on meta-analyses of linguistic markers
  openness?: number      // 0.0 - 1.0: Complex vocabulary, curiosity, creativity
  conscientiousness?: number  // 0.0 - 1.0: Achievement words, work focus
  extraversion?: number     // 0.0 - 1.0: Social words, positive emotion
  agreeableness?: number    // 0.0 - 1.0: Collaboration, social harmony
  neuroticism?: number      // 0.0 - 1.0: Negative emotion, anxiety markers
}

export interface Patterns {
  sentence_length: {
    mean: number
    stddev: number
  }
  paragraph_length?: {
    mean: number
    stddev: number
  }
  emoji_usage: {
    frequency: 'none' | 'low' | 'medium' | 'high'
    top_emojis: string[]
    position?: 'start' | 'end' | 'mixed'
  }
  punctuation: {
    exclamation_frequency: number
    question_frequency: number
    ellipsis_usage: 'none' | 'low' | 'medium' | 'high'
  }
  capitalization?: {
    all_caps_frequency: number
    random_caps: boolean
  }

  // LIWC-inspired linguistic markers (scientifically validated)
  liwc_categories?: {
    first_person_singular: number     // I, me, my - self-focus indicator
    first_person_plural: number       // we, us - collective focus
    third_person: number              // he, she, they - other focus
    positive_emotion: number          // Positive emotion words ratio
    negative_emotion: number          // Negative emotion words ratio
    cognitive_process: number         // Insight, cause, know - thinking style
    social_words: number             // Social process words ratio
    work_words: number               // Work-related terms ratio
    achievement_words: number         // Award, earn, success - goal focus
    articles: number                // a, an, the - complexity indicator
    long_words: number              // Words > 6 letters - sophistication
  }
}

export interface Domain {
  name: string
  confidence: number
  evidence?: string[]
}

export interface Value {
  name: string
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface Knowledge {
  frequent_terms: string[]
  mentions: {
    people?: string[]
    projects?: string[]
    organizations?: string[]
  }
  topics: {
    primary: string[]
    secondary?: string[]
  }
}

export interface IdiomarkResult {
  file: IdiomarkFile
  metadata: {
    sampleSize: number
    timeframe: string
    sources: string[]
  }
  confidence: number
  save(path: string): Promise<void>
}

export interface ExtractionOptions {
  sources: string[]
  sampleSize: number
  verbose: boolean
  auth?: Record<string, any> // Platform-specific auth (e.g., { github: { token }, twitter: { bearerToken } })
  startDate?: Date
  endDate?: Date
}

export interface ValidationResult {
  valid: boolean
  version: string
  id: string
  created: string
  sources: string[]
  /** IdiomarkD-specific: profile type ('developer' etc.). Only set by IdiomarkD validation. */
  profile_type?: string
  errors: ValidationError[]
}

export interface ValidationError {
  field?: string
  message: string
  code: string
}

// Adapter-related types
export interface PlatformAdapter {
  readonly name: string
  authenticate(): Promise<boolean>
  fetchData(options: FetchOptions): Promise<RawContent[]>
  fetchContent?(options: FetchOptions): Promise<RawContent[]> // For BaseAdapter implementations
  normalize(raw: RawContent): NormalizedContent
  // Optional methods from BaseAdapter
  extract?(options: FetchOptions): Promise<NormalizedContent[]>
  healthCheck?(): Promise<{ healthy: boolean; latency?: number; error?: string }>
  reset?(): Promise<void>
  dispose?(): Promise<void>
  getMetrics?(): { requests: number; cacheHits: number; cacheMisses: number; retries: number; errors: number; avgLatency: number }
}

export interface NormalizedContent {
  id: string
  platform: string
  type: 'post' | 'comment' | 'reply'
  text: string
  timestamp: string
  author: {
    id: string
    username: string
    name: string
  }
  metrics?: {
    likes?: number
    shares?: number
    replies?: number
  }
  metadata?: Record<string, any>
  raw: any
}

export interface FetchOptions {
  limit?: number
  startDate?: Date
  endDate?: Date
  includeReplies?: boolean
  includeReactions?: boolean
}

// Re-export from base adapter
export type { AdapterConfig } from './adapters/base'

export interface RawContent {
  id: string
  type: string
  text: string
  created_at: string
  author: {
    id: string
    username: string
    name: string
  }
  [key: string]: any
}

// File system types for Idiomark file storage
export interface IdiomarkFileStorage {
  read(path: string): Promise<IdiomarkFile>
  write(path: string, file: IdiomarkFile): Promise<void>
  list(directory: string): Promise<string[]>
  delete(path: string): Promise<void>
}
