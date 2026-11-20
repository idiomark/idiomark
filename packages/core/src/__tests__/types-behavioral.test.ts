import { describe, it, expect } from 'vitest';
import {
  BehavioralEvent,
  BehavioralStream,
  PatternMatch,
  BehavioralFeedback,
  InteractionContext,
  validateBehavioralEvent,
  createBehavioralStream,
  addEventToStream
} from '../types-behavioral';

describe('Behavioral Types', () => {
  describe('BehavioralEvent', () => {
    it('should define valid event types', () => {
      const event: BehavioralEvent = {
        event_id: 'evt-001',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        robot_id: 'robot-001',
        human_idiomark_id: 'human-001',
        context: {
          location: 'restaurant',
          duration_seconds: 300,
          interaction_quality: 0.85
        },
        outcome: {
          success: true,
          satisfaction_score: 0.9,
          preference_shift: {
            field: 'service_speed',
            previous_value: 'moderate',
            new_value: 'fast'
          }
        }
      };

      expect(event.event_type).toBe('robot_interaction');
      expect(event.outcome?.success).toBe(true);
    });

    it('should support multiple event types', () => {
      const eventTypes = [
        'robot_interaction',
        'preference_change',
        'feedback_submitted',
        'match_accepted',
        'match_rejected',
        'token_generated',
        'token_expired'
      ];

      eventTypes.forEach(type => {
        const event: BehavioralEvent = {
          event_id: `evt-${type}`,
          timestamp: new Date().toISOString(),
          event_type: type as any,
          human_idiomark_id: 'human-001'
        };

        expect(event.event_type).toBe(type);
      });
    });
  });

  describe('validateBehavioralEvent', () => {
    it('should validate a complete behavioral event', () => {
      const event: BehavioralEvent = {
        event_id: 'evt-001',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001',
        robot_id: 'robot-001',
        context: {
          duration_seconds: 300
        }
      };

      const result = validateBehavioralEvent(event);
      expect(result.valid).toBe(true);
    });

    it('should reject event without event_id', () => {
      const event = {
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001'
      } as BehavioralEvent;

      const result = validateBehavioralEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors?.event_id).toBeDefined();
    });

    it('should reject event without timestamp', () => {
      const event = {
        event_id: 'evt-001',
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001'
      } as BehavioralEvent;

      const result = validateBehavioralEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors?.timestamp).toBeDefined();
    });

    it('should reject invalid timestamp format', () => {
      const event: BehavioralEvent = {
        event_id: 'evt-001',
        timestamp: 'invalid-date',
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001'
      };

      const result = validateBehavioralEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors?.timestamp).toBeDefined();
    });

    it('should reject event without human_idiomark_id', () => {
      const event = {
        event_id: 'evt-001',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction'
      } as BehavioralEvent;

      const result = validateBehavioralEvent(event);
      expect(result.valid).toBe(false);
      expect(result.errors?.human_idiomark_id).toBeDefined();
    });
  });

  describe('BehavioralStream', () => {
    it('should create a behavioral stream', () => {
      const stream = createBehavioralStream('human-001');

      expect(stream.stream_id).toBeDefined();
      expect(stream.human_idiomark_id).toBe('human-001');
      expect(stream.events).toEqual([]);
      expect(stream.metadata.event_count).toBe(0);
    });

    it('should add events to stream', () => {
      const stream = createBehavioralStream('human-001');

      const event1: BehavioralEvent = {
        event_id: 'evt-001',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001',
        robot_id: 'robot-001'
      };

      const updatedStream = addEventToStream(stream, event1);

      expect(updatedStream.events).toHaveLength(1);
      expect(updatedStream.metadata.event_count).toBe(1);
      expect(updatedStream.metadata.first_event_at).toBe(event1.timestamp);
      expect(updatedStream.metadata.last_event_at).toBe(event1.timestamp);
    });

    it('should track time range in metadata', () => {
      const stream = createBehavioralStream('human-001');

      const event1: BehavioralEvent = {
        event_id: 'evt-001',
        timestamp: '2026-01-01T10:00:00Z',
        event_type: 'robot_interaction',
        human_idiomark_id: 'human-001'
      };

      const event2: BehavioralEvent = {
        event_id: 'evt-002',
        timestamp: '2026-01-02T15:30:00Z',
        event_type: 'feedback_submitted',
        human_idiomark_id: 'human-001'
      };

      let updated = addEventToStream(stream, event1);
      updated = addEventToStream(updated, event2);

      expect(updated.metadata.first_event_at).toBe('2026-01-01T10:00:00Z');
      expect(updated.metadata.last_event_at).toBe('2026-01-02T15:30:00Z');
    });
  });

  describe('PatternMatch', () => {
    it('should define a detected pattern', () => {
      const pattern: PatternMatch = {
        pattern_id: 'pat-001',
        pattern_type: 'time_preference',
        detected_at: new Date().toISOString(),
        confidence: 0.85,
        pattern_data: {
          preferred_time: 'morning',
          occurrence_count: 15,
          time_range: { start: '07:00', end: '09:00' }
        },
        source_events: ['evt-001', 'evt-002', 'evt-003']
      };

      expect(pattern.confidence).toBeGreaterThan(0.8);
      expect(pattern.pattern_type).toBe('time_preference');
    });

    it('should support multiple pattern types', () => {
      const patternTypes = [
        'time_preference',
        'interaction_style',
        'preference_drift',
        'satisfaction_pattern',
        'robot_affinity'
      ];

      patternTypes.forEach(type => {
        const pattern: PatternMatch = {
          pattern_id: `pat-${type}`,
          pattern_type: type as any,
          detected_at: new Date().toISOString(),
          confidence: 0.5,
          pattern_data: {},
          source_events: []
        };

        expect(pattern.pattern_type).toBe(type);
      });
    });
  });

  describe('BehavioralFeedback', () => {
    it('should capture user feedback', () => {
      const feedback: BehavioralFeedback = {
        feedback_id: 'fb-001',
        timestamp: new Date().toISOString(),
        human_idiomark_id: 'human-001',
        robot_id: 'robot-001',
        interaction_id: 'int-001',
        rating: 4,
        aspects: {
          communication: 'good',
          helpfulness: 'excellent',
          personalization: 'good'
        },
        would_recommend: true,
        comments: 'Great service, understood my preferences well'
      };

      expect(feedback.rating).toBe(4);
      expect(feedback.would_recommend).toBe(true);
    });

    it('should support different feedback types', () => {
      const explicitFeedback: BehavioralFeedback = {
        feedback_id: 'fb-001',
        timestamp: new Date().toISOString(),
        human_idiomark_id: 'human-001',
        feedback_type: 'explicit',
        rating: 5
      };

      const implicitFeedback: BehavioralFeedback = {
        feedback_id: 'fb-002',
        timestamp: new Date().toISOString(),
        human_idiomark_id: 'human-001',
        feedback_type: 'implicit',
        behavioral_signals: {
          session_duration_seconds: 600,
          returned_within_24h: true,
          interaction_count: 3
        }
      };

      expect(explicitFeedback.feedback_type).toBe('explicit');
      expect(implicitFeedback.feedback_type).toBe('implicit');
    });
  });

  describe('InteractionContext', () => {
    it('should capture interaction context', () => {
      const context: InteractionContext = {
        location: 'coffee_shop',
        time_of_day: 'morning',
        day_of_week: 'monday',
        duration_seconds: 180,
        interaction_quality: 0.9,
        devices_present: ['phone', 'watch'],
        environmental_factors: {
          noise_level: 'moderate',
          crowd_level: 'low'
        }
      };

      expect(context.location).toBe('coffee_shop');
      expect(context.interaction_quality).toBeGreaterThan(0.8);
    });
  });
});
