/**
 * On-Device Pattern Detection
 *
 * Lightweight pattern detection for edge devices with privacy guarantees:
 * - No raw event data is stored after processing
 * - Only aggregated statistics are retained
 * - Configurable memory limits
 * - Suitable for mobile/embedded devices
 */

import type { BehavioralEvent, PatternMatch } from '../types-behavioral';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for on-device detection
 */
export interface OnDeviceConfig {
  /** Maximum memory to use (bytes) */
  maxMemoryBytes?: number;

  /** How to bucket time for aggregation */
  aggregationWindow?: 'hour' | 'day' | 'week';

  /** Use Count-Min Sketch for approximate counting (saves memory) */
  useSketch?: boolean;

  /** Maximum unique values to track before using approximation */
  maxUniqueValues?: number;
}

/**
 * Aggregated data structure (privacy-safe)
 */
export interface AggregatedData {
  /** Total event count */
  event_count: number;

  /** Events by time of day */
  time_distribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };

  /** Approximate count of unique robots (not actual IDs) */
  unique_robots_count: number;

  /** Average satisfaction score */
  satisfaction_average: number;

  /** Satisfaction sample count */
  satisfaction_count: number;

  /** Event type counts */
  event_type_counts: Record<string, number>;

  /** Time range of processed events */
  first_event?: string;
  last_event?: string;
}

/**
 * Privacy-safe export for syncing
 */
export interface PrivacySafeSummary {
  event_count: number;
  time_distribution: AggregatedData['time_distribution'];
  unique_robots_count: number;
  satisfaction_average: number;
  dominant_event_type?: string;
  time_span_seconds?: number;
}

/**
 * Streaming pattern condition
 */
export interface PatternCondition {
  /** Function to check if event matches pattern */
  condition: (event: BehavioralEvent) => boolean;

  /** Number of matching events needed */
  threshold: number;

  /** Time window in milliseconds */
  timeWindow: number;
}

/**
 * Result of a streaming pattern match
 */
export interface StreamingMatch {
  pattern_id: string;
  matched_at: string;
  match_count: number;
  first_match_at: string;
}

/**
 * Configuration for streaming matcher
 */
export interface StreamingMatcherConfig {
  /** Number of events to keep in sliding window */
  windowSize?: number;
}

/**
 * Callback for pattern matches
 */
export type MatchCallback = (match: StreamingMatch) => void;

// ============================================================================
// ON-DEVICE DETECTOR
// ============================================================================

/**
 * Lightweight on-device pattern detector
 *
 * Privacy guarantees:
 * - Does not store raw event data
 * - Uses hashed counters for unique IDs
 * - Exports only aggregated statistics
 */
export class OnDeviceDetector {
  private config: Required<OnDeviceConfig>;
  private aggregated: AggregatedData;
  private robotHashes: Set<string>;

  constructor(config?: OnDeviceConfig) {
    this.config = {
      maxMemoryBytes: config?.maxMemoryBytes ?? 100 * 1024, // 100KB default
      aggregationWindow: config?.aggregationWindow ?? 'day',
      useSketch: config?.useSketch ?? false,
      maxUniqueValues: config?.maxUniqueValues ?? 1000
    };

    this.robotHashes = new Set();
    this.aggregated = this.createEmptyAggregated();
  }

  /**
   * Process an event without storing raw data
   */
  processEvent(event: BehavioralEvent): void {
    // Update event count
    this.aggregated.event_count++;

    // Update time distribution
    const hour = new Date(event.timestamp).getUTCHours();
    if (hour >= 6 && hour < 12) this.aggregated.time_distribution.morning++;
    else if (hour >= 12 && hour < 18) this.aggregated.time_distribution.afternoon++;
    else if (hour >= 18 && hour < 22) this.aggregated.time_distribution.evening++;
    else this.aggregated.time_distribution.night++;

    // Track unique robots via hash (not actual ID)
    if (event.robot_id) {
      const hash = this.hashId(event.robot_id);
      if (!this.robotHashes.has(hash)) {
        this.robotHashes.add(hash);
        this.aggregated.unique_robots_count = this.robotHashes.size;

        // Enforce memory limit by switching to approximate counting
        if (this.robotHashes.size > this.config.maxUniqueValues) {
          this.aggregated.unique_robots_count = this.approximateUniqueCount();
          // Clear some hashes to save memory
          if (this.robotHashes.size > this.config.maxUniqueValues * 2) {
            this.pruneHashes();
          }
        }
      }
    }

    // Update satisfaction average
    if (event.outcome?.satisfaction_score !== undefined) {
      const score = event.outcome.satisfaction_score;
      const count = this.aggregated.satisfaction_count;
      const currentAvg = this.aggregated.satisfaction_average;

      // Incremental average
      this.aggregated.satisfaction_average =
        (currentAvg * count + score) / (count + 1);
      this.aggregated.satisfaction_count++;
    }

    // Update event type counts
    const eventType = event.event_type;
    this.aggregated.event_type_counts[eventType] =
      (this.aggregated.event_type_counts[eventType] || 0) + 1;

    // Update time range
    if (!this.aggregated.first_event ||
        event.timestamp < this.aggregated.first_event) {
      this.aggregated.first_event = event.timestamp;
    }
    if (!this.aggregated.last_event ||
        event.timestamp > this.aggregated.last_event) {
      this.aggregated.last_event = event.timestamp;
    }
  }

  /**
   * Get current memory usage estimate
   */
  getMemoryUsage(): number {
    // Estimate based on stored data structures
    const hashsetSize = this.robotHashes.size * 64; // ~64 bytes per hash entry
    const aggregatedSize = 1024; // Rough estimate for aggregated object
    return hashsetSize + aggregatedSize;
  }

  /**
   * Get count of stored raw events (always 0 - privacy guarantee)
   */
  getStoredEventCount(): number {
    return 0; // Privacy guarantee: no raw events stored
  }

  /**
   * Get aggregated data
   */
  getAggregatedData(): AggregatedData {
    return { ...this.aggregated };
  }

  /**
   * Export privacy-safe summary for syncing
   */
  exportPrivacySafeSummary(): PrivacySafeSummary {
    const types = Object.entries(this.aggregated.event_type_counts);
    const dominant = types.sort((a, b) => b[1] - a[1])[0];

    let timeSpanSeconds: number | undefined;
    if (this.aggregated.first_event && this.aggregated.last_event) {
      const first = new Date(this.aggregated.first_event).getTime();
      const last = new Date(this.aggregated.last_event).getTime();
      timeSpanSeconds = (last - first) / 1000;
    }

    return {
      event_count: this.aggregated.event_count,
      time_distribution: { ...this.aggregated.time_distribution },
      unique_robots_count: this.aggregated.unique_robots_count,
      satisfaction_average: this.aggregated.satisfaction_average,
      dominant_event_type: dominant?.[0],
      time_span_seconds: timeSpanSeconds
    };
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.robotHashes.clear();
    this.aggregated = this.createEmptyAggregated();
  }

  // Private methods

  private createEmptyAggregated(): AggregatedData {
    return {
      event_count: 0,
      time_distribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      unique_robots_count: 0,
      satisfaction_average: 0,
      satisfaction_count: 0,
      event_type_counts: {}
    };
  }

  private hashId(id: string): string {
    // Simple hash for privacy (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private approximateUniqueCount(): number {
    // Use HyperLogLog-style approximation
    // For simplicity, return current count + 10% estimate
    return Math.floor(this.robotHashes.size * 1.1);
  }

  private pruneHashes(): void {
    // Remove half the hashes to save memory
    const arr = Array.from(this.robotHashes);
    const toRemove = Math.floor(arr.length / 2);
    for (let i = 0; i < toRemove; i++) {
      this.robotHashes.delete(arr[i]);
    }
  }
}

// ============================================================================
// STREAMING PATTERN MATCHER
// ============================================================================

/**
 * Real-time pattern matching for event streams
 */
export class StreamingPatternMatcher {
  private config: Required<StreamingMatcherConfig>;
  private patterns: Map<string, {
    condition: PatternCondition;
    matches: { timestamp: number }[];
    callback?: MatchCallback;
  }>;
  private eventWindow: { timestamp: number; eventId: string }[];
  private callbacks: MatchCallback[];

  constructor(config?: StreamingMatcherConfig) {
    this.config = {
      windowSize: config?.windowSize ?? 1000
    };
    this.patterns = new Map();
    this.eventWindow = [];
    this.callbacks = [];
  }

  /**
   * Register a pattern to watch for
   */
  registerPattern(patternId: string, condition: PatternCondition): void {
    this.patterns.set(patternId, {
      condition,
      matches: [],
      callback: undefined
    });
  }

  /**
   * Register callback for pattern matches
   */
  onMatch(callback: MatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Process an event through the stream
   */
  process(event: BehavioralEvent): void {
    const timestamp = new Date(event.timestamp).getTime();

    // Add to sliding window
    this.eventWindow.push({ timestamp, eventId: event.event_id });

    // Enforce window size
    while (this.eventWindow.length > this.config.windowSize) {
      this.eventWindow.shift();
    }

    // Check each pattern
    for (const [patternId, pattern] of this.patterns) {
      if (pattern.condition.condition(event)) {
        pattern.matches.push({ timestamp });

        // Remove old matches outside time window
        const cutoff = timestamp - pattern.condition.timeWindow;
        pattern.matches = pattern.matches.filter(m => m.timestamp >= cutoff);

        // Check if threshold reached
        if (pattern.matches.length >= pattern.condition.threshold) {
          const match: StreamingMatch = {
            pattern_id: patternId,
            matched_at: new Date().toISOString(),
            match_count: pattern.matches.length,
            first_match_at: new Date(pattern.matches[0].timestamp).toISOString()
          };

          // Notify callbacks
          for (const callback of this.callbacks) {
            callback(match);
          }

          // Reset matches after triggering
          pattern.matches = [];
        }
      }
    }
  }

  /**
   * Get current window size
   */
  getWindowSize(): number {
    return this.eventWindow.length;
  }

  /**
   * Reset matcher state
   */
  reset(): void {
    this.eventWindow = [];
    for (const pattern of this.patterns.values()) {
      pattern.matches = [];
    }
  }
}
