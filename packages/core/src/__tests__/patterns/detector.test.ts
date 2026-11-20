import { describe, it, expect } from 'vitest';
import {
  detectTimePatterns,
  detectPreferencePatterns,
  detectInteractionPatterns,
  PatternDetector,
  type TimePatternResult,
  type PreferencePatternResult
} from '../../patterns/detector';
import type { BehavioralEvent, BehavioralStream } from '../../types-behavioral';

// Helper to create test events
function createTestEvent(
  id: string,
  timestamp: string,
  eventType: string,
  overrides?: Partial<BehavioralEvent>
): BehavioralEvent {
  return {
    event_id: id,
    timestamp,
    event_type: eventType as any,
    human_idiomark_id: 'test-human',
    ...overrides
  };
}

describe('Pattern Detection', () => {
  describe('detectTimePatterns', () => {
    it('should detect morning preference from multiple events', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T08:30:00Z', 'robot_interaction'),
        createTestEvent('3', '2026-01-03T09:00:00Z', 'robot_interaction'),
        createTestEvent('4', '2026-01-04T14:00:00Z', 'robot_interaction'), // afternoon
        createTestEvent('5', '2026-01-05T08:15:00Z', 'robot_interaction')
      ];

      const result = detectTimePatterns(events);

      expect(result.detected).toBe(true);
      expect(result.preferred_time).toBe('morning');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect evening preference', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T18:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T19:30:00Z', 'robot_interaction'),
        createTestEvent('3', '2026-01-03T20:00:00Z', 'robot_interaction'),
        createTestEvent('4', '2026-01-04T18:45:00Z', 'robot_interaction')
      ];

      const result = detectTimePatterns(events);

      expect(result.detected).toBe(true);
      expect(result.preferred_time).toBe('evening');
    });

    it('should return no pattern for insufficient data', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction')
      ];

      const result = detectTimePatterns(events);

      // With only 1 event, detected should be false (need >= 3 events)
      expect(result.detected).toBe(false);
      expect(result.events_analyzed).toBe(1);
    });

    it('should return no pattern for uniform distribution', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction'),  // morning
        createTestEvent('2', '2026-01-02T14:00:00Z', 'robot_interaction'),  // afternoon
        createTestEvent('3', '2026-01-03T20:00:00Z', 'robot_interaction'),  // evening
        createTestEvent('4', '2026-01-04T03:00:00Z', 'robot_interaction')   // night
      ];

      const result = detectTimePatterns(events);

      // With equal distribution, confidence should be low
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe('detectPreferencePatterns', () => {
    it('should detect preference drift toward faster service', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'preference_change', {
          outcome: {
            preference_shift: {
              field: 'service_speed',
              previous_value: 'moderate',
              new_value: 'fast'
            }
          }
        }),
        createTestEvent('2', '2026-01-15T10:00:00Z', 'preference_change', {
          outcome: {
            preference_shift: {
              field: 'service_speed',
              previous_value: 'fast',
              new_value: 'very_fast'
            }
          }
        })
      ];

      const result = detectPreferencePatterns(events);

      // Should detect a drift in the service_speed field
      expect(result.detected).toBe(true);
      expect(result.drifts).toContainEqual(
        expect.objectContaining({
          field: 'service_speed'
        })
      );
      expect(result.drifts[0].confidence).toBeGreaterThan(0.5);
    });

    it('should detect stability when no changes', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T10:00:00Z', 'robot_interaction'),
        createTestEvent('3', '2026-01-03T10:00:00Z', 'robot_interaction')
      ];

      const result = detectPreferencePatterns(events);

      expect(result.stability_score).toBeGreaterThan(0.8);
    });
  });

  describe('detectInteractionPatterns', () => {
    it('should detect preferred interaction style', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'robot_interaction', {
          context: {
            duration_seconds: 60
          },
          outcome: {
            satisfaction_score: 0.9
          }
        }),
        createTestEvent('2', '2026-01-02T10:00:00Z', 'robot_interaction', {
          context: {
            duration_seconds: 45
          },
          outcome: {
            satisfaction_score: 0.85
          }
        }),
        createTestEvent('3', '2026-01-03T10:00:00Z', 'robot_interaction', {
          context: {
            duration_seconds: 300  // long interaction
          },
          outcome: {
            satisfaction_score: 0.4  // low satisfaction
          }
        })
      ];

      const result = detectInteractionPatterns(events);

      expect(result.preferred_duration_range).toBeDefined();
      expect(result.preferred_duration_range?.max).toBeLessThan(120);
    });

    it('should detect context preferences', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'robot_interaction', {
          context: { location: 'coffee_shop' },
          outcome: { satisfaction_score: 0.9 }
        }),
        createTestEvent('2', '2026-01-02T10:00:00Z', 'robot_interaction', {
          context: { location: 'coffee_shop' },
          outcome: { satisfaction_score: 0.85 }
        }),
        createTestEvent('3', '2026-01-03T10:00:00Z', 'robot_interaction', {
          context: { location: 'grocery_store' },
          outcome: { satisfaction_score: 0.5 }
        })
      ];

      const result = detectInteractionPatterns(events);

      expect(result.preferred_contexts).toContain('coffee_shop');
    });
  });

  describe('PatternDetector', () => {
    it('should create detector with default config', () => {
      const detector = new PatternDetector();

      expect(detector).toBeDefined();
      expect(detector.getConfig()).toBeDefined();
    });

    it('should run all pattern detection on a stream', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction', {
          robot_id: 'robot-001',
          context: { location: 'restaurant' },
          outcome: { satisfaction_score: 0.9 }
        }),
        createTestEvent('2', '2026-01-02T08:30:00Z', 'robot_interaction', {
          robot_id: 'robot-001',
          context: { location: 'restaurant' },
          outcome: { satisfaction_score: 0.85 }
        }),
        createTestEvent('3', '2026-01-03T09:00:00Z', 'robot_interaction', {
          robot_id: 'robot-001',
          context: { location: 'restaurant' },
          outcome: { satisfaction_score: 0.9 }
        })
      ];

      const detector = new PatternDetector();
      const results = detector.detectAllPatterns(events);

      expect(results.time_patterns).toBeDefined();
      expect(results.interaction_patterns).toBeDefined();
      expect(results.preference_patterns).toBeDefined();
    });

    it('should respect minimum event threshold', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction')
      ];

      const detector = new PatternDetector({ min_events: 5 });
      const results = detector.detectAllPatterns(events);

      // With only 1 event and min_events=5, patterns should not be detected
      expect(results.time_patterns.detected).toBe(false);
    });

    it('should allow custom confidence threshold', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T08:30:00Z', 'robot_interaction'),
        createTestEvent('3', '2026-01-03T14:00:00Z', 'robot_interaction')  // different time
      ];

      const detector = new PatternDetector({
        confidence_threshold: 0.9  // Require 90% confidence
      });

      const results = detector.detectAllPatterns(events);

      // With 2/3 morning and 0.9 threshold, should not detect
      expect(results.time_patterns.confidence).toBeLessThan(0.9);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event list', () => {
      const events: BehavioralEvent[] = [];

      expect(() => detectTimePatterns(events)).not.toThrow();
      expect(detectTimePatterns(events).detected).toBe(false);
    });

    it('should handle events without context', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T10:00:00Z', 'robot_interaction')
      ];

      expect(() => detectInteractionPatterns(events)).not.toThrow();
    });

    it('should handle events with missing outcome', () => {
      const events: BehavioralEvent[] = [
        createTestEvent('1', '2026-01-01T10:00:00Z', 'robot_interaction'),
        createTestEvent('2', '2026-01-02T10:00:00Z', 'robot_interaction')
      ];

      expect(() => detectPreferencePatterns(events)).not.toThrow();
    });
  });
});
