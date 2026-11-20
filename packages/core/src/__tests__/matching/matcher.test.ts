import { describe, it, expect } from 'vitest';
import {
  computeMatchScore,
  findBestMatches,
  validateWeights,
  DEFAULT_WEIGHTS
} from '../../matching/matcher';
import type { IdiomarkRFile } from '../../types-robot';
import type { IdiomarkFile } from '../../types';

describe('Matcher', () => {
  // Test fixtures
  const humanIdiomark: Partial<IdiomarkFile> = {
    idiomark: '2.0.0',
    id: 'human-001',
    personality: {
      voice: {
        formality: 0.6,
        humor: 0.4,
        sarcasm: 0.3,
        enthusiasm: 0.7,
        directness: 0.5
      },
      patterns: {
        sentence_length: { avg: 12, variance: 3 },
        emoji_usage: 0.3,
        punctuation: { exclamation: 0.1, question: 0.2 }
      },
      domains: [
        { name: 'food_service', confidence: 0.8 },
        { name: 'technology', confidence: 0.6 }
      ],
      values: [],
      knowledge: { explicit: [], implicit: [] }
    },
    personality_v2: {
      big_five: {
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.7,
        neuroticism: 0.3,
        confidence: 0.8
      },
      communication_style: {
        question_frequency: 0.5,
        self_disclosure: 0.4,
        task_social_orientation: 'balanced',
        preferred_conversation_depth: 'moderate',
        formality_preference: 'neutral',
        response_pace: 'moderate'
      }
    }
  };

  const robotProfile: IdiomarkRFile = {
    idiomark: 'R-1.0.0',
    id: 'robot-barista-001',
    created: '2026-02-14T00:00:00Z',
    updated: '2026-02-14T00:00:00Z',
    metadata: {
      entity: {
        name: 'BaristaBot v2.4',
        type: 'robot',
        manufacturer: 'Boston Robotics',
        model: 'BB-2400',
        capabilities: [
          { name: 'food_service', proficiency: 0.95 },
          { name: 'customer_interaction', proficiency: 0.85 }
        ]
      }
    },
    robot_persona: {
      voice: {
        tone: 'friendly',
        verbosity: 'conversational',
        humor_level: 'light',
        empathy_level: 0.7
      },
      domains: [
        { name: 'food_service', confidence: 0.9 }
      ],
      constraints: {
        task_types: ['food_service', 'customer_interaction'],
        interaction_style: 'balanced',
        escalation_triggers: ['customer_complaint']
      },
      personality_traits: {
        efficiency_focus: 0.7,
        social_initiative: 0.6,
        adaptability: 0.8,
        assertiveness: 0.3
      }
    }
  };

  describe('validateWeights', () => {
    it('should accept valid default weights', () => {
      expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
    });

    it('should accept valid custom weights', () => {
      const weights = {
        personality_similarity: 0.4,
        communication_style_match: 0.3,
        task_capability_alignment: 0.2,
        shared_domains: 0.1
      };
      expect(validateWeights(weights)).toBe(true);
    });

    it('should reject weights that do not sum to 1.0', () => {
      const weights = {
        personality_similarity: 0.5,
        communication_style_match: 0.5,
        task_capability_alignment: 0.5,
        shared_domains: 0.5
      };
      expect(validateWeights(weights)).toBe(false);
    });

    it('should reject negative weights', () => {
      const weights = {
        personality_similarity: -0.1,
        communication_style_match: 0.4,
        task_capability_alignment: 0.4,
        shared_domains: 0.3
      };
      expect(validateWeights(weights)).toBe(false);
    });

    it('should reject weights greater than 1', () => {
      const weights = {
        personality_similarity: 1.5,
        communication_style_match: -0.2,
        task_capability_alignment: -0.2,
        shared_domains: -0.1
      };
      expect(validateWeights(weights)).toBe(false);
    });
  });

  describe('computeMatchScore', () => {
    it('should compute a match score between human and robot', () => {
      const score = computeMatchScore(humanIdiomark as IdiomarkFile, robotProfile);

      expect(score).toBeDefined();
      expect(score.robot_id).toBe('robot-barista-001');
      expect(score.compatibility_score).toBeGreaterThanOrEqual(0);
      expect(score.compatibility_score).toBeLessThanOrEqual(1);
    });

    it('should include detailed matching factors', () => {
      const score = computeMatchScore(humanIdiomark as IdiomarkFile, robotProfile);

      expect(score.matching_factors).toBeDefined();
      expect(score.matching_factors.personality_similarity).toBeGreaterThanOrEqual(0);
      expect(score.matching_factors.communication_style_match).toBeGreaterThanOrEqual(0);
      expect(score.matching_factors.task_capability_alignment).toBeGreaterThanOrEqual(0);
      expect(score.matching_factors.shared_domains).toBeInstanceOf(Array);
    });

    it('should include recommendation details', () => {
      const score = computeMatchScore(humanIdiomark as IdiomarkFile, robotProfile);

      expect(score.recommendation).toBeDefined();
      expect(score.recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(score.recommendation.expected_satisfaction).toBeGreaterThanOrEqual(0);
      expect(score.recommendation.potential_issues).toBeInstanceOf(Array);
    });

    it('should return higher scores for better matches', () => {
      // Create a better matching robot
      const betterRobot: IdiomarkRFile = {
        ...robotProfile,
        id: 'robot-better-001',
        robot_persona: {
          ...robotProfile.robot_persona,
          personality_traits: {
            efficiency_focus: 0.6, // Closer to human conscientiousness (0.6)
            social_initiative: 0.5, // Closer to human extraversion (0.5)
            adaptability: 0.7, // Close to human openness (0.7)
            assertiveness: 0.3 // Close to inverse of human agreeableness
          }
        }
      };

      const goodScore = computeMatchScore(humanIdiomark as IdiomarkFile, betterRobot);
      expect(goodScore.compatibility_score).toBeGreaterThan(0.5);
    });

    it('should handle missing personality_v2 gracefully', () => {
      const humanWithoutV2 = {
        ...humanIdiomark,
        personality_v2: undefined
      } as IdiomarkFile;

      const score = computeMatchScore(humanWithoutV2, robotProfile);

      expect(score).toBeDefined();
      expect(score.compatibility_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findBestMatches', () => {
    const robots: IdiomarkRFile[] = [
      robotProfile,
      {
        ...robotProfile,
        id: 'robot-002',
        metadata: {
          entity: {
            name: 'MediBot Pro',
            type: 'robot',
            manufacturer: 'MediTech',
            model: 'MB-100',
            capabilities: [{ name: 'medical_triage', proficiency: 0.9 }]
          }
        },
        robot_persona: {
          ...robotProfile.robot_persona,
          constraints: {
            task_types: ['medical_triage'],
            interaction_style: 'task_focused',
            escalation_triggers: []
          }
        }
      },
      {
        ...robotProfile,
        id: 'robot-003',
        metadata: {
          entity: {
            name: 'TutorBot 3000',
            type: 'robot',
            manufacturer: 'EduRobo',
            model: 'TB-3000',
            capabilities: [{ name: 'tutoring', proficiency: 0.9 }]
          }
        },
        robot_persona: {
          ...robotProfile.robot_persona,
          constraints: {
            task_types: ['tutoring'],
            interaction_style: 'relationship_focused',
            escalation_triggers: []
          }
        }
      }
    ];

    it('should return matches sorted by compatibility', () => {
      const matches = findBestMatches(humanIdiomark as IdiomarkFile, robots);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.length).toBeLessThanOrEqual(robots.length);

      // Verify sorted by compatibility descending
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].compatibility_score).toBeGreaterThanOrEqual(
          matches[i].compatibility_score
        );
      }
    });

    it('should limit results when limit option is provided', () => {
      const matches = findBestMatches(humanIdiomark as IdiomarkFile, robots, { limit: 2 });

      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum compatibility', () => {
      const matches = findBestMatches(humanIdiomark as IdiomarkFile, robots, {
        min_compatibility: 0.5
      });

      matches.forEach(match => {
        expect(match.compatibility_score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should filter by task type', () => {
      const matches = findBestMatches(humanIdiomark as IdiomarkFile, robots, {
        task_type: 'food_service'
      });

      // Only robots with food_service in task_types should be returned
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should use custom weights when provided', () => {
      const defaultMatches = findBestMatches(humanIdiomark as IdiomarkFile, robots);

      const customMatches = findBestMatches(humanIdiomark as IdiomarkFile, robots, {
        weights: {
          personality_similarity: 0.6,
          communication_style_match: 0.2,
          task_capability_alignment: 0.1,
          shared_domains: 0.1
        }
      });

      // Order may differ with different weights
      expect(customMatches.length).toBe(defaultMatches.length);
    });

    it('should handle empty robot list', () => {
      const matches = findBestMatches(humanIdiomark as IdiomarkFile, []);

      expect(matches).toEqual([]);
    });
  });
});
