import { describe, it, expect } from 'vitest';
import {
  AnticipatoryEngine,
  ContextAnalyzer,
  PreferencePredictor,
  type PredictionContext,
  type AnticipatedNeed
} from '../../anticipatory/service';
import type { BehavioralEvent } from '../../types-behavioral';

describe('Anticipatory Service Layer', () => {
  describe('ContextAnalyzer', () => {
    it('should analyze current context', () => {
      const analyzer = new ContextAnalyzer();

      const context = analyzer.analyze({
        time_of_day: 'morning',
        day_of_week: 'monday',
        location: 'coffee_shop',
        recent_events: []
      });

      expect(context.time_context).toBeDefined();
      expect(context.location_context).toBeDefined();
    });

    it('should identify morning context', () => {
      const analyzer = new ContextAnalyzer();

      const context = analyzer.analyze({
        time_of_day: 'morning',
        day_of_week: 'weekday'
      });

      expect(context.time_context).toContain('morning');
    });

    it('should identify weekend context', () => {
      const analyzer = new ContextAnalyzer();

      const context = analyzer.analyze({
        time_of_day: 'afternoon',
        day_of_week: 'saturday'
      });

      expect(context.time_context).toContain('weekend');
    });

    it('should analyze location type', () => {
      const analyzer = new ContextAnalyzer();

      const restaurantContext = analyzer.analyze({
        location: 'restaurant'
      });

      const homeContext = analyzer.analyze({
        location: 'home'
      });

      expect(restaurantContext.location_type).toBe('commercial');
      expect(homeContext.location_type).toBe('residential');
    });
  });

  describe('PreferencePredictor', () => {
    it('should predict preferences from patterns', () => {
      const predictor = new PreferencePredictor();

      const patterns = [
        {
          pattern_type: 'time_preference',
          pattern_data: { preferred_time: 'morning' },
          confidence: 0.9
        },
        {
          pattern_type: 'interaction_style',
          pattern_data: { preferred_style: 'quick' },
          confidence: 0.8
        }
      ];

      const predictions = predictor.predict(patterns);

      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.find(p => p.field === 'preferred_time')).toBeDefined();
    });

    it('should weight predictions by pattern confidence', () => {
      const predictor = new PreferencePredictor();

      const patterns = [
        {
          pattern_type: 'time_preference',
          pattern_data: { preferred_time: 'evening' },
          confidence: 0.9
        },
        {
          pattern_type: 'time_preference',
          pattern_data: { preferred_time: 'morning' },
          confidence: 0.3
        }
      ];

      const predictions = predictor.predict(patterns);
      const timePrediction = predictions.find(p => p.field === 'preferred_time');

      // Should prefer higher confidence prediction
      expect(timePrediction?.predicted_value).toBe('evening');
    });
  });

  describe('AnticipatoryEngine', () => {
    it('should anticipate needs from context and history', () => {
      const engine = new AnticipatoryEngine();

      const events: BehavioralEvent[] = [
        {
          event_id: '1',
          timestamp: '2026-01-01T08:00:00Z',
          event_type: 'robot_interaction',
          human_idiomark_id: 'human-001',
          robot_id: 'robot-001',
          outcome: { satisfaction_score: 0.9 }
        },
        {
          event_id: '2',
          timestamp: '2026-01-02T08:30:00Z',
          event_type: 'robot_interaction',
          human_idiomark_id: 'human-001',
          robot_id: 'robot-001',
          outcome: { satisfaction_score: 0.85 }
        },
        {
          event_id: '3',
          timestamp: '2026-01-03T08:15:00Z',
          event_type: 'robot_interaction',
          human_idiomark_id: 'human-001',
          robot_id: 'robot-001',
          outcome: { satisfaction_score: 0.9 }
        }
      ];

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {
          time_of_day: 'morning',
          day_of_week: 'weekday'
        },
        behavioral_history: events
      });

      expect(anticipations.length).toBeGreaterThan(0);
    });

    it('should rank anticipations by likelihood', () => {
      const engine = new AnticipatoryEngine();

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {
          time_of_day: 'morning'
        },
        behavioral_history: []
      });

      // Should be sorted by likelihood descending
      for (let i = 1; i < anticipations.length; i++) {
        expect(anticipations[i - 1].likelihood).toBeGreaterThanOrEqual(
          anticipations[i].likelihood
        );
      }
    });

    it('should include recommended actions', () => {
      const engine = new AnticipatoryEngine();

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {
          location: 'coffee_shop',
          time_of_day: 'morning'
        },
        behavioral_history: []
      });

      const firstAnticipation = anticipations[0];
      if (firstAnticipation) {
        expect(firstAnticipation.recommended_actions).toBeDefined();
      }
    });

    it('should learn from repeated patterns', () => {
      const engine = new AnticipatoryEngine();

      // Simulate repeated morning coffee interactions
      const events: BehavioralEvent[] = [];
      for (let i = 1; i <= 10; i++) {
        events.push({
          event_id: `${i}`,
          timestamp: `2026-01-${i.toString().padStart(2, '0')}T08:00:00Z`,
          event_type: 'robot_interaction',
          human_idiomark_id: 'human-001',
          robot_id: 'coffee-robot',
          context: { location: 'coffee_shop' },
          outcome: { satisfaction_score: 0.9, task_completed: true }
        });
      }

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {
          time_of_day: 'morning',
          location: 'coffee_shop'
        },
        behavioral_history: events
      });

      // Should have high confidence for coffee-related anticipation
      const coffeeAnticipation = anticipations.find(
        a => a.need_type === 'coffee_service' || a.need_type === 'beverage'
      );

      expect(coffeeAnticipation?.likelihood).toBeGreaterThan(0.7);
    });
  });

  describe('Integration with Behavioral Patterns', () => {
    it('should use detected patterns for prediction', () => {
      const engine = new AnticipatoryEngine();

      const detectedPatterns = [
        {
          pattern_id: 'pat-1',
          pattern_type: 'time_preference',
          detected_at: new Date().toISOString(),
          confidence: 0.9,
          pattern_data: { preferred_time: 'morning', occurrence_count: 15 }
        }
      ];

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {
          time_of_day: 'morning'
        },
        behavioral_history: [],
        detected_patterns: detectedPatterns
      });

      expect(anticipations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty history gracefully', () => {
      const engine = new AnticipatoryEngine();

      const anticipations = engine.anticipate({
        human_idiomark_id: 'human-001',
        current_context: {},
        behavioral_history: []
      });

      // Should return some default anticipations or empty array
      expect(Array.isArray(anticipations)).toBe(true);
    });

    it('should handle unknown locations', () => {
      const analyzer = new ContextAnalyzer();

      const context = analyzer.analyze({
        location: 'unknown_place_xyz'
      });

      expect(context.location_type).toBeDefined();
    });

    it('should degrade gracefully with low confidence patterns', () => {
      const predictor = new PreferencePredictor();

      const lowConfidencePatterns = [
        {
          pattern_type: 'time_preference',
          pattern_data: { preferred_time: 'night' },
          confidence: 0.1
        }
      ];

      const predictions = predictor.predict(lowConfidencePatterns);

      // Should still make predictions but with low confidence
      predictions.forEach(p => {
        expect(p.confidence).toBeLessThanOrEqual(0.3);
      });
    });
  });
});
