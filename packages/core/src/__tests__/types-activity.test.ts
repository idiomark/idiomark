import { describe, it, expect } from 'vitest'
import {
  RawActivityEventSchema,
  IdiomarkGActivityEventSchema,
  AggregatedMetricsSchema,
  ActivityStreamSectionSchema,
  createEmptyActivitySummary,
  createEmptyGamingMetrics,
  createEmptyAggregatedMetrics,
  createEmptyActivityStreamSection,
  type RawActivityEvent,
  type IdiomarkGActivityEvent
} from '../types-activity'

describe('RawActivityEventSchema', () => {
  it('validates a valid event', () => {
    const event: RawActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a', // UUID v7 format
      timestamp: Date.now() * 1000, // microseconds
      verb: 'logged_in',
      object: 'dashboard'
    }

    const result = RawActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('rejects event without required fields', () => {
    const event = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a'
    }

    const result = RawActivityEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('accepts custom verb strings', () => {
    const event: RawActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
      timestamp: Date.now() * 1000,
      verb: 'custom_action_xyz',
      object: 'resource'
    }

    const result = RawActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('accepts optional context', () => {
    const event: RawActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
      timestamp: Date.now() * 1000,
      verb: 'game_played',
      object: 'cs2',
      context: {
        match_result: 'win',
        playtime_minutes: 45
      },
      ttl: 86400 // 24 hours
    }

    const result = RawActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })
})

describe('IdiomarkGActivityEventSchema', () => {
  it('validates gaming event with context', () => {
    const event: IdiomarkGActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
      timestamp: Date.now() * 1000,
      verb: 'match_completed',
      object: 'valorant',
      context: {
        game_id: 'valorant',
        match_result: 'win',
        platform: 'pc'
      }
    }

    const result = IdiomarkGActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates achievement event', () => {
    const event: IdiomarkGActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
      timestamp: Date.now() * 1000,
      verb: 'achievement_unlocked',
      object: 'headshot_master',
      context: {
        game_id: 'cs2',
        achievement: {
          id: 'ach_001',
          name: 'Headshot Master',
          rarity: 0.05 // 5% of players have this
        }
      }
    }

    const result = IdiomarkGActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates rank change event', () => {
    const event: IdiomarkGActivityEvent = {
      id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
      timestamp: Date.now() * 1000,
      verb: 'rank_changed',
      object: 'competitive',
      context: {
        game_id: 'ow2',
        rank_change: {
          from: 'Gold',
          to: 'Platinum'
        }
      }
    }

    const result = IdiomarkGActivityEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })
})

describe('AggregatedMetricsSchema', () => {
  it('validates complete metrics', () => {
    const metrics = {
      window: 'daily' as const,
      time_range: {
        from: '2026-02-18T00:00:00Z',
        to: '2026-02-18T23:59:59Z'
      },
      activity_summary: {
        total_events: 42,
        unique_verbs: ['game_played', 'match_completed'],
        peak_activity_hour: 20,
        most_frequent_verb: 'game_played',
        most_frequent_object: 'cs2'
      },
      gaming_metrics: {
        sessions_played: 5,
        games_played: ['cs2', 'valorant'],
        genres_played: ['fps'],
        competition_trend: 0.15,
        cooperation_trend: 0.05,
        social_interactions: 12,
        achievements_unlocked: 2
      },
      computed_at: '2026-02-18T23:59:59Z',
      computation_version: '1.0.0'
    }

    const result = AggregatedMetricsSchema.safeParse(metrics)
    expect(result.success).toBe(true)
  })

  it('validates minimal metrics', () => {
    const metrics = {
      window: 'weekly' as const,
      time_range: {
        from: '2026-02-12T00:00:00Z',
        to: '2026-02-18T23:59:59Z'
      },
      activity_summary: {
        total_events: 0,
        unique_verbs: [],
        peak_activity_hour: 12,
        most_frequent_verb: '',
        most_frequent_object: ''
      },
      computed_at: '2026-02-18T23:59:59Z',
      computation_version: '1.0.0'
    }

    const result = AggregatedMetricsSchema.safeParse(metrics)
    expect(result.success).toBe(true)
  })
})

describe('ActivityStreamSectionSchema', () => {
  it('validates section with raw events only', () => {
    const section = {
      storage_mode: 'raw_events' as const,
      raw_events: {
        events: [
          {
            id: '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a',
            timestamp: 1739847600000000,
            verb: 'game_played',
            object: 'cs2'
          }
        ],
        count: 1,
        oldest_timestamp: 1739847600000000,
        newest_timestamp: 1739847600000000
      },
      time_range: {
        from: '2026-02-18T00:00:00Z',
        to: '2026-02-18T23:59:59Z'
      },
      generated_at: '2026-02-18T12:00:00Z',
      schema_version: '1.0.0'
    }

    const result = ActivityStreamSectionSchema.safeParse(section)
    expect(result.success).toBe(true)
  })

  it('validates section with both modes', () => {
    const section = {
      storage_mode: 'both' as const,
      raw_events: {
        events: [],
        count: 0,
        oldest_timestamp: 1739847600000000,
        newest_timestamp: 1739847600000000
      },
      metrics: {
        aggregations: [createEmptyAggregatedMetrics('daily')],
        last_computed: '2026-02-18T12:00:00Z',
        computation_interval: 'daily' as const
      },
      time_range: {
        from: '2026-02-18T00:00:00Z',
        to: '2026-02-18T23:59:59Z'
      },
      generated_at: '2026-02-18T12:00:00Z',
      schema_version: '1.0.0'
    }

    const result = ActivityStreamSectionSchema.safeParse(section)
    expect(result.success).toBe(true)
  })
})

describe('Helper functions', () => {
  it('creates valid empty activity summary', () => {
    const summary = createEmptyActivitySummary()
    expect(summary.total_events).toBe(0)
    expect(summary.unique_verbs).toEqual([])
  })

  it('creates valid empty gaming metrics', () => {
    const metrics = createEmptyGamingMetrics()
    expect(metrics.sessions_played).toBe(0)
    expect(metrics.games_played).toEqual([])
    expect(metrics.competition_trend).toBe(0)
  })

  it('creates valid empty aggregated metrics', () => {
    const metrics = createEmptyAggregatedMetrics('daily')
    expect(metrics.window).toBe('daily')
    expect(metrics.computation_version).toBe('1.0.0')
  })

  it('creates valid empty activity stream section', () => {
    const section = createEmptyActivityStreamSection('raw_events')
    expect(section.storage_mode).toBe('raw_events')
    expect(section.schema_version).toBe('1.0.0')
  })
})
