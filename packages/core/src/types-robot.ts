/**
 * Idiomark-R (Robot Persona Profile) Type Definitions
 *
 * Robot profiles enable human-robot matching and bidirectional trust.
 * Based on Idiomark-MCL design specification Section: Idiomark-R File Format
 */

import type { Domain } from './types';

// ============================================================================
// VALID TONE/STYLE CONSTANTS
// ============================================================================

export const VALID_ROBOT_TONES = ['formal', 'casual', 'friendly', 'professional', 'sarcastic'] as const;
export const VALID_ROBOT_VERBOSITIES = ['concise', 'conversational', 'detailed'] as const;
export const VALID_ROBOT_HUMOR_LEVELS = ['none', 'light', 'moderate', 'high'] as const;
export const VALID_INTERACTION_STYLES = ['task_focused', 'relationship_focused', 'balanced'] as const;

// ============================================================================
// ROBOT VOICE
// ============================================================================

/**
 * How the robot communicates
 */
export interface RobotVoice {
  /** Communication tone */
  tone: typeof VALID_ROBOT_TONES[number];

  /** How much the robot talks */
  verbosity: typeof VALID_ROBOT_VERBOSITIES[number];

  /** How much humor the robot uses */
  humor_level: typeof VALID_ROBOT_HUMOR_LEVELS[number];

  /** Empathy level (0.0 = none, 1.0 = highly empathetic) */
  empathy_level: number;
}

/**
 * Validates RobotVoice structure
 */
export function validateRobotVoice(voice: RobotVoice): boolean {
  if (!VALID_ROBOT_TONES.includes(voice.tone)) {
    return false;
  }

  if (!VALID_ROBOT_VERBOSITIES.includes(voice.verbosity)) {
    return false;
  }

  if (!VALID_ROBOT_HUMOR_LEVELS.includes(voice.humor_level)) {
    return false;
  }

  if (typeof voice.empathy_level !== 'number' || voice.empathy_level < 0 || voice.empathy_level > 1) {
    return false;
  }

  return true;
}

// ============================================================================
// ROBOT PERSONALITY TRAITS
// ============================================================================

/**
 * Robot's own "personality" for matching with humans
 */
export interface RobotPersonalityTraits {
  /** Focus on efficiency and task completion (0.0-1.0) */
  efficiency_focus: number;

  /** Initiative in social interactions (0.0-1.0) */
  social_initiative: number;

  /** Ability to adapt to new situations (0.0-1.0) */
  adaptability: number;

  /** Assertiveness in interactions (0.0-1.0) */
  assertiveness: number;
}

/**
 * Validates RobotPersonalityTraits structure
 */
export function validateRobotTraits(traits: RobotPersonalityTraits): boolean {
  const fields: (keyof RobotPersonalityTraits)[] = [
    'efficiency_focus',
    'social_initiative',
    'adaptability',
    'assertiveness'
  ];

  for (const field of fields) {
    const value = traits[field];
    if (typeof value !== 'number' || value < 0 || value > 1) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// ROBOT CONSTRAINTS
// ============================================================================

/**
 * Robot's operational constraints
 */
export interface RobotConstraints {
  /** Types of tasks the robot can perform */
  task_types: string[];

  /** How the robot approaches interactions */
  interaction_style: typeof VALID_INTERACTION_STYLES[number];

  /** Situations that require human operator intervention */
  escalation_triggers: string[];
}

// ============================================================================
// ROBOT CAPABILITY
// ============================================================================

/**
 * A specific capability the robot possesses
 */
export interface RobotCapability {
  /** Name of the capability */
  name: string;

  /** Proficiency level (0.0-1.0) */
  proficiency: number;

  /** Optional certifications for this capability */
  certifications?: string[];
}

// ============================================================================
// ROBOT PERSONA
// ============================================================================

/**
 * Complete robot persona for human-robot matching
 */
export interface RobotPersona {
  /** How the robot communicates */
  voice: RobotVoice;

  /** Knowledge domains the robot operates in */
  domains: Domain[];

  /** Operational constraints */
  constraints: RobotConstraints;

  /** Robot's personality traits for matching */
  personality_traits: RobotPersonalityTraits;
}

// ============================================================================
// ROBOT METADATA
// ============================================================================

/**
 * Metadata about the robot entity
 */
export interface RobotMetadata {
  entity: {
    /** Display name (e.g., "BaristaBot v2.4") */
    name: string;

    /** Entity type (always "robot") */
    type: 'robot';

    /** Manufacturer name */
    manufacturer: string;

    /** Model identifier */
    model: string;

    /** Robot's capabilities */
    capabilities: RobotCapability[];
  };
}

// ============================================================================
// ROBOT PERFORMANCE METRICS
// ============================================================================

/**
 * Performance history from IdiomarkA analytics
 */
export interface RobotPerformanceMetrics {
  /** Total number of human interactions */
  total_interactions: number;

  /** Average effectiveness score (0.0-1.0) */
  average_effectiveness_score: number;

  /** Average human satisfaction (1-5 scale) */
  human_satisfaction_average: number;

  /** Personality traits that best match this robot */
  best_matched_human_traits: string[];
}

// ============================================================================
// Idiomark-R FILE
// ============================================================================

/**
 * Complete Robot Profile File (Idiomark-R)
 *
 * @example
 * ```typescript
 * const baristaBot: IdiomarkRFile = {
 *   idiomark: "R-1.0.0",
 *   id: "robot-barista-001",
 *   created: "2026-02-14T00:00:00Z",
 *   updated: "2026-02-14T00:00:00Z",
 *   metadata: {
 *     entity: {
 *       name: "BaristaBot v2.4",
 *       type: "robot",
 *       manufacturer: "Boston Robotics",
 *       model: "BB-2400",
 *       capabilities: [
 *         { name: "coffee_preparation", proficiency: 0.95 }
 *       ]
 *     }
 *   },
 *   robot_persona: {
 *     voice: {
 *       tone: "friendly",
 *       verbosity: "conversational",
 *       humor_level: "light",
 *       empathy_level: 0.7
 *     },
 *     domains: [{ name: "food_service", confidence: 0.9 }],
 *     constraints: {
 *       task_types: ["food_service"],
 *       interaction_style: "balanced",
 *       escalation_triggers: ["customer_complaint"]
 *     },
 *     personality_traits: {
 *       efficiency_focus: 0.8,
 *       social_initiative: 0.6,
 *       adaptability: 0.7,
 *       assertiveness: 0.4
 *     }
 *   }
 * };
 * ```
 */
export interface IdiomarkRFile {
  /** Robot profile version identifier */
  idiomark: 'R-1.0.0';

  /** Unique robot instance identifier */
  id: string;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last update timestamp (ISO 8601) */
  updated: string;

  /** Robot entity metadata */
  metadata: RobotMetadata;

  /** Robot persona for matching */
  robot_persona: RobotPersona;

  /** Performance metrics from IdiomarkA analytics (optional) */
  performance_metrics?: RobotPerformanceMetrics;
}

/**
 * Input type for robot profile validation (allows partial data)
 */
export type IdiomarkRInput = Partial<IdiomarkRFile> & {
  idiomark?: string;
  id?: string;
  metadata?: Partial<RobotMetadata>;
  robot_persona?: Partial<RobotPersona>;
};

/**
 * Result of robot profile validation
 */
export interface RobotValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

// ============================================================================
// HUMAN-ROBOT MATCHING TYPES
// ============================================================================

/**
 * Matching factors contributing to compatibility score
 */
export interface MatchingFactors {
  /** Personality similarity (0.0-1.0) - do they "get" each other? */
  personality_similarity: number;

  /** Communication style match (0.0-1.0) */
  communication_style_match: number;

  /** Task capability alignment (0.0-1.0) */
  task_capability_alignment: number;

  /** Shared knowledge domains */
  shared_domains: string[];
}

/**
 * Recommendation details for a match
 */
export interface MatchRecommendation {
  /** Confidence in this recommendation (0.0-1.0) */
  confidence: number;

  /** Expected satisfaction if they interact (0.0-1.0) */
  expected_satisfaction: number;

  /** Potential issues to be aware of */
  potential_issues: string[];
}

/**
 * Human-Robot Match Score
 *
 * Result of computing compatibility between a human Idiomark and robot profile
 */
export interface HumanRobotMatchScore {
  /** Robot identifier */
  robot_id: string;

  /** Hash of human Idiomark for verification */
  human_idiomark_hash: string;

  /** Overall compatibility score (0.0-1.0) */
  compatibility_score: number;

  /** Detailed matching factors */
  matching_factors: MatchingFactors;

  /** Recommendation details */
  recommendation: MatchRecommendation;
}

/**
 * Request options for matching
 */
export interface MatchingRequest {
  /** Human Idiomark ID to match against */
  human_idiomark_id: string;

  /** Match against specific robot (optional) */
  robot_id?: string;

  /** Filter by task type */
  task_type?: string;

  /** Minimum compatibility threshold */
  min_compatibility?: number;

  /** Maximum number of results */
  limit?: number;
}

/**
 * Response from matching endpoint
 */
export interface MatchingResponse {
  /** List of match scores, sorted by compatibility descending */
  matches: HumanRobotMatchScore[];

  /** Algorithm version used for computation */
  algorithm_version: string;

  /** Timestamp of computation */
  computed_at: string;
}

/**
 * Options for matching algorithm
 */
export interface MatchOptions {
  /** Weights for different matching factors */
  weights?: {
    personality_similarity?: number;    // Default: 0.35
    communication_style_match?: number; // Default: 0.25
    task_capability_alignment?: number; // Default: 0.25
    shared_domains?: number;            // Default: 0.15
  };

  /** Include potential issues in results */
  include_issues?: boolean;

  /** Minimum confidence threshold */
  min_confidence?: number;

  /** Only match robots whose constraints.task_types include this task type */
  task_type?: string;

  /** Minimum overall compatibility score (0-1) to include in results */
  min_compatibility?: number;

  /** Maximum number of matches to return */
  limit?: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a complete robot profile
 *
 * @param profile - Robot profile to validate
 * @returns Validation result with errors if invalid
 */
export function validateRobotProfile(profile: IdiomarkRInput): RobotValidationResult {
  const errors: Record<string, string> = {};

  // Validate idiomark version
  if (profile.idiomark !== 'R-1.0.0') {
    errors.idiomark = `Invalid idiomark version: ${profile.idiomark}. Expected 'R-1.0.0'`;
  }

  // Validate required fields
  if (!profile.id) {
    errors.id = 'Robot ID is required';
  }

  if (!profile.created) {
    errors.created = 'Created timestamp is required';
  }

  if (!profile.updated) {
    errors.updated = 'Updated timestamp is required';
  }

  // Validate metadata
  if (!profile.metadata?.entity?.name) {
    errors['metadata.entity.name'] = 'Robot name is required';
  }

  if (!profile.metadata?.entity?.manufacturer) {
    errors['metadata.entity.manufacturer'] = 'Manufacturer is required';
  }

  // Validate robot_persona
  if (profile.robot_persona) {
    const persona = profile.robot_persona;

    // Validate voice
    if (persona.voice) {
      if (!validateRobotVoice(persona.voice)) {
        errors['robot_persona.voice'] = 'Invalid voice configuration';
      }
    } else {
      errors['robot_persona.voice'] = 'Voice configuration is required';
    }

    // Validate personality_traits
    if (persona.personality_traits) {
      if (!validateRobotTraits(persona.personality_traits)) {
        errors['robot_persona.personality_traits'] = 'Invalid personality traits (values must be 0.0-1.0)';
      }
    } else {
      errors['robot_persona.personality_traits'] = 'Personality traits are required';
    }

    // Validate constraints
    if (persona.constraints) {
      if (!VALID_INTERACTION_STYLES.includes(persona.constraints.interaction_style)) {
        errors['robot_persona.constraints'] = `Invalid interaction_style: ${persona.constraints.interaction_style}`;
      }
    } else {
      errors['robot_persona.constraints'] = 'Constraints are required';
    }
  } else {
    errors.robot_persona = 'Robot persona is required';
  }

  // Validate performance_metrics if present
  if (profile.performance_metrics) {
    const metrics = profile.performance_metrics;

    if (typeof metrics.average_effectiveness_score === 'number' &&
        (metrics.average_effectiveness_score < 0 || metrics.average_effectiveness_score > 1)) {
      errors['performance_metrics.average_effectiveness_score'] = 'Effectiveness score must be 0.0-1.0';
    }

    if (typeof metrics.human_satisfaction_average === 'number' &&
        (metrics.human_satisfaction_average < 1 || metrics.human_satisfaction_average > 5)) {
      errors['performance_metrics.human_satisfaction_average'] = 'Satisfaction must be 1-5';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}
