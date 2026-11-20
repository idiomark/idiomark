/**
 * Similarity Functions for Human-Robot Matching
 *
 * These functions compute similarity between human personality traits
 * and robot persona attributes for compatibility scoring.
 */

import type { BigFiveTraits, CommunicationStyle } from '../types-v2';
import type { RobotPersonalityTraits, RobotVoice, RobotCapability } from '../types-robot';

// ============================================================================
// CORE SIMILARITY FUNCTIONS
// ============================================================================

/**
 * Computes cosine similarity between two numeric vectors.
 * Returns a value between -1 and 1, where 1 means identical direction.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  // Handle different length vectors - use shorter length
  const len = Math.min(a.length, b.length);

  if (len === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Computes Jaccard similarity between two sets (arrays).
 * Returns a value between 0 and 1, where 1 means identical sets.
 *
 * @param a - First set
 * @param b - Second set
 * @returns Jaccard similarity (0 to 1)
 */
export function jaccardSimilarity<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) {
    return 1; // Both empty = identical
  }

  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const setA = new Set(a);
  const setB = new Set(b);

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;

  return intersectionSize / unionSize;
}

// ============================================================================
// TONE/STYLE VECTOR MAPPING
// ============================================================================

/**
 * Maps robot voice tone to a numeric vector for similarity comparison.
 *
 * Tone mapping (based on communication theory):
 * - formal: [0.9, 0.1, 0.3] (high formality, low warmth, low humor)
 * - casual: [0.3, 0.8, 0.6] (low formality, high warmth, moderate humor)
 * - friendly: [0.5, 0.9, 0.7] (moderate formality, high warmth, high approachability)
 * - professional: [0.8, 0.5, 0.2] (high formality, moderate warmth, low humor)
 * - sarcastic: [0.2, 0.3, 0.9] (low formality, moderate warmth, high irony)
 */
const TONE_VECTORS: Record<string, number[]> = {
  formal: [0.9, 0.1, 0.3],
  casual: [0.3, 0.8, 0.6],
  friendly: [0.5, 0.9, 0.7],
  professional: [0.8, 0.5, 0.2],
  sarcastic: [0.2, 0.3, 0.9]
};

/**
 * Converts a robot voice tone to a numeric vector.
 *
 * @param tone - Robot voice tone
 * @returns Numeric vector representation
 */
export function voiceToneToVector(tone: RobotVoice['tone']): number[] {
  return TONE_VECTORS[tone] || [0.5, 0.5, 0.5]; // Default to neutral
}

/**
 * Maps human formality preference to numeric vector.
 */
const FORMALITY_VECTORS: Record<string, number[]> = {
  formal: [0.9, 0.1, 0.3],
  neutral: [0.5, 0.5, 0.5],
  casual: [0.3, 0.8, 0.7]
};

/**
 * Maps verbosity to numeric value.
 */
const VERBOSITY_VECTORS: Record<string, number> = {
  concise: 0.3,
  conversational: 0.6,
  detailed: 0.9
};

// ============================================================================
// PERSONALITY SIMILARITY
// ============================================================================

/**
 * Trait mapping between human Big Five and robot personality traits.
 *
 * Mapping rationale:
 * - efficiency_focus ↔ conscientiousness (both relate to task orientation)
 * - social_initiative ↔ extraversion (both relate to social engagement)
 * - adaptability ↔ openness (both relate to flexibility/openness)
 * - assertiveness ↔ (1 - agreeableness) (inverse relationship)
 */
const TRAIT_MAPPINGS = {
  efficiency_focus: 'conscientiousness',
  social_initiative: 'extraversion',
  adaptability: 'openness',
  assertiveness: 'agreeableness_inverse' // Special handling for inverse
};

/**
 * Calculates personality similarity between human Big Five traits and robot traits.
 *
 * @param humanBigFive - Human's Big Five personality traits
 * @param robotTraits - Robot's personality traits
 * @returns Similarity score (0 to 1)
 */
export function calculatePersonalitySimilarity(
  humanBigFive: BigFiveTraits,
  robotTraits: RobotPersonalityTraits
): number {
  // Create vectors for comparison
  const humanVector: number[] = [
    humanBigFive.openness,
    humanBigFive.conscientiousness,
    humanBigFive.extraversion,
    humanBigFive.agreeableness,
    humanBigFive.neuroticism
  ];

  // Map robot traits to comparable vector
  // Robot: efficiency_focus ~ human conscientiousness
  // Robot: social_initiative ~ human extraversion
  // Robot: adaptability ~ human openness
  // Robot: assertiveness ~ inverse of human agreeableness
  // Robot: (no direct mapping) ~ human neuroticism (use 0.5 as neutral)
  const robotVector: number[] = [
    robotTraits.adaptability,                    // Maps to openness
    robotTraits.efficiency_focus,              // Maps to conscientiousness
    robotTraits.social_initiative,             // Maps to extraversion
    1 - robotTraits.assertiveness,             // Maps to agreeableness (inverse)
    0.5                                         // No robot mapping for neuroticism
  ];

  // Calculate cosine similarity
  const similarity = cosineSimilarity(humanVector, robotVector);

  // Normalize from [-1, 1] to [0, 1]
  return (similarity + 1) / 2;
}

// ============================================================================
// COMMUNICATION STYLE MATCH
// ============================================================================

/**
 * Calculates communication style match between human and robot.
 *
 * @param humanComm - Human's communication style
 * @param robotVoice - Robot's voice configuration
 * @returns Match score (0 to 1)
 */
export function calculateCommunicationMatch(
  humanComm: CommunicationStyle,
  robotVoice: RobotVoice
): number {
  let totalScore = 0;
  let weightSum = 0;

  // 1. Formality match (weight: 0.35)
  const humanFormality = humanComm.formality_preference || 'neutral';
  const humanFormalityVec = FORMALITY_VECTORS[humanFormality] || [0.5, 0.5, 0.5];
  const robotFormalityVec = voiceToneToVector(robotVoice.tone);
  const formalitySimilarity = cosineSimilarity(humanFormalityVec, robotFormalityVec);
  const normalizedFormality = (formalitySimilarity + 1) / 2;
  totalScore += normalizedFormality * 0.35;
  weightSum += 0.35;

  // 2. Verbosity match (weight: 0.25)
  // Match robot verbosity to human conversation depth preference
  const humanVerbosity = humanComm.preferred_conversation_depth === 'brief' ? 0.3 :
                         humanComm.preferred_conversation_depth === 'detailed' ? 0.9 : 0.6;
  const robotVerbosity = VERBOSITY_VECTORS[robotVoice.verbosity];
  const verbosityDiff = Math.abs(humanVerbosity - robotVerbosity);
  const verbosityMatch = 1 - verbosityDiff;
  totalScore += verbosityMatch * 0.25;
  weightSum += 0.25;

  // 3. Task vs Social orientation (weight: 0.25)
  // Task-focused robots should have lower empathy, relationship-focused higher
  const orientationScore = humanComm.task_social_orientation === 'task' ?
    (robotVoice.empathy_level < 0.5 ? 1 : 0.5) :
    humanComm.task_social_orientation === 'social' ?
    (robotVoice.empathy_level > 0.6 ? 1 : 0.5) :
    0.7; // Balanced
  totalScore += orientationScore * 0.25;
  weightSum += 0.25;

  // 4. Humor match (weight: 0.15)
  // Match humor level to self-disclosure (higher disclosure = more humor OK)
  const humanHumorTolerance = humanComm.self_disclosure || 0.5;
  const robotHumorLevel = robotVoice.humor_level === 'none' ? 0 :
                          robotVoice.humor_level === 'light' ? 0.3 :
                          robotVoice.humor_level === 'moderate' ? 0.6 : 0.9;
  const humorMatch = 1 - Math.abs(humanHumorTolerance - robotHumorLevel);
  totalScore += humorMatch * 0.15;
  weightSum += 0.15;

  return totalScore / weightSum;
}

// ============================================================================
// TASK CAPABILITY ALIGNMENT
// ============================================================================

/**
 * Calculates task alignment between human needs and robot capabilities.
 *
 * Uses Jaccard similarity on task types, weighted by robot proficiency.
 *
 * @param humanNeeds - Task types the human needs
 * @param robotCapabilities - Robot's capabilities with proficiency levels
 * @returns Alignment score (0 to 1)
 */
export function calculateTaskAlignment(
  humanNeeds: string[],
  robotCapabilities: RobotCapability[]
): number {
  if (humanNeeds.length === 0) {
    return 0;
  }

  if (robotCapabilities.length === 0) {
    return 0;
  }

  // Get robot capability names
  const robotTaskTypes = robotCapabilities.map(c => c.name);

  // Calculate base Jaccard similarity
  const baseSimilarity = jaccardSimilarity(humanNeeds, robotTaskTypes);

  // Weight by robot proficiency for matched capabilities
  let proficiencyBoost = 0;
  const matchedCapabilities = robotCapabilities.filter(c => humanNeeds.includes(c.name));

  if (matchedCapabilities.length > 0) {
    const avgProficiency = matchedCapabilities.reduce((sum, c) => sum + c.proficiency, 0) / matchedCapabilities.length;
    proficiencyBoost = avgProficiency * 0.3; // Up to 0.3 boost for high proficiency
  }

  return Math.min(1, baseSimilarity + proficiencyBoost);
}

// ============================================================================
// DOMAIN OVERLAP
// ============================================================================

/**
 * Calculates domain overlap between human and robot knowledge domains.
 *
 * @param humanDomains - Human's knowledge domains
 * @param robotDomains - Robot's knowledge domains
 * @returns Overlap score (0 to 1)
 */
export function calculateDomainOverlap(
  humanDomains: Array<{ name: string; confidence: number }>,
  robotDomains: Array<{ name: string; confidence: number }>
): number {
  if (humanDomains.length === 0 || robotDomains.length === 0) {
    return 0;
  }

  const humanDomainNames = humanDomains.map(d => d.name.toLowerCase());
  const robotDomainNames = robotDomains.map(d => d.name.toLowerCase());

  // Calculate Jaccard similarity
  const baseOverlap = jaccardSimilarity(humanDomainNames, robotDomainNames);

  // Boost for high-confidence matches
  let confidenceBoost = 0;
  for (const hDomain of humanDomains) {
    const rDomain = robotDomains.find(r => r.name.toLowerCase() === hDomain.name.toLowerCase());
    if (rDomain) {
      const combinedConfidence = (hDomain.confidence + rDomain.confidence) / 2;
      confidenceBoost += combinedConfidence * 0.1;
    }
  }

  return Math.min(1, baseOverlap + confidenceBoost);
}
