import { describe, it, expect } from 'vitest';
import {
  IdiomarkRFile,
  RobotPersona,
  RobotVoice,
  RobotPersonalityTraits,
  RobotConstraints,
  RobotCapability,
  RobotMetadata,
  RobotPerformanceMetrics,
  validateRobotProfile,
  validateRobotVoice,
  validateRobotTraits,
  type RobotValidationResult,
  type IdiomarkRInput
} from '../types-robot';

describe('Robot Profile Types', () => {
  describe('RobotVoice', () => {
    it('should validate all valid tone values', () => {
      const tones = ['formal', 'casual', 'friendly', 'professional', 'sarcastic'] as const;

      tones.forEach(tone => {
        const voice: RobotVoice = {
          tone,
          verbosity: 'conversational',
          humor_level: 'light',
          empathy_level: 0.5
        };

        expect(validateRobotVoice(voice)).toBe(true);
      });
    });

    it('should validate all valid verbosity values', () => {
      const verbosities = ['concise', 'conversational', 'detailed'] as const;

      verbosities.forEach(verbosity => {
        const voice: RobotVoice = {
          tone: 'friendly',
          verbosity,
          humor_level: 'light',
          empathy_level: 0.5
        };

        expect(validateRobotVoice(voice)).toBe(true);
      });
    });

    it('should validate all valid humor_level values', () => {
      const levels = ['none', 'light', 'moderate', 'high'] as const;

      levels.forEach(humor_level => {
        const voice: RobotVoice = {
          tone: 'friendly',
          verbosity: 'conversational',
          humor_level,
          empathy_level: 0.5
        };

        expect(validateRobotVoice(voice)).toBe(true);
      });
    });

    it('should reject empathy_level outside 0.0-1.0 range', () => {
      const voice: RobotVoice = {
        tone: 'friendly',
        verbosity: 'conversational',
        humor_level: 'light',
        empathy_level: 1.5  // Invalid
      };

      expect(validateRobotVoice(voice)).toBe(false);
    });

    it('should accept empathy_level at boundaries', () => {
      const voiceMin: RobotVoice = {
        tone: 'friendly',
        verbosity: 'conversational',
        humor_level: 'light',
        empathy_level: 0.0
      };

      const voiceMax: RobotVoice = {
        tone: 'friendly',
        verbosity: 'conversational',
        humor_level: 'light',
        empathy_level: 1.0
      };

      expect(validateRobotVoice(voiceMin)).toBe(true);
      expect(validateRobotVoice(voiceMax)).toBe(true);
    });
  });

  describe('RobotPersonalityTraits', () => {
    it('should validate traits within valid range', () => {
      const traits: RobotPersonalityTraits = {
        efficiency_focus: 0.7,
        social_initiative: 0.5,
        adaptability: 0.8,
        assertiveness: 0.3
      };

      expect(validateRobotTraits(traits)).toBe(true);
    });

    it('should reject traits outside valid range', () => {
      const traits: RobotPersonalityTraits = {
        efficiency_focus: 1.5,  // Invalid
        social_initiative: 0.5,
        adaptability: 0.8,
        assertiveness: 0.3
      };

      expect(validateRobotTraits(traits)).toBe(false);
    });

    it('should accept all traits at 0.0', () => {
      const traits: RobotPersonalityTraits = {
        efficiency_focus: 0.0,
        social_initiative: 0.0,
        adaptability: 0.0,
        assertiveness: 0.0
      };

      expect(validateRobotTraits(traits)).toBe(true);
    });

    it('should accept all traits at 1.0', () => {
      const traits: RobotPersonalityTraits = {
        efficiency_focus: 1.0,
        social_initiative: 1.0,
        adaptability: 1.0,
        assertiveness: 1.0
      };

      expect(validateRobotTraits(traits)).toBe(true);
    });
  });

  describe('validateRobotProfile', () => {
    it('should validate a complete robot profile', () => {
      const profile: IdiomarkRInput = {
        idiomark: 'R-1.0.0',
        id: 'robot-001',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          entity: {
            name: 'BaristaBot v2.4',
            type: 'robot',
            manufacturer: 'Boston Robotics',
            model: 'BB-2400',
            capabilities: [
              { name: 'coffee_preparation', proficiency: 0.95 }
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
          domains: [{ name: 'food_service', confidence: 0.9 }],
          constraints: {
            task_types: ['food_service', 'customer_interaction'],
            interaction_style: 'balanced',
            escalation_triggers: ['customer_complaint', 'equipment_failure']
          },
          personality_traits: {
            efficiency_focus: 0.8,
            social_initiative: 0.6,
            adaptability: 0.7,
            assertiveness: 0.4
          }
        }
      };

      const result = validateRobotProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid idiomark version', () => {
      const profile: IdiomarkRInput = {
        idiomark: 'INVALID',
        id: 'robot-001',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          entity: {
            name: 'TestBot',
            type: 'robot',
            manufacturer: 'Test',
            model: 'T-100',
            capabilities: []
          }
        },
        robot_persona: {
          voice: {
            tone: 'friendly',
            verbosity: 'conversational',
            humor_level: 'light',
            empathy_level: 0.5
          },
          domains: [],
          constraints: {
            task_types: [],
            interaction_style: 'balanced',
            escalation_triggers: []
          },
          personality_traits: {
            efficiency_focus: 0.5,
            social_initiative: 0.5,
            adaptability: 0.5,
            assertiveness: 0.5
          }
        }
      };

      const result = validateRobotProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors?.idiomark).toBeDefined();
    });

    it('should reject invalid interaction_style', () => {
      const profile: IdiomarkRInput = {
        idiomark: 'R-1.0.0',
        id: 'robot-001',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          entity: {
            name: 'TestBot',
            type: 'robot',
            manufacturer: 'Test',
            model: 'T-100',
            capabilities: []
          }
        },
        robot_persona: {
          voice: {
            tone: 'friendly',
            verbosity: 'conversational',
            humor_level: 'light',
            empathy_level: 0.5
          },
          domains: [],
          constraints: {
            task_types: [],
            interaction_style: 'invalid_style' as any,
            escalation_triggers: []
          },
          personality_traits: {
            efficiency_focus: 0.5,
            social_initiative: 0.5,
            adaptability: 0.5,
            assertiveness: 0.5
          }
        }
      };

      const result = validateRobotProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors?.['robot_persona.constraints']).toBeDefined();
    });

    it('should validate profile with performance metrics', () => {
      const profile: IdiomarkRInput = {
        idiomark: 'R-1.0.0',
        id: 'robot-001',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        metadata: {
          entity: {
            name: 'BaristaBot v2.4',
            type: 'robot',
            manufacturer: 'Boston Robotics',
            model: 'BB-2400',
            capabilities: []
          }
        },
        robot_persona: {
          voice: {
            tone: 'friendly',
            verbosity: 'conversational',
            humor_level: 'light',
            empathy_level: 0.7
          },
          domains: [],
          constraints: {
            task_types: [],
            interaction_style: 'balanced',
            escalation_triggers: []
          },
          personality_traits: {
            efficiency_focus: 0.8,
            social_initiative: 0.6,
            adaptability: 0.7,
            assertiveness: 0.4
          }
        },
        performance_metrics: {
          total_interactions: 1523,
          average_effectiveness_score: 0.92,
          human_satisfaction_average: 4.7,
          best_matched_human_traits: ['high_agreeableness', 'low_neuroticism']
        }
      };

      const result = validateRobotProfile(profile);
      expect(result.valid).toBe(true);
    });
  });
});
