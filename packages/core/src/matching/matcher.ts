/**
 * Human-Robot Matching Service
 *
 * Combines similarity functions into a comprehensive matching algorithm
 * for computing compatibility between human Idiomark and robot profiles.
 */

import type { IdiomarkFile, Domain } from '../types';
import type {
  IdiomarkRFile,
  HumanRobotMatchScore,
  MatchingFactors,
  MatchRecommendation,
  MatchOptions
} from '../types-robot';
import {
  calculatePersonalitySimilarity,
  calculateCommunicationMatch,
  calculateTaskAlignment,
  calculateDomainOverlap
} from './similarity';

// ============================================================================
// DEFAULT WEIGHTS
// ============================================================================

/**
 * Default weights for matching factors.
 * These are based on research indicating:
 * - Personality similarity is most important for long-term compatibility
 * - Communication style affects daily interaction quality
 * - Task alignment determines functional fit
 * - Shared domains enhance understanding
 */
export const DEFAULT_WEIGHTS = {
  personality_similarity: 0.35,
  communication_style_match: 0.25,
  task_capability_alignment: 0.25,
  shared_domains: 0.15
};

/**
 * Algorithm version for tracking
 */
export const ALGORITHM_VERSION = '1.0.0';

// ============================================================================
// WEIGHT VALIDATION
// ============================================================================

/**
 * Validates that weights sum to 1.0 and are all non-negative.
 *
 * @param weights - Weight configuration to validate
 * @returns True if valid, false otherwise
 */
export function validateWeights(weights: {
  personality_similarity: number;
  communication_style_match: number;
  task_capability_alignment: number;
  shared_domains: number;
}): boolean {
  const values = [
    weights.personality_similarity,
    weights.communication_style_match,
    weights.task_capability_alignment,
    weights.shared_domains
  ];

  // Check all non-negative
  if (values.some(v => v < 0)) {
    return false;
  }

  // Check sum is approximately 1.0 (allowing for floating point)
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.001;
}

// ============================================================================
// MATCH SCORE COMPUTATION
// ============================================================================

/**
 * Computes a comprehensive match score between a human Idiomark and robot profile.
 *
 * @param humanIdiomark - Human's Idiomark file
 * @param robotProfile - Robot's Idiomark-R profile
 * @param options - Optional matching configuration
 * @returns HumanRobotMatchScore with compatibility score and factors
 */
export function computeMatchScore(
  humanIdiomark: IdiomarkFile,
  robotProfile: IdiomarkRFile,
  options?: MatchOptions
): HumanRobotMatchScore {
  // Merge provided weights with defaults
  const weights = {
    ...DEFAULT_WEIGHTS,
    ...(options?.weights || {})
  };

  // Calculate individual factors
  const personalitySimilarity = calculatePersonalitySimilarity(
    humanIdiomark.personality_v2?.big_five || getDefaultBigFive(),
    robotProfile.robot_persona.personality_traits
  );

  const communicationMatch = calculateCommunicationMatch(
    humanIdiomark.personality_v2?.communication_style || getDefaultCommunicationStyle(),
    robotProfile.robot_persona.voice
  );

  const taskAlignment = calculateTaskAlignment(
    getHumanTaskNeeds(humanIdiomark),
    robotProfile.metadata.entity.capabilities
  );

  const domainOverlap = calculateDomainOverlap(
    humanIdiomark.personality?.domains || [],
    robotProfile.robot_persona.domains
  );

  // Compute weighted compatibility score
  const compatibilityScore =
    weights.personality_similarity * personalitySimilarity +
    weights.communication_style_match * communicationMatch +
    weights.task_capability_alignment * taskAlignment +
    weights.shared_domains * domainOverlap;

  // Build matching factors
  const matchingFactors: MatchingFactors = {
    personality_similarity: personalitySimilarity,
    communication_style_match: communicationMatch,
    task_capability_alignment: taskAlignment,
    shared_domains: extractSharedDomains(
      humanIdiomark.personality?.domains || [],
      robotProfile.robot_persona.domains
    )
  };

  // Build recommendation
  const recommendation = buildRecommendation(
    compatibilityScore,
    matchingFactors,
    options?.include_issues ?? true
  );

  return {
    robot_id: robotProfile.id,
    human_idiomark_hash: hashIdiomark(humanIdiomark),
    compatibility_score: Math.round(compatibilityScore * 1000) / 1000, // Round to 3 decimals
    matching_factors: matchingFactors,
    recommendation: recommendation
  };
}

// ============================================================================
// BEST MATCHES FINDER
// ============================================================================

/**
 * Finds the best matching robots for a human Idiomark.
 *
 * @param humanIdiomark - Human's Idiomark file
 * @param robotProfiles - Array of robot profiles to match against
 * @param options - Matching options (limit, filters, weights)
 * @returns Array of match scores sorted by compatibility descending
 */
export function findBestMatches(
  humanIdiomark: IdiomarkFile,
  robotProfiles: IdiomarkRFile[],
  options?: MatchOptions
): HumanRobotMatchScore[] {
  if (robotProfiles.length === 0) {
    return [];
  }

  // Compute scores for all robots
  let matches = robotProfiles.map(robot => {
    // Filter by task type if specified
    if (options?.task_type) {
      const hasTaskType = robot.robot_persona.constraints.task_types.includes(options.task_type!);
      if (!hasTaskType) {
        return null;
      }
    }

    return computeMatchScore(humanIdiomark, robot, options);
  }).filter((match): match is HumanRobotMatchScore => match !== null);

  // Filter by minimum compatibility
  if (options?.min_compatibility) {
    matches = matches.filter(
      m => m.compatibility_score >= options.min_compatibility!
    );
  }

  // Filter by minimum confidence
  if (options?.min_confidence) {
    matches = matches.filter(
      m => m.recommendation.confidence >= options.min_confidence!
    );
  }

  // Sort by compatibility descending
  matches.sort((a, b) => b.compatibility_score - a.compatibility_score);

  // Apply limit
  if (options?.limit && options.limit > 0) {
    matches = matches.slice(0, options.limit);
  }

  return matches;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets default Big Five traits when not available in Idiomark.
 */
function getDefaultBigFive() {
  return {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    confidence: 0.0
  };
}

/**
 * Gets default communication style when not available in Idiomark.
 */
function getDefaultCommunicationStyle() {
  return {
    question_frequency: 0.5,
    self_disclosure: 0.5,
    task_vs_social: 0,
    conflict_approach: 'collaborative' as const,
    explanation_style: 'balanced' as const,
    task_social_orientation: 'balanced' as const,
    preferred_conversation_depth: 'moderate' as const,
    formality_preference: 'neutral' as const,
    response_pace: 'moderate' as const
  };
}

/**
 * Extracts human task needs from Idiomark data.
 * Looks at domains, MCL preferences, and interaction history.
 */
function getHumanTaskNeeds(humanIdiomark: IdiomarkFile): string[] {
  const needs: string[] = [];

  // Extract from domains
  if (humanIdiomark.personality?.domains) {
    for (const domain of humanIdiomark.personality.domains) {
      needs.push(domain.name);
    }
  }

  // Could also extract from MCL preferences if present
  // This is a simplified version

  return [...new Set(needs)]; // Dedupe
}

/**
 * Extracts shared domain names from human and robot domains.
 */
function extractSharedDomains(
  humanDomains: Domain[],
  robotDomains: Domain[]
): string[] {
  const humanNames = new Set(humanDomains.map(d => d.name.toLowerCase()));
  const shared: string[] = [];

  for (const robotDomain of robotDomains) {
    if (humanNames.has(robotDomain.name.toLowerCase())) {
      shared.push(robotDomain.name);
    }
  }

  return shared;
}

/**
 * Creates a simple hash of Idiomark for verification.
 */
function hashIdiomark(idiomark: IdiomarkFile): string {
  // Simple hash based on ID and version
  const str = `${idiomark.id}:${idiomark.idiomark}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Builds a recommendation based on match score and factors.
 */
function buildRecommendation(
  compatibilityScore: number,
  factors: MatchingFactors,
  includeIssues: boolean
): MatchRecommendation {
  // Confidence based on how decisive the score is
  // High confidence when score is clearly high or low
  const decisiveness = Math.abs(compatibilityScore - 0.5) * 2;
  const confidence = Math.min(0.95, 0.5 + decisiveness * 0.45);

  // Expected satisfaction based on compatibility
  const expectedSatisfaction = compatibilityScore;

  // Identify potential issues
  const potentialIssues: string[] = [];
  if (includeIssues) {
    if (factors.personality_similarity < 0.4) {
      potentialIssues.push('personality_mismatch');
    }
    if (factors.communication_style_match < 0.4) {
      potentialIssues.push('communication_style_difference');
    }
    if (factors.task_capability_alignment < 0.3) {
      potentialIssues.push('limited_capability_overlap');
    }
    if (factors.shared_domains.length === 0) {
      potentialIssues.push('no_shared_domains');
    }
  }

  return {
    confidence: Math.round(confidence * 1000) / 1000,
    expected_satisfaction: Math.round(expectedSatisfaction * 1000) / 1000,
    potential_issues: potentialIssues
  };
}
