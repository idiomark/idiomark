/**
 * Idiomark Protocol V2 Types (Experimental/Beta)
 *
 * These are NEXT-GEN personality dimensions based on psycholinguistics research.
 * Run in parallel with V1, let data guide what graduates to stable.
 */

import type { Voice, Patterns, Domain, Value, Knowledge } from './types'

/**
 * Extended personality interface with experimental dimensions
 * Everything in V1 is included, plus new research-backed traits
 */
export interface PersonalityV2 {
  // ===== V1 CORE (STABLE) =====
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge

  // ===== V2 EXPERIMENTAL (BETA) =====
  // These fields are optional for backward compatibility
  // Track usage/feedback to determine what graduates to V1 core

  /** Big Five personality traits (OCEAN model) - research-backed */
  big_five?: BigFiveTraits

  /** Linguistic markers from psycholinguistics research */
  linguistic_markers?: LinguisticMarkers

  /** Communication style patterns */
  communication_style?: CommunicationStyle

  /** Cognitive patterns and thinking style */
  cognitive_patterns?: CognitivePatterns

  /** Emotional patterns beyond simple enthusiasm */
  emotional_patterns?: EmotionalPatterns

  /** Social dynamics and interaction patterns */
  social_dynamics?: SocialDynamics

  /** Meta-information about this V2 personality data */
  _meta?: PersonalityV2Meta
}

/**
 * Big Five personality traits (OCEAN)
 * Most researched personality model in psychology
 */
export interface BigFiveTraits {
  /** Openness: creativity, curiosity, adventure-seeking */
  openness: number        // 0.0 - 1.0

  /** Conscientiousness: organization, discipline, reliability */
  conscientiousness: number  // 0.0 - 1.0

  /** Extraversion: social energy, stimulation-seeking */
  extraversion: number    // 0.0 - 1.0

  /** Agreeableness: cooperation, empathy, harmony-seeking */
  agreeableness: number  // 0.0 - 1.0

  /** Neuroticism (emotional stability): anxiety reactivity, emotional volatility */
  neuroticism: number    // 0.0 - 1.0 (low = stable)

  /** Confidence in this assessment */
  confidence: number     // 0.0 - 1.0
}

/**
 * Linguistic markers from psycholinguistics research
 * Subtle language patterns that reveal personality
 */
export interface LinguisticMarkers {
  /** Pronoun usage patterns */
  pronouns?: {
    /** "I" usage - indicates self-focus */
    first_person_singular: number     // 0.0 - 1.0

    /** "we" usage - indicates group identity */
    first_person_plural: number       // 0.0 - 1.0

    /** "you" usage - indicates audience focus */
    second_person: number             // 0.0 - 1.0
  }

  /** Hedging language - uncertainty indicators */
  hedging?: {
    /** Frequency of hedging words */
    frequency: 'low' | 'medium' | 'high'

    /** Common hedge words used */
    common_hedges: string[]         // e.g., "maybe", "perhaps", "might", "could be"

    /** Confidence in this assessment */
    confidence: number              // 0.0 - 1.0
  }

  /** Absolutist language - certainty indicators */
  absolutist_language?: {
    frequency: number               // 0.0 - 1.0
    common_absolutes: string[]     // e.g., "always", "never", "every", "impossible"
  }

  /** Concrete vs abstract thinking */
  concreteness?: {
    score: number                  // -1.0 (very concrete) to 1.0 (very abstract)
    confidence: number              // 0.0 - 1.0
  }
}

/**
 * Communication style patterns
 * How the person structures interactions
 */
export interface CommunicationStyle {
  /** Question usage pattern - indicates curiosity and engagement style */
  question_frequency: number        // 0.0 - 1.0

  /** Self-disclosure level - how much personal info they share */
  self_disclosure: number          // 0.0 - 1.0

  /** Task vs social orientation */
  task_vs_social: number          // -1.0 (purely task) to 1.0 (purely social)

  /** How they approach conflict/disagreement */
  conflict_approach: 'direct' | 'diplomatic' | 'avoidant' | 'collaborative' | 'competitive'

  /** Preferred explanation length */
  explanation_style: 'terse' | 'concise' | 'balanced' | 'detailed' | 'comprehensive'

  /** Response latency (in chat contexts) */
  response_pattern?: {
    average_delay_seconds?: number
    burst_frequency?: number         // tendency to send multiple messages quickly
  }

  /** Preferred formality level (optional dimension used by robot matching) */
  formality_preference?: 'neutral' | 'formal' | 'casual'

  /** Preferred conversation depth (optional dimension used by robot matching) */
  preferred_conversation_depth?: 'brief' | 'moderate' | 'detailed'

  /** Task vs social orientation as a category (optional dimension used by robot matching) */
  task_social_orientation?: 'task' | 'social' | 'balanced'
}

/**
 * Cognitive patterns and thinking style
 * How the person processes information
 */
export interface CognitivePatterns {
  /** Primary thinking style */
  thinking_style: 'analytical' | 'intuitive' | 'creative' | 'pragmatic' | 'scientific' | 'artistic'

  /** Decision-making approach */
  decision_making: 'quick' | 'deliberate' | 'collaborative' | 'data_driven' | 'gut_instinct'

  /** Information processing preference */
  information_processing: 'detailed' | 'big_picture' | 'synthesizing' | 'filtering'

  /** Learning preference */
  learning_preference: 'theoretical' | 'hands_on' | 'observational' | 'experimental' | 'collaborative'

  /** Problem-solving approach */
  problem_solving: {
    structured?: boolean           // prefers step-by-step approaches
    iterative?: boolean           // builds solutions through refinement
    lateral?: boolean            // uses creative/out-of-box thinking
  }
}

/**
 * Emotional patterns
 * Beyond simple enthusiasm - how emotions are expressed
 */
export interface EmotionalPatterns {
  /** Baseline emotional tone */
  baseline_tone: 'optimistic' | 'neutral' | 'realistic' | 'pessimistic' | 'skeptical'

  /** How freely emotions are expressed */
  expressiveness: number          // 0.0 - 1.0

  /** Tendency to pick up others' emotions */
  emotional_contagion: number    // 0.0 - 1.0

  /** Language patterns when stressed */
  stress_indicators?: string[]

  /** Language patterns when excited */
  excitement_indicators?: string[]

  /** Emotional vocabulary richness */
  emotion_word_diversity: 'low' | 'medium' | 'high'

  /** Empathy indicators */
  empathy_markers?: {
    perspective_taking: number    // 0.0 - 1.0
    validation_responses: number  // 0.0 - 1.0
  }
}

/**
 * Social dynamics
 * How the person navigates social hierarchies and groups
 */
export interface SocialDynamics {
  /** Leadership style */
  leadership_style: 'directive' | 'collaborative' | 'supportive' | 'delegative' | 'situational'

  /** How much hierarchy/status signals matter */
  status_orientation: number       // 0.0 - 1.0

  /** In-group language that signals belonging */
  ingroup_signals?: {
    jargon: string[]
    cultural_references: string[]
    community_phrases: string[]
  }

  /** What/who they joke about */
  humor_targets?: {
    self_deprecating: boolean
    targets_others: boolean
    targets_situations: boolean
    targets_absurd: boolean
    taboo_topics: string[]          // topics they avoid joking about
  }

  /** Community interaction patterns */
  community_engagement?: {
    helping_behavior: number       // 0.0 - 1.0 - how often they help others
    mentoring: number              // 0.0 - 1.0 - tendency to teach/guide
    conflict_mediation: number     // 0.0 - 1.0 - tendency to resolve conflicts
  }
}

/**
 * Metadata for V2 personality data
 * Track what's experimental to evaluate what works
 */
export interface PersonalityV2Meta {
  /** Which V2 fields are populated */
  populated_fields: string[]

  /** Suggested confidence scores for V2 dimensions */
  field_confidence: Record<string, number>

  /** Source/method used for each V2 dimension */
  field_sources: Record<string, 'llm' | 'statistical' | 'manual' | 'inferred'>

  /** Date V2 analysis was performed */
  analyzed_at?: string

  /** Analyzer/model version that produced V2 data */
  analyzer_version?: string
}

// ===== TYPE UTILITIES =====

/**
 * Check if a Idiomark file has V2 personality data
 */
export function isPersonalityV2(personality: any): personality is PersonalityV2 {
  return personality && (
    personality.big_five !== undefined ||
    personality.linguistic_markers !== undefined ||
    personality.communication_style !== undefined ||
    personality.cognitive_patterns !== undefined ||
    personality.emotional_patterns !== undefined ||
    personality.social_dynamics !== undefined
  )
}

/**
 * Get populated V2 fields from a personality
 */
export function getV2Fields(personality: PersonalityV2): string[] {
  const fields: string[] = []
  const p = personality as any

  if (p.big_five) fields.push('big_five')
  if (p.linguistic_markers) fields.push('linguistic_markers')
  if (p.communication_style) fields.push('communication_style')
  if (p.cognitive_patterns) fields.push('cognitive_patterns')
  if (p.emotional_patterns) fields.push('emotional_patterns')
  if (p.social_dynamics) fields.push('social_dynamics')

  return fields
}

// ===== RE-EXPORT V1 TYPES FOR COMPATIBILITY =====

// Import all V1 types for convenience
export type {
  Voice,
  Patterns,
  Domain,
  Value,
  Knowledge
} from './types'
