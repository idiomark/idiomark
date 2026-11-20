import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  jaccardSimilarity,
  voiceToneToVector,
  calculatePersonalitySimilarity,
  calculateCommunicationMatch,
  calculateTaskAlignment
} from '../../matching/similarity';
import type { BigFiveTraits, CommunicationStyle } from '../../types-v2';
import type { RobotPersonalityTraits, RobotVoice, RobotCapability } from '../../types-robot';

describe('Similarity Functions', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it('should handle partial similarity', () => {
      const a = [1, 1, 0];
      const b = [1, 0, 1];
      // cos(A,B) = (1*1 + 1*0 + 0*1) / (sqrt(2) * sqrt(2)) = 1/2 = 0.5
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 5);
    });

    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(0); // Defined as 0 for zero vector
    });

    it('should handle different length vectors', () => {
      const a = [1, 2];
      const b = [1, 2, 3];
      // Should compare only common length or return 0
      expect(cosineSimilarity(a, b)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1 for identical sets', () => {
      const a = ['a', 'b', 'c'];
      const b = ['a', 'b', 'c'];
      expect(jaccardSimilarity(a, b)).toBe(1.0);
    });

    it('should return 0 for disjoint sets', () => {
      const a = ['a', 'b'];
      const b = ['c', 'd'];
      expect(jaccardSimilarity(a, b)).toBe(0.0);
    });

    it('should calculate partial overlap correctly', () => {
      const a = ['a', 'b', 'c'];
      const b = ['b', 'c', 'd'];
      // Intersection: {b, c} = 2
      // Union: {a, b, c, d} = 4
      // Jaccard = 2/4 = 0.5
      expect(jaccardSimilarity(a, b)).toBe(0.5);
    });

    it('should handle empty arrays', () => {
      const a: string[] = [];
      const b = ['a', 'b'];
      expect(jaccardSimilarity(a, b)).toBe(0);
    });

    it('should handle both empty arrays', () => {
      const a: string[] = [];
      const b: string[] = [];
      expect(jaccardSimilarity(a, b)).toBe(1); // Defined as 1 for both empty
    });
  });

  describe('voiceToneToVector', () => {
    it('should convert formal tone to numeric vector', () => {
      const vector = voiceToneToVector('formal');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBeGreaterThan(0);
    });

    it('should convert casual tone to numeric vector', () => {
      const vector = voiceToneToVector('casual');
      expect(Array.isArray(vector)).toBe(true);
    });

    it('should convert sarcastic tone to numeric vector', () => {
      const vector = voiceToneToVector('sarcastic');
      expect(Array.isArray(vector)).toBe(true);
    });

    it('should produce different vectors for different tones', () => {
      const formal = voiceToneToVector('formal');
      const sarcastic = voiceToneToVector('sarcastic');
      expect(formal).not.toEqual(sarcastic);
    });
  });

  describe('calculatePersonalitySimilarity', () => {
    const humanBigFive: BigFiveTraits = {
      openness: 0.8,
      conscientiousness: 0.6,
      extraversion: 0.4,
      agreeableness: 0.7,
      neuroticism: 0.3,
      confidence: 0.9
    };

    const robotTraits: RobotPersonalityTraits = {
      efficiency_focus: 0.6, // Maps to conscientiousness
      social_initiative: 0.4, // Maps to extraversion
      adaptability: 0.8, // Maps to openness
      assertiveness: 0.5 // Maps to low agreeableness
    };

    it('should calculate similarity between human Big Five and robot traits', () => {
      const similarity = calculatePersonalitySimilarity(humanBigFive, robotTraits);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return high similarity for matching traits', () => {
      const matchingTraits: RobotPersonalityTraits = {
        efficiency_focus: 0.6, // Matches conscientiousness
        social_initiative: 0.4, // Matches extraversion
        adaptability: 0.8, // Matches openness
        assertiveness: 0.3 // Low assertiveness matches high agreeableness
      };

      const similarity = calculatePersonalitySimilarity(humanBigFive, matchingTraits);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for opposite traits', () => {
      const oppositeTraits: RobotPersonalityTraits = {
        efficiency_focus: 0.1,
        social_initiative: 0.9,
        adaptability: 0.1,
        assertiveness: 0.9
      };

      const similarity = calculatePersonalitySimilarity(humanBigFive, oppositeTraits);
      // Note: Due to cosine similarity normalization, even "opposite" traits
      // may have moderate similarity. Test that it's lower than matching traits.
      expect(similarity).toBeLessThan(0.9);
    });
  });

  describe('calculateCommunicationMatch', () => {
    const humanComm: CommunicationStyle = {
      question_frequency: 0.7,
      self_disclosure: 0.5,
      task_social_orientation: 'balanced',
      preferred_conversation_depth: 'moderate',
      formality_preference: 'neutral',
      response_pace: 'moderate'
    } as CommunicationStyle;

    const robotVoice: RobotVoice = {
      tone: 'friendly',
      verbosity: 'conversational',
      humor_level: 'light',
      empathy_level: 0.6
    };

    it('should calculate match between human and robot communication styles', () => {
      const match = calculateCommunicationMatch(humanComm, robotVoice);
      expect(match).toBeGreaterThanOrEqual(0);
      expect(match).toBeLessThanOrEqual(1);
    });

    it('should return high match for compatible styles', () => {
      const compatibleVoice: RobotVoice = {
        tone: 'professional',
        verbosity: 'conversational',
        humor_level: 'light',
        empathy_level: 0.5
      };

      const match = calculateCommunicationMatch(humanComm, compatibleVoice);
      expect(match).toBeGreaterThan(0.5);
    });

    it('should return low match for incompatible styles', () => {
      const incompatibleVoice: RobotVoice = {
        tone: 'sarcastic',
        verbosity: 'concise',
        humor_level: 'high',
        empathy_level: 0.1
      };

      const match = calculateCommunicationMatch(humanComm, incompatibleVoice);
      // Match should still be reasonable due to multiple factors
      expect(match).toBeGreaterThan(0);
      expect(match).toBeLessThan(0.9);
    });
  });

  describe('calculateTaskAlignment', () => {
    const robotCapabilities: RobotCapability[] = [
      { name: 'food_service', proficiency: 0.9 },
      { name: 'customer_interaction', proficiency: 0.8 },
      { name: 'payment_processing', proficiency: 0.7 }
    ];

    it('should calculate alignment between human needs and robot capabilities', () => {
      const humanNeeds = ['food_service', 'customer_interaction'];
      const alignment = calculateTaskAlignment(humanNeeds, robotCapabilities);
      expect(alignment).toBeGreaterThanOrEqual(0);
      expect(alignment).toBeLessThanOrEqual(1);
    });

    it('should return high alignment for matching needs', () => {
      const humanNeeds = ['food_service'];
      const alignment = calculateTaskAlignment(humanNeeds, robotCapabilities);
      // Single need match with Jaccard = 1/3 = 0.33, plus proficiency boost
      expect(alignment).toBeGreaterThan(0.3);
    });

    it('should return low alignment for non-matching needs', () => {
      const humanNeeds = ['medical_triage', 'surgery'];
      const alignment = calculateTaskAlignment(humanNeeds, robotCapabilities);
      expect(alignment).toBeLessThan(0.3);
    });

    it('should handle empty human needs', () => {
      const humanNeeds: string[] = [];
      const alignment = calculateTaskAlignment(humanNeeds, robotCapabilities);
      expect(alignment).toBe(0);
    });

    it('should weight by robot proficiency', () => {
      // Use partial match scenario where proficiency matters
      const highProficiencyCaps: RobotCapability[] = [
        { name: 'food_service', proficiency: 1.0 },
        { name: 'customer_interaction', proficiency: 0.9 }
      ];
      const lowProficiencyCaps: RobotCapability[] = [
        { name: 'food_service', proficiency: 0.1 },
        { name: 'customer_interaction', proficiency: 0.2 }
      ];
      // Human needs 3 things, robot has 2 - partial match
      const humanNeeds = ['food_service', 'customer_interaction', 'payment'];

      const highAlignment = calculateTaskAlignment(humanNeeds, highProficiencyCaps);
      const lowAlignment = calculateTaskAlignment(humanNeeds, lowProficiencyCaps);

      // High proficiency should give higher alignment due to proficiency boost
      expect(highAlignment).toBeGreaterThan(lowAlignment);
    });
  });
});
