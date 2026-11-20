import { describe, it, expect } from 'vitest';
import {
  OnDeviceDetector,
  StreamingPatternMatcher,
  type OnDeviceConfig,
  type StreamingMatch
} from '../../patterns/on-device';
import type { BehavioralEvent } from '../../types-behavioral';

// Helper to create test events
function createEvent(id: string, timestamp: string, type: string): BehavioralEvent {
  return {
    event_id: id,
    timestamp,
    event_type: type as any,
    human_idiomark_id: 'test-human'
  };
}

describe('On-Device Pattern Detection', () => {
  describe('OnDeviceDetector', () => {
    it('should create detector with minimal memory footprint', () => {
      const detector = new OnDeviceDetector();

      expect(detector).toBeDefined();
      expect(detector.getMemoryUsage()).toBeLessThan(1024 * 1024); // < 1MB
    });

    it('should process events without storing raw data', () => {
      const detector = new OnDeviceDetector();

      const event: BehavioralEvent = {
        event_id: '1',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'test',
        context: { duration_seconds: 300 }
      };

      detector.processEvent(event);

      // Raw events should not be stored
      expect(detector.getStoredEventCount()).toBe(0);
      // Only aggregated data should be kept
      expect(detector.getAggregatedData()).toBeDefined();
    });

    it('should aggregate events by time of day', () => {
      const detector = new OnDeviceDetector();

      // Process multiple morning events
      for (let i = 0; i < 5; i++) {
        detector.processEvent(createEvent(
          `${i}`,
          `2026-01-0${i + 1}T08:00:00Z`,
          'robot_interaction'
        ));
      }

      const aggregated = detector.getAggregatedData();

      expect(aggregated.time_distribution.morning).toBe(5);
    });

    it('should track unique robots without storing IDs', () => {
      const detector = new OnDeviceDetector();

      detector.processEvent({
        event_id: '1',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'test',
        robot_id: 'robot-001'
      });

      detector.processEvent({
        event_id: '2',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'test',
        robot_id: 'robot-002'
      });

      detector.processEvent({
        event_id: '3',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'test',
        robot_id: 'robot-001'  // Same robot
      });

      const aggregated = detector.getAggregatedData();

      // Should count 2 unique robots without storing actual IDs
      expect(aggregated.unique_robots_count).toBe(2);
      // Should not expose actual robot IDs
      expect(aggregated.robot_ids).toBeUndefined();
    });

    it('should respect configured memory limit', () => {
      const config: OnDeviceConfig = {
        maxMemoryBytes: 100 * 1024, // 100KB
        aggregationWindow: 'hour'
      };

      const detector = new OnDeviceDetector(config);

      // Process many events
      for (let i = 0; i < 1000; i++) {
        detector.processEvent(createEvent(
          `${i}`,
          new Date(Date.now() + i * 60000).toISOString(),
          'robot_interaction'
        ));
      }

      expect(detector.getMemoryUsage()).toBeLessThan(config.maxMemoryBytes!);
    });

    it('should export privacy-safe summary', () => {
      const detector = new OnDeviceDetector();

      detector.processEvent({
        event_id: '1',
        timestamp: '2026-01-01T08:00:00Z',
        event_type: 'robot_interaction',
        human_idiomark_id: 'test',
        robot_id: 'robot-001',
        context: { location: 'restaurant' },
        outcome: { satisfaction_score: 0.9 }
      });

      const summary = detector.exportPrivacySafeSummary();

      // Summary should not contain PII
      expect(summary.robot_ids).toBeUndefined();
      expect(summary.locations).toBeUndefined();
      expect(summary.raw_events).toBeUndefined();

      // Summary should contain aggregates
      expect(summary.event_count).toBe(1);
      expect(summary.satisfaction_average).toBeCloseTo(0.9);
    });
  });

  describe('StreamingPatternMatcher', () => {
    it('should match patterns in real-time stream', () => {
      const matcher = new StreamingPatternMatcher();

      // Define a simple pattern: 3+ morning interactions within a week
      matcher.registerPattern('morning_user', {
        condition: (event) => {
          const hour = new Date(event.timestamp).getUTCHours();
          return hour >= 6 && hour < 12;
        },
        threshold: 3,
        timeWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Process events
      let match: StreamingMatch | null = null;
      matcher.onMatch((m) => { match = m; });

      matcher.process(createEvent('1', '2026-01-01T08:00:00Z', 'robot_interaction')); // No match yet
      expect(match).toBeNull();

      matcher.process(createEvent('2', '2026-01-02T09:00:00Z', 'robot_interaction')); // No match yet
      expect(match).toBeNull();

      matcher.process(createEvent('3', '2026-01-03T10:00:00Z', 'robot_interaction')); // Match!
      expect(match).not.toBeNull();
      expect(match?.pattern_id).toBe('morning_user');
    });

    it('should expire old events from sliding window', () => {
      const matcher = new StreamingPatternMatcher({
        windowSize: 2 // Only keep last 2 events in window
      });

      // Verify sliding window size
      expect(matcher.getWindowSize()).toBe(0);

      matcher.process(createEvent('1', '2026-01-01T00:00:00Z', 'robot_interaction'));
      expect(matcher.getWindowSize()).toBe(1);

      matcher.process(createEvent('2', '2026-01-02T00:00:00Z', 'robot_interaction'));
      expect(matcher.getWindowSize()).toBe(2);

      matcher.process(createEvent('3', '2026-01-03T00:00:00Z', 'robot_interaction'));
      // Window should still be 2 (oldest event expired)
      expect(matcher.getWindowSize()).toBe(2);
    });

    it('should handle high-throughput streams', () => {
      const matcher = new StreamingPatternMatcher();

      matcher.registerPattern('test', {
        condition: () => true,
        threshold: 100,
        timeWindow: Infinity
      });

      const startTime = Date.now();

      // Process 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        matcher.process(createEvent(`${i}`, new Date().toISOString(), 'robot_interaction'));
      }

      const duration = Date.now() - startTime;

      // Should process in under 100ms (10k events/sec minimum)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Privacy Guarantees', () => {
    it('should not store raw event data after processing', () => {
      const detector = new OnDeviceDetector();

      const sensitiveEvent: BehavioralEvent = {
        event_id: 'sensitive',
        timestamp: new Date().toISOString(),
        event_type: 'robot_interaction',
        human_idiomark_id: 'secret-user-id',
        robot_id: 'secret-robot-id',
        context: {
          location: 'secret-location',
          environmental_factors: {
            private_data: 'should-not-be-stored'
          }
        }
      };

      detector.processEvent(sensitiveEvent);

      // Verify no raw data storage
      const exported = JSON.stringify(detector.getAggregatedData());

      expect(exported).not.toContain('secret-user-id');
      expect(exported).not.toContain('secret-robot-id');
      expect(exported).not.toContain('secret-location');
      expect(exported).not.toContain('should-not-be-stored');
    });

    it('should use Count-Min Sketch for counting', () => {
      const detector = new OnDeviceDetector({
        useSketch: true
      });

      // Process many unique robot IDs
      for (let i = 0; i < 100; i++) {
        detector.processEvent({
          event_id: `${i}`,
          timestamp: new Date().toISOString(),
          event_type: 'robot_interaction',
          human_idiomark_id: 'test',
          robot_id: `robot-${i}`
        });
      }

      // Should use approximate counting without storing exact IDs
      const data = detector.getAggregatedData();
      expect(data.unique_robots_count).toBeGreaterThan(0);
      expect(data.robot_ids).toBeUndefined();
    });
  });
});
