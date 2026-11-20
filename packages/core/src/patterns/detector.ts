/**
 * Pattern Detection Algorithms
 *
 * Detects patterns in behavioral event streams to improve
 * personalization and robot matching.
 */

import type { BehavioralEvent, PatternMatch, PatternType } from '../types-behavioral';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of time pattern detection
 */
export interface TimePatternResult {
  /** Whether a pattern was detected */
  detected: boolean;

  /** Preferred time of day */
  preferred_time?: 'morning' | 'afternoon' | 'evening' | 'night';

  /** Confidence level (0.0-1.0) */
  confidence: number;

  /** Time distribution */
  distribution?: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };

  /** Number of events analyzed */
  events_analyzed: number;
}

/**
 * Detected preference drift
 */
export interface PreferenceDrift {
  /** Field that is drifting */
  field: string;

  /** Direction of drift */
  direction: 'increasing' | 'decreasing' | 'oscillating';

  /** Rate of change */
  rate: number;

  /** Confidence in drift detection */
  confidence: number;
}

/**
 * Result of preference pattern detection
 */
export interface PreferencePatternResult {
  /** Whether any patterns detected */
  detected: boolean;

  /** Stability score (0.0 = stable, 1.0 = volatile) */
  stability_score: number;

  /** Detected drifts */
  drifts: PreferenceDrift[];

  /** Number of preference changes */
  changes_count: number;

  /** Events analyzed */
  events_analyzed: number;
}

/**
 * Result of interaction pattern detection
 */
export interface InteractionPatternResult {
  /** Whether patterns detected */
  detected: boolean;

  /** Preferred interaction duration range (seconds) */
  preferred_duration_range?: {
    min: number;
    max: number;
  };

  /** Contexts with high satisfaction */
  preferred_contexts: string[];

  /** Robots with high satisfaction */
  preferred_robots: string[];

  /** Average satisfaction score */
  average_satisfaction: number;

  /** Events analyzed */
  events_analyzed: number;
}

/**
 * All pattern detection results
 */
export interface AllPatternResults {
  time_patterns: TimePatternResult;
  preference_patterns: PreferencePatternResult;
  interaction_patterns: InteractionPatternResult;
}

/**
 * Pattern detector configuration
 */
export interface PatternDetectorConfig {
  /** Minimum events before detecting patterns */
  min_events?: number;

  /** Minimum confidence threshold */
  confidence_threshold?: number;

  /** Time window for pattern detection (days) */
  time_window_days?: number;
}

// ============================================================================
// TIME PATTERN DETECTION
// ============================================================================

/**
 * Categorizes hour into time of day
 */
function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Detects time-based patterns in behavioral events
 *
 * @param events - Events to analyze
 * @returns Time pattern detection result
 */
export function detectTimePatterns(events: BehavioralEvent[]): TimePatternResult {
  if (events.length === 0) {
    return {
      detected: false,
      confidence: 0,
      events_analyzed: 0
    };
  }

  // Count events by time of day
  const counts = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  };

  for (const event of events) {
    const date = new Date(event.timestamp);
    const hour = date.getUTCHours();
    const timeOfDay = getTimeOfDay(hour);
    counts[timeOfDay]++;
  }

  const total = events.length;
  const distribution = {
    morning: counts.morning / total,
    afternoon: counts.afternoon / total,
    evening: counts.evening / total,
    night: counts.night / total
  };

  // Find dominant time
  const times = Object.entries(counts) as [keyof typeof counts, number][];
  const sorted = times.sort((a, b) => b[1] - a[1]);
  const [dominantTime, dominantCount] = sorted[0];

  // Confidence is based on how dominant the preference is
  const confidence = dominantCount / total;

  // Need at least 3 events and dominant time > 50% for detection
  const detected = total >= 3 && confidence > 0.5;

  return {
    detected,
    preferred_time: detected ? dominantTime : undefined,
    confidence,
    distribution,
    events_analyzed: total
  };
}

// ============================================================================
// PREFERENCE PATTERN DETECTION
// ============================================================================

/**
 * Detects preference drift patterns
 *
 * @param events - Events to analyze
 * @returns Preference pattern detection result
 */
export function detectPreferencePatterns(
  events: BehavioralEvent[]
): PreferencePatternResult {
  if (events.length === 0) {
    return {
      detected: false,
      stability_score: 1, // No changes = stable
      drifts: [],
      changes_count: 0,
      events_analyzed: 0
    };
  }

  // Extract preference change events
  const changeEvents = events.filter(
    e => e.event_type === 'preference_change' && e.outcome?.preference_shift
  );

  const drifts: PreferenceDrift[] = [];
  const fieldChanges = new Map<string, { values: unknown[]; timestamps: string[] }>();

  // Group changes by field
  for (const event of changeEvents) {
    const shift = event.outcome!.preference_shift!;
    if (!fieldChanges.has(shift.field)) {
      fieldChanges.set(shift.field, { values: [], timestamps: [] });
    }
    const entry = fieldChanges.get(shift.field)!;
    entry.values.push(shift.new_value);
    entry.timestamps.push(event.timestamp);
  }

  // Analyze drift for each field
  for (const [field, data] of fieldChanges) {
    if (data.values.length >= 2) {
      // Simple drift detection: if values are trending in a direction
      const drift: PreferenceDrift = {
        field,
        direction: 'oscillating',
        rate: data.values.length / events.length,
        confidence: Math.min(1, data.values.length / 3)
      };

      drifts.push(drift);
    }
  }

  // Calculate stability score
  // More changes = lower stability
  const stabilityScore = Math.max(0, 1 - (changeEvents.length / Math.max(1, events.length)));

  return {
    detected: drifts.length > 0,
    stability_score: stabilityScore,
    drifts,
    changes_count: changeEvents.length,
    events_analyzed: events.length
  };
}

// ============================================================================
// INTERACTION PATTERN DETECTION
// ============================================================================

/**
 * Detects interaction patterns
 *
 * @param events - Events to analyze
 * @returns Interaction pattern detection result
 */
export function detectInteractionPatterns(
  events: BehavioralEvent[]
): InteractionPatternResult {
  if (events.length === 0) {
    return {
      detected: false,
      preferred_contexts: [],
      preferred_robots: [],
      average_satisfaction: 0,
      events_analyzed: 0
    };
  }

  // Filter to robot interactions
  const interactions = events.filter(e => e.event_type === 'robot_interaction');

  if (interactions.length === 0) {
    return {
      detected: false,
      preferred_contexts: [],
      preferred_robots: [],
      average_satisfaction: 0,
      events_analyzed: events.length
    };
  }

  // Calculate average satisfaction
  const satisfactionScores = interactions
    .filter(e => e.outcome?.satisfaction_score !== undefined)
    .map(e => e.outcome!.satisfaction_score!);

  const avgSatisfaction = satisfactionScores.length > 0
    ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
    : 0;

  // Find preferred contexts (contexts with above-average satisfaction)
  const contextSatisfaction = new Map<string, { total: number; count: number }>();

  for (const event of interactions) {
    if (event.context?.location && event.outcome?.satisfaction_score) {
      const loc = event.context.location;
      const current = contextSatisfaction.get(loc) || { total: 0, count: 0 };
      contextSatisfaction.set(loc, {
        total: current.total + event.outcome.satisfaction_score,
        count: current.count + 1
      });
    }
  }

  const preferredContexts: string[] = [];
  for (const [context, data] of contextSatisfaction) {
    const avg = data.total / data.count;
    if (avg > avgSatisfaction && data.count >= 2) {
      preferredContexts.push(context);
    }
  }

  // Find preferred robots
  const robotSatisfaction = new Map<string, { total: number; count: number }>();

  for (const event of interactions) {
    if (event.robot_id && event.outcome?.satisfaction_score) {
      const current = robotSatisfaction.get(event.robot_id) || { total: 0, count: 0 };
      robotSatisfaction.set(event.robot_id, {
        total: current.total + event.outcome.satisfaction_score,
        count: current.count + 1
      });
    }
  }

  const preferredRobots: string[] = [];
  for (const [robotId, data] of robotSatisfaction) {
    const avg = data.total / data.count;
    if (avg > avgSatisfaction && data.count >= 2) {
      preferredRobots.push(robotId);
    }
  }

  // Find preferred duration range
  const durations = interactions
    .filter(e => e.context?.duration_seconds)
    .map(e => e.context!.duration_seconds!);

  let preferredDurationRange: { min: number; max: number } | undefined;
  if (durations.length >= 3) {
    // Find durations with high satisfaction
    const durationWithSatisfaction = interactions
      .filter(e => e.context?.duration_seconds && e.outcome?.satisfaction_score)
      .map(e => ({
        duration: e.context!.duration_seconds!,
        satisfaction: e.outcome!.satisfaction_score!
      }));

    const highSatisfactionDurations = durationWithSatisfaction
      .filter(d => d.satisfaction > avgSatisfaction)
      .map(d => d.duration);

    if (highSatisfactionDurations.length >= 2) {
      preferredDurationRange = {
        min: Math.min(...highSatisfactionDurations),
        max: Math.max(...highSatisfactionDurations)
      };
    }
  }

  return {
    detected: preferredContexts.length > 0 || preferredRobots.length > 0,
    preferred_duration_range: preferredDurationRange,
    preferred_contexts: preferredContexts,
    preferred_robots: preferredRobots,
    average_satisfaction: avgSatisfaction,
    events_analyzed: events.length
  };
}

// ============================================================================
// PATTERN DETECTOR CLASS
// ============================================================================

/**
 * Main pattern detector class
 *
 * Runs all pattern detection algorithms and aggregates results.
 */
export class PatternDetector {
  private config: Required<PatternDetectorConfig>;

  constructor(config?: PatternDetectorConfig) {
    this.config = {
      min_events: config?.min_events ?? 3,
      confidence_threshold: config?.confidence_threshold ?? 0.6,
      time_window_days: config?.time_window_days ?? 30
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<PatternDetectorConfig> {
    return { ...this.config };
  }

  /**
   * Run all pattern detection algorithms
   *
   * @param events - Events to analyze
   * @returns All pattern detection results
   */
  detectAllPatterns(events: BehavioralEvent[]): AllPatternResults {
    // Filter to time window if specified
    const filteredEvents = this.filterByTimeWindow(events);

    const timePatterns = detectTimePatterns(filteredEvents);
    const preferencePatterns = detectPreferencePatterns(filteredEvents);
    const interactionPatterns = detectInteractionPatterns(filteredEvents);

    // Apply min_events threshold
    if (filteredEvents.length < this.config.min_events) {
      return {
        time_patterns: { ...timePatterns, detected: false, confidence: 0 },
        preference_patterns: { ...preferencePatterns, detected: false },
        interaction_patterns: { ...interactionPatterns, detected: false }
      };
    }

    // Apply confidence threshold
    if (timePatterns.confidence < this.config.confidence_threshold) {
      timePatterns.detected = false;
    }

    return {
      time_patterns: timePatterns,
      preference_patterns: preferencePatterns,
      interaction_patterns: interactionPatterns
    };
  }

  /**
   * Filter events to time window
   */
  private filterByTimeWindow(events: BehavioralEvent[]): BehavioralEvent[] {
    if (this.config.time_window_days <= 0) {
      return events;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.time_window_days);

    return events.filter(e => new Date(e.timestamp) >= cutoff);
  }

  /**
   * Create PatternMatch objects from detection results
   *
   * @param results - Detection results
   * @returns Array of PatternMatch objects
   */
  createPatternMatches(results: AllPatternResults): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const now = new Date().toISOString();

    // Create time pattern match
    if (results.time_patterns.detected) {
      patterns.push({
        pattern_id: `pat-time-${Date.now()}`,
        pattern_type: 'time_preference',
        detected_at: now,
        confidence: results.time_patterns.confidence,
        pattern_data: {
          preferred_time: results.time_patterns.preferred_time,
          distribution: results.time_patterns.distribution
        },
        source_events: [] // Would be populated with actual event IDs
      });
    }

    // Create interaction pattern match
    if (results.interaction_patterns.detected) {
      patterns.push({
        pattern_id: `pat-interaction-${Date.now()}`,
        pattern_type: 'interaction_style',
        detected_at: now,
        confidence: results.interaction_patterns.average_satisfaction,
        pattern_data: {
          preferred_contexts: results.interaction_patterns.preferred_contexts,
          preferred_robots: results.interaction_patterns.preferred_robots,
          preferred_duration_range: results.interaction_patterns.preferred_duration_range
        },
        source_events: []
      });
    }

    // Create preference drift pattern matches
    for (const drift of results.preference_patterns.drifts) {
      patterns.push({
        pattern_id: `pat-drift-${drift.field}-${Date.now()}`,
        pattern_type: 'preference_drift',
        detected_at: now,
        confidence: drift.confidence,
        pattern_data: {
          field: drift.field,
          direction: drift.direction,
          rate: drift.rate
        },
        source_events: []
      });
    }

    return patterns;
  }
}
