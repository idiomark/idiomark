/**
 * Idiomark Activity Stream Types
 *
 * Event-based activity tracking for "living profiles"
 * Target: Binary Format Section 11
 *
 * @module types-activity
 */

import { z } from 'zod'
import type { GameGenre } from './types-idiomarkg'

// ============================================================================
// ACTIVITY VERB ENUMS
// ============================================================================

/**
 * Standard activity verbs (extensible via string)
 */
export const ActivityVerbSchema = z.union([
  // Authentication
  z.literal('logged_in'),
  z.literal('logged_out'),

  // Profile management
  z.literal('profile_created'),
  z.literal('profile_updated'),
  z.literal('profile_exported'),

  // Extraction
  z.literal('extraction_started'),
  z.literal('extraction_completed'),
  z.literal('extraction_failed'),

  // Gaming (IdiomarkG)
  z.literal('game_played'),
  z.literal('match_completed'),
  z.literal('achievement_unlocked'),
  z.literal('rank_changed'),
  z.literal('friend_added'),

  // Commerce
  z.literal('purchase_made'),
  z.literal('wishlist_updated'),

  // Custom (application-specific)
  z.string()
])

export type ActivityVerb = z.infer<typeof ActivityVerbSchema>

/**
 * Gaming-specific activity verbs
 */
export const GamingVerbSchema = z.enum([
  'game_played',
  'match_completed',
  'achievement_unlocked',
  'rank_changed',
  'friend_added',
  'guild_joined',
  'guild_left',
  'quest_completed',
  'item_acquired',
  'level_up'
])

export type GamingVerb = z.infer<typeof GamingVerbSchema>

// ============================================================================
// RAW ACTIVITY EVENT
// ============================================================================

/**
 * Raw activity event - immutable event record
 *
 * Uses UUID v7 for time-ordering (sortable by timestamp)
 * Timestamp in microseconds since epoch for high-resolution ordering
 */
export const RawActivityEventSchema = z.object({
  // Core fields (required)
  id: z.string().uuid().describe('UUID v7 for time-ordering'),
  timestamp: z.number().int().positive().describe('Microseconds since epoch'),
  verb: ActivityVerbSchema.describe('Past-tense action'),
  object: z.string().min(1).describe('What was acted on'),

  // Optional context
  actor: z.string().optional().describe('Who caused it (if not self)'),
  context: z.record(z.string(), z.unknown()).optional().describe('Additional context (keep small)'),
  ttl: z.number().int().positive().optional().describe('Time-to-live in seconds'),

  // Integrity
  checksum: z.string().optional().describe('Optional event checksum')
})

export interface RawActivityEvent extends z.infer<typeof RawActivityEventSchema> {}

// ============================================================================
// GAMING CONTEXT
// ============================================================================

/**
 * Gaming-specific context for IdiomarkG events
 */
export const GamingContextSchema = z.object({
  game_id: z.string().optional(),
  game_name: z.string().optional(),
  match_result: z.enum(['win', 'loss', 'draw']).optional(),
  rank_change: z.object({
    from: z.string().optional(),
    to: z.string()
  }).optional(),
  achievement: z.object({
    id: z.string(),
    name: z.string().optional(),
    rarity: z.number().min(0).max(1).optional()
  }).optional(),
  playtime_minutes: z.number().nonnegative().optional(),
  genre: z.string().optional(),
  platform: z.string().optional(),
  score: z.number().optional(),
  position: z.number().int().nonnegative().optional()
})

export interface GamingContext extends z.infer<typeof GamingContextSchema> {}

/**
 * IdiomarkG-specific activity event with gaming context
 */
export const IdiomarkGActivityEventSchema = RawActivityEventSchema.extend({
  verb: GamingVerbSchema,
  context: GamingContextSchema.optional()
})

export interface IdiomarkGActivityEvent extends RawActivityEvent {
  verb: GamingVerb
  context?: GamingContext
}

// ============================================================================
// AGGREGATED METRICS
// ============================================================================

/**
 * Time window for aggregation
 */
export const AggregationWindowSchema = z.enum(['hourly', 'daily', 'weekly', 'monthly'])
export type AggregationWindow = z.infer<typeof AggregationWindowSchema>

/**
 * General activity summary
 */
export const ActivitySummarySchema = z.object({
  total_events: z.number().int().nonnegative(),
  unique_verbs: z.array(z.string()),
  peak_activity_hour: z.number().int().min(0).max(23),
  most_frequent_verb: z.string(),
  most_frequent_object: z.string(),
  events_per_day: z.number().nonnegative().optional()
})

export interface ActivitySummary extends z.infer<typeof ActivitySummarySchema> {}

/**
 * Rank change record
 */
export const RankChangeSchema = z.object({
  game: z.string(),
  old_rank: z.string().optional(),
  new_rank: z.string(),
  timestamp: z.string().optional()
})

export interface RankChange extends z.infer<typeof RankChangeSchema> {}

/**
 * Gaming-specific aggregated metrics
 */
export const GamingMetricsSchema = z.object({
  sessions_played: z.number().int().nonnegative(),
  games_played: z.array(z.string()),
  genres_played: z.array(z.string()),
  competition_trend: z.number().min(-1).max(1).describe('-1 = less competitive, +1 = more competitive'),
  cooperation_trend: z.number().min(-1).max(1),
  social_interactions: z.number().int().nonnegative(),
  achievements_unlocked: z.number().int().nonnegative(),
  total_playtime_minutes: z.number().nonnegative().optional(),
  rank_changes: z.array(RankChangeSchema).optional(),
  win_rate: z.number().min(0).max(1).optional()
})

export interface GamingMetrics extends z.infer<typeof GamingMetricsSchema> {}

/**
 * Domain confidence delta
 */
export const DomainDeltaSchema = z.object({
  domain: z.string(),
  confidence_delta: z.number().min(-1).max(1),
  evidence: z.array(z.string())
})

export interface DomainDelta extends z.infer<typeof DomainDeltaSchema> {}

/**
 * Personality deltas from activity
 */
export const PersonalityDeltasSchema = z.object({
  competition_delta: z.number().min(-1).max(1).optional(),
  cooperation_delta: z.number().min(-1).max(1).optional(),
  exploration_delta: z.number().min(-1).max(1).optional(),
  domain_changes: z.array(DomainDeltaSchema).optional()
})

export interface PersonalityDeltas extends z.infer<typeof PersonalityDeltasSchema> {}

/**
 * Aggregated metrics for a time window
 */
export const AggregatedMetricsSchema = z.object({
  // Time window
  window: AggregationWindowSchema,

  // Time range covered
  time_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }),

  // General summary
  activity_summary: ActivitySummarySchema,

  // Gaming-specific (optional)
  gaming_metrics: GamingMetricsSchema.optional(),

  // Personality changes (optional)
  personality_deltas: PersonalityDeltasSchema.optional(),

  // Metadata
  computed_at: z.string().datetime(),
  computation_version: z.literal('1.0.0')
})

export interface AggregatedMetrics extends z.infer<typeof AggregatedMetricsSchema> {}

// ============================================================================
// ACTIVITY STREAM SECTION
// ============================================================================

/**
 * Raw events container
 */
export const RawEventsContainerSchema = z.object({
  events: z.array(RawActivityEventSchema),
  count: z.number().int().nonnegative(),
  oldest_timestamp: z.number().int().positive(),
  newest_timestamp: z.number().int().positive()
})

export interface RawEventsContainer extends z.infer<typeof RawEventsContainerSchema> {}

/**
 * Aggregated metrics container
 */
export const MetricsContainerSchema = z.object({
  aggregations: z.array(AggregatedMetricsSchema),
  last_computed: z.string().datetime(),
  computation_interval: AggregationWindowSchema
})

export interface MetricsContainer extends z.infer<typeof MetricsContainerSchema> {}

/**
 * Storage mode for activity stream
 */
export const StorageModeSchema = z.enum(['raw_events', 'aggregated_metrics', 'both'])
export type StorageMode = z.infer<typeof StorageModeSchema>

/**
 * Complete Activity Stream Section for Binary Format
 */
export const ActivityStreamSectionSchema = z.object({
  // Storage mode
  storage_mode: StorageModeSchema,

  // Raw events (if included)
  raw_events: RawEventsContainerSchema.optional(),

  // Aggregated metrics (if included)
  metrics: MetricsContainerSchema.optional(),

  // Global time range
  time_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }),

  // Section metadata
  generated_at: z.string().datetime(),
  schema_version: z.literal('1.0.0')
})

export interface ActivityStreamSection extends z.infer<typeof ActivityStreamSectionSchema> {}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an empty activity summary
 */
export function createEmptyActivitySummary(): ActivitySummary {
  return {
    total_events: 0,
    unique_verbs: [],
    peak_activity_hour: 12, // noon default
    most_frequent_verb: '',
    most_frequent_object: ''
  }
}

/**
 * Create empty gaming metrics
 */
export function createEmptyGamingMetrics(): GamingMetrics {
  return {
    sessions_played: 0,
    games_played: [],
    genres_played: [],
    competition_trend: 0,
    cooperation_trend: 0,
    social_interactions: 0,
    achievements_unlocked: 0
  }
}

/**
 * Create empty aggregated metrics
 */
export function createEmptyAggregatedMetrics(window: AggregationWindow): AggregatedMetrics {
  const now = new Date().toISOString()
  return {
    window,
    time_range: {
      from: now,
      to: now
    },
    activity_summary: createEmptyActivitySummary(),
    computed_at: now,
    computation_version: '1.0.0'
  }
}

/**
 * Create empty activity stream section
 */
export function createEmptyActivityStreamSection(
  mode: StorageMode = 'raw_events'
): ActivityStreamSection {
  const now = new Date().toISOString()
  return {
    storage_mode: mode,
    time_range: {
      from: now,
      to: now
    },
    generated_at: now,
    schema_version: '1.0.0'
  }
}
