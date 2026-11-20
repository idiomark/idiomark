/**
 * Behavioral Intelligence Types (Section 17)
 *
 * Types for capturing, analyzing, and learning from user interactions
 * with robots and other machine consumers.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// BEHAVIORAL EVENT TYPES
// ============================================================================

/**
 * Types of behavioral events that can be captured
 */
export type BehavioralEventType =
  | 'robot_interaction'      // User interacted with a robot
  | 'preference_change'      // User changed a preference
  | 'feedback_submitted'     // User provided explicit feedback
  | 'match_accepted'         // User accepted a robot match
  | 'match_rejected'         // User rejected a robot match
  | 'token_generated'        // Consent token was generated
  | 'token_expired'          // Consent token expired
  | 'pattern_detected'       // A pattern was detected in behavior
  | 'preference_adjusted';   // Preference was auto-adjusted

/**
 * Context information for an interaction
 */
export interface InteractionContext {
  /** Where the interaction occurred */
  location?: string;

  /** Time of day category */
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';

  /** Day of week */
  day_of_week?: string;

  /** How long the interaction lasted */
  duration_seconds?: number;

  /** Measured quality of interaction (0.0-1.0) */
  interaction_quality?: number;

  /** Devices present during interaction */
  devices_present?: string[];

  /** Environmental factors */
  environmental_factors?: {
    noise_level?: 'quiet' | 'moderate' | 'loud';
    crowd_level?: 'low' | 'moderate' | 'high';
    temperature?: string;
    [key: string]: unknown;
  };

  /** Additional context */
  [key: string]: unknown;
}

/**
 * Outcome of a behavioral event
 */
export interface BehavioralOutcome {
  /** Whether the interaction was successful */
  success?: boolean;

  /** User satisfaction score (0.0-1.0) */
  satisfaction_score?: number;

  /** Whether a preference shifted during this event */
  preference_shift?: {
    field: string;
    previous_value: unknown;
    new_value: unknown;
    confidence?: number;
  };

  /** Whether user would repeat/recommend */
  would_repeat?: boolean;

  /** Any errors that occurred */
  errors?: string[];
}

/**
 * A single behavioral event in the stream
 */
export interface BehavioralEvent {
  /** Unique identifier for this event */
  event_id: string;

  /** When the event occurred (ISO 8601) */
  timestamp: string;

  /** Type of behavioral event */
  event_type: BehavioralEventType;

  /** The human whose behavior this captures */
  human_idiomark_id: string;

  /** The robot involved (if applicable) */
  robot_id?: string;

  /** Context of the interaction */
  context?: InteractionContext;

  /** Outcome of the event */
  outcome?: BehavioralOutcome;

  /** Related event IDs (for event chains) */
  related_events?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of validating a behavioral event
 */
export interface BehavioralEventValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

/**
 * Validates a behavioral event
 *
 * @param event - Event to validate
 * @returns Validation result with errors if invalid
 */
export function validateBehavioralEvent(
  event: Partial<BehavioralEvent>
): BehavioralEventValidationResult {
  const errors: Record<string, string> = {};

  // Validate event_id
  if (!event.event_id || event.event_id.trim() === '') {
    errors.event_id = 'event_id is required';
  }

  // Validate timestamp
  if (!event.timestamp) {
    errors.timestamp = 'timestamp is required';
  } else if (isNaN(Date.parse(event.timestamp))) {
    errors.timestamp = 'timestamp must be a valid ISO 8601 date string';
  }

  // Validate human_idiomark_id
  if (!event.human_idiomark_id || event.human_idiomark_id.trim() === '') {
    errors.human_idiomark_id = 'human_idiomark_id is required';
  }

  // Validate event_type
  const validEventTypes: BehavioralEventType[] = [
    'robot_interaction',
    'preference_change',
    'feedback_submitted',
    'match_accepted',
    'match_rejected',
    'token_generated',
    'token_expired',
    'pattern_detected',
    'preference_adjusted'
  ];

  if (event.event_type && !validEventTypes.includes(event.event_type)) {
    errors.event_type = `Invalid event_type: ${event.event_type}`;
  }

  // Validate satisfaction_score range if present
  if (event.outcome?.satisfaction_score !== undefined) {
    const score = event.outcome.satisfaction_score;
    if (score < 0 || score > 1) {
      errors['outcome.satisfaction_score'] = 'satisfaction_score must be between 0 and 1';
    }
  }

  // Validate interaction_quality range if present
  if (event.context?.interaction_quality !== undefined) {
    const quality = event.context.interaction_quality;
    if (quality < 0 || quality > 1) {
      errors['context.interaction_quality'] = 'interaction_quality must be between 0 and 1';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// ============================================================================
// BEHAVIORAL STREAM
// ============================================================================

/**
 * Metadata about a behavioral stream
 */
export interface StreamMetadata {
  /** Number of events in stream */
  event_count: number;

  /** When the first event was recorded */
  first_event_at?: string;

  /** When the most recent event was recorded */
  last_event_at?: string;

  /** Time span covered by the stream (in seconds) */
  time_span_seconds?: number;

  /** Number of unique robots interacted with */
  unique_robots?: number;

  /** Most common event type */
  dominant_event_type?: BehavioralEventType;

  /** When the stream was created */
  created_at: string;

  /** When the stream was last updated */
  updated_at: string;
}

/**
 * A stream of behavioral events for a human
 */
export interface BehavioralStream {
  /** Unique identifier for this stream */
  stream_id: string;

  /** The human this stream belongs to */
  human_idiomark_id: string;

  /** Events in the stream (ordered by timestamp) */
  events: BehavioralEvent[];

  /** Metadata about the stream */
  metadata: StreamMetadata;
}

/**
 * Creates a new behavioral stream
 *
 * @param humanIdiomarkId - The human Idiomark ID for this stream
 * @returns A new empty behavioral stream
 */
export function createBehavioralStream(humanIdiomarkId: string): BehavioralStream {
  const now = new Date().toISOString();

  return {
    stream_id: uuidv4(),
    human_idiomark_id: humanIdiomarkId,
    events: [],
    metadata: {
      event_count: 0,
      created_at: now,
      updated_at: now
    }
  };
}

/**
 * Adds an event to a behavioral stream
 *
 * @param stream - Stream to add event to
 * @param event - Event to add
 * @returns Updated stream with new event
 */
export function addEventToStream(
  stream: BehavioralStream,
  event: BehavioralEvent
): BehavioralStream {
  const now = new Date().toISOString();
  const events = [...stream.events, event];

  // Sort by timestamp
  events.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate unique robots
  const uniqueRobots = new Set(
    events.filter(e => e.robot_id).map(e => e.robot_id!)
  );

  // Find dominant event type
  const eventTypeCounts = new Map<BehavioralEventType, number>();
  for (const e of events) {
    eventTypeCounts.set(e.event_type, (eventTypeCounts.get(e.event_type) || 0) + 1);
  }
  const dominantType = Array.from(eventTypeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  // Calculate time span
  let timeSpanSeconds: number | undefined;
  if (events.length >= 2) {
    const first = new Date(events[0].timestamp).getTime();
    const last = new Date(events[events.length - 1].timestamp).getTime();
    timeSpanSeconds = (last - first) / 1000;
  }

  return {
    ...stream,
    events,
    metadata: {
      event_count: events.length,
      first_event_at: events[0]?.timestamp,
      last_event_at: events[events.length - 1]?.timestamp,
      time_span_seconds: timeSpanSeconds,
      unique_robots: uniqueRobots.size,
      dominant_event_type: dominantType,
      created_at: stream.metadata.created_at,
      updated_at: now
    }
  };
}

// ============================================================================
// PATTERN MATCH
// ============================================================================

/**
 * Types of patterns that can be detected
 */
export type PatternType =
  | 'time_preference'        // User prefers certain times
  | 'interaction_style'     // User has consistent interaction style
  | 'preference_drift'      // Preferences are shifting over time
  | 'satisfaction_pattern'  // Satisfaction correlates with factors
  | 'robot_affinity'        // User prefers certain robot types
  | 'context_pattern'       // Behavior varies by context
  | 'feedback_pattern';     // Feedback patterns

/**
 * A detected pattern in behavioral data
 */
export interface PatternMatch {
  /** Unique identifier for this pattern */
  pattern_id: string;

  /** Type of pattern detected */
  pattern_type: PatternType;

  /** When the pattern was detected */
  detected_at: string;

  /** Confidence level (0.0-1.0) */
  confidence: number;

  /** The actual pattern data */
  pattern_data: Record<string, unknown>;

  /** Event IDs that contributed to this pattern */
  source_events: string[];

  /** How long this pattern has been observed */
  observation_period?: {
    from: string;
    to: string;
    event_count: number;
  };

  /** Whether this pattern has been confirmed by user */
  user_confirmed?: boolean;

  /** When this pattern expires (stale patterns) */
  expires_at?: string;
}

// ============================================================================
// BEHAVIORAL FEEDBACK
// ============================================================================

/**
 * Types of feedback
 */
export type FeedbackType = 'explicit' | 'implicit';

/**
 * Aspects that can be rated in feedback
 */
export interface FeedbackAspects {
  communication?: 'poor' | 'fair' | 'good' | 'excellent';
  helpfulness?: 'poor' | 'fair' | 'good' | 'excellent';
  personalization?: 'poor' | 'fair' | 'good' | 'excellent';
  speed?: 'poor' | 'fair' | 'good' | 'excellent';
  accuracy?: 'poor' | 'fair' | 'good' | 'excellent';
}

/**
 * Behavioral signals for implicit feedback
 */
export interface BehavioralSignals {
  /** How long the session lasted */
  session_duration_seconds?: number;

  /** Whether the user returned within 24 hours */
  returned_within_24h?: boolean;

  /** Number of interactions in session */
  interaction_count?: number;

  /** Whether user completed the task */
  task_completed?: boolean;

  /** Whether user abandoned the interaction */
  abandoned?: boolean;

  /** Time to first engagement */
  time_to_engagement_seconds?: number;
}

/**
 * User feedback on robot interaction
 */
export interface BehavioralFeedback {
  /** Unique identifier for this feedback */
  feedback_id: string;

  /** When the feedback was given */
  timestamp: string;

  /** The human who gave feedback */
  human_idiomark_id: string;

  /** The robot being rated (if applicable) */
  robot_id?: string;

  /** The interaction being rated (if applicable) */
  interaction_id?: string;

  /** Type of feedback */
  feedback_type?: FeedbackType;

  /** Overall rating (1-5 scale) */
  rating?: number;

  /** Detailed aspect ratings */
  aspects?: FeedbackAspects;

  /** Whether user would recommend */
  would_recommend?: boolean;

  /** Free-form comments */
  comments?: string;

  /** Implicit behavioral signals */
  behavioral_signals?: BehavioralSignals;

  /** What preference should change based on this feedback */
  suggested_preference_change?: {
    field: string;
    current_value: unknown;
    suggested_value: unknown;
    confidence: number;
  };
}

// ============================================================================
// BEHAVIORAL SUMMARY
// ============================================================================

/**
 * Aggregated summary of behavioral data
 */
export interface BehavioralSummary {
  /** Human this summary is for */
  human_idiomark_id: string;

  /** Time range covered */
  time_range: {
    from: string;
    to: string;
  };

  /** Total events analyzed */
  total_events: number;

  /** Robot interaction statistics */
  robot_interactions: {
    total: number;
    unique_robots: number;
    average_satisfaction: number;
    most_interacted_robot?: string;
  };

  /** Detected patterns summary */
  patterns: {
    total_detected: number;
    high_confidence_count: number;
    user_confirmed_count: number;
    pattern_types: PatternType[];
  };

  /** Feedback statistics */
  feedback: {
    explicit_count: number;
    implicit_count: number;
    average_rating?: number;
    would_recommend_rate: number;
  };

  /** Preference stability (how much preferences have changed) */
  preference_stability: {
    score: number;  // 0.0 = very stable, 1.0 = very volatile
    changes_count: number;
    last_significant_change?: string;
  };
}
