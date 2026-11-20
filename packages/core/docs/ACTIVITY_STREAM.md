# Idiomark Activity Stream Documentation

**Status:** Experimental
**Since:** v2.0.0
**Binary Section:** 11
**Target Release:** V3.0.0 (Binary Format)

---

## Table of Contents

1. [Developer Guide](#developer-guide)
2. [Schema Reference](#schema-reference)
3. [Design Rationale](#design-rationale)
4. [Integration Guide](#integration-guide)

---

# Developer Guide

## Overview

The Activity Stream enables "living profiles" - personalities that evolve in real-time based on user activity. Instead of static snapshots that are periodically extracted, profiles can now update incrementally as events occur.

## Installation

```typescript
import {
  // Types
  RawActivityEvent,
  IdiomarkGActivityEvent,
  AggregatedMetrics,
  ActivityStreamSection,

  // Factory functions
  createActivityEvent,
  createGamingEvent,
  gamePlayed,
  matchCompleted,
  achievementUnlocked,
  rankChanged,
  friendAdded,

  // Processor
  IdiomarkGActivityProcessor,

  // Utilities
  getMicroseconds,
  dateToMicroseconds,
  microsecondsToDate,
  generateUUIDv7
} from '@idiomark/core'
```

## Quick Start

### Creating Events

```typescript
import { gamePlayed, matchCompleted, achievementUnlocked } from '@idiomark/core'

// Simple game played event
const event = gamePlayed('cs2', 'Counter-Strike 2', {
  genre: 'fps',
  playtimeMinutes: 60,
  platform: 'pc'
})

// Match result
const match = matchCompleted('valorant', 'win', {
  score: 13,
  position: 1
})

// Achievement
const achievement = achievementUnlocked('ow2', 'headshot_master', {
  achievementName: 'Headshot Master',
  rarity: 0.05  // 5% of players have this
})
```

### Processing Events

```typescript
import { IdiomarkGActivityProcessor } from '@idiomark/core'

// Create processor with default settings
const processor = new IdiomarkGActivityProcessor()

// Process single event
const updatedProfile = processor.processEvent(event, currentProfile)

// Process multiple events (automatically sorted by timestamp)
const events = [event1, event2, event3]
const finalProfile = processor.processEvents(events, currentProfile)
```

### Custom Configuration

```typescript
const processor = new IdiomarkGActivityProcessor({
  adaptationRate: 0.02,      // How fast personality changes (0-1)
  maxDeltaPerEvent: 0.03,    // Max change per event (0-1)
  enableDecay: true,         // Whether old traits decay
  decayFactor: 0.001         // Decay rate per event
})
```

### Creating Custom Events

```typescript
import { createActivityEvent } from '@idiomark/core'

const customEvent = createActivityEvent({
  verb: 'custom_action',
  object: 'resource_id',
  context: {
    customField: 'value',
    nested: { data: true }
  },
  ttl: 86400  // Optional: auto-expire in 24 hours
})
```

## Common Patterns

### Real-time Profile Updates

```typescript
// In your game/activity tracking system
class GameSessionTracker {
  private processor = new IdiomarkGActivityProcessor()
  private events: IdiomarkGActivityEvent[] = []

  onGameStart(gameId: string, gameName: string) {
    this.sessionStart = Date.now()
  }

  onGameEnd(gameId: string, result: 'win' | 'loss' | 'draw') {
    const event = matchCompleted(gameId, result, {
      playtimeMinutes: (Date.now() - this.sessionStart) / 60000
    })
    this.events.push(event)

    // Update profile immediately
    this.profile = this.processor.processEvent(event, this.profile)
  }

  getUpdatedProfile(): IdiomarkGGaming {
    return this.processor.processEvents(this.events, this.initialProfile)
  }
}
```

### Activity Aggregation

```typescript
import { createEmptyAggregatedMetrics } from '@idiomark/core'

// Aggregate events into metrics
function aggregateEvents(
  events: RawActivityEvent[],
  window: 'hourly' | 'daily' | 'weekly'
): AggregatedMetrics {
  const metrics = createEmptyAggregatedMetrics(window)

  // Count events
  metrics.activity_summary.total_events = events.length

  // Extract unique verbs
  metrics.activity_summary.unique_verbs = [...new Set(events.map(e => e.verb))]

  // Find peak hour
  const hourCounts = new Map<number, number>()
  events.forEach(e => {
    const hour = new Date(e.timestamp / 1000).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
  })
  metrics.activity_summary.peak_activity_hour = [...hourCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12

  return metrics
}
```

---

# Schema Reference

## Core Types

### RawActivityEvent

The fundamental event type - an immutable record of something that happened.

```typescript
interface RawActivityEvent {
  // Required fields
  id: string                    // UUID v7 (time-sortable)
  timestamp: number             // Microseconds since epoch
  verb: string                  // Past-tense action
  object: string                // What was acted on

  // Optional fields
  actor?: string                // Who caused it (if not self)
  context?: Record<string, unknown>  // Additional context
  ttl?: number                  // Time-to-live in seconds
  checksum?: string             // Optional integrity checksum
}
```

**Field Details:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID v7 format for time-ordered sorting |
| `timestamp` | number | Yes | Microseconds since Unix epoch |
| `verb` | string | Yes | Action in past tense (e.g., "logged_in") |
| `object` | string | Yes | Identifier of what was acted upon |
| `actor` | string | No | Who performed the action (defaults to profile owner) |
| `context` | object | No | Additional structured data (keep small) |
| `ttl` | number | No | Seconds before event can be discarded |
| `checksum` | string | No | SHA-256 or similar for verification |

### Standard Verbs

Pre-defined verbs with semantic meaning:

**Authentication:**
- `logged_in` - User authenticated
- `logged_out` - User session ended

**Profile Management:**
- `profile_created` - New Idiomark profile created
- `profile_updated` - Profile modified
- `profile_exported` - Profile exported to another format

**Extraction:**
- `extraction_started` - Platform extraction began
- `extraction_completed` - Platform extraction finished
- `extraction_failed` - Platform extraction error

**Gaming (IdiomarkG):**
- `game_played` - User played a game
- `match_completed` - Match/round finished
- `achievement_unlocked` - Achievement earned
- `rank_changed` - Competitive rank changed
- `friend_added` - New friend connection
- `guild_joined` - Joined a guild/clan
- `quest_completed` - Quest/mission finished

**Commerce:**
- `purchase_made` - Purchase completed
- `wishlist_updated` - Wishlist modified

### GamingContext

Extended context for gaming events:

```typescript
interface GamingContext {
  game_id?: string
  game_name?: string
  match_result?: 'win' | 'loss' | 'draw'
  rank_change?: {
    from?: string
    to: string
  }
  achievement?: {
    id: string
    name?: string
    rarity?: number  // 0-1, where 0.01 = 1% of players
  }
  playtime_minutes?: number
  genre?: string
  platform?: string
  score?: number
  position?: number
}
```

### IdiomarkGActivityEvent

Gaming-specific event with typed context:

```typescript
interface IdiomarkGActivityEvent extends RawActivityEvent {
  verb: GamingVerb  // One of the gaming-specific verbs
  context?: GamingContext
}
```

### AggregatedMetrics

Computed statistics over a time window:

```typescript
interface AggregatedMetrics {
  window: 'hourly' | 'daily' | 'weekly' | 'monthly'

  time_range: {
    from: string  // ISO timestamp
    to: string    // ISO timestamp
  }

  activity_summary: {
    total_events: number
    unique_verbs: string[]
    peak_activity_hour: number     // 0-23
    most_frequent_verb: string
    most_frequent_object: string
    events_per_day?: number
  }

  gaming_metrics?: {
    sessions_played: number
    games_played: string[]
    genres_played: string[]
    competition_trend: number      // -1 to +1
    cooperation_trend: number      // -1 to +1
    social_interactions: number
    achievements_unlocked: number
    total_playtime_minutes?: number
    rank_changes?: RankChange[]
    win_rate?: number              // 0-1
  }

  personality_deltas?: {
    competition_delta?: number
    cooperation_delta?: number
    exploration_delta?: number
    domain_changes?: DomainDelta[]
  }

  computed_at: string
  computation_version: '1.0.0'
}
```

### ActivityStreamSection

Complete section for binary format:

```typescript
interface ActivityStreamSection {
  storage_mode: 'raw_events' | 'aggregated_metrics' | 'both'

  raw_events?: {
    events: RawActivityEvent[]
    count: number
    oldest_timestamp: number
    newest_timestamp: number
  }

  metrics?: {
    aggregations: AggregatedMetrics[]
    last_computed: string
    computation_interval: 'hourly' | 'daily' | 'weekly'
  }

  time_range: {
    from: string
    to: string
  }

  generated_at: string
  schema_version: '1.0.0'
}
```

## Zod Schemas

All types have corresponding Zod schemas for runtime validation:

```typescript
import {
  RawActivityEventSchema,
  IdiomarkGActivityEventSchema,
  AggregatedMetricsSchema,
  ActivityStreamSectionSchema
} from '@idiomark/core'

// Validate an event
const result = RawActivityEventSchema.safeParse(unknownData)
if (result.success) {
  // result.data is typed as RawActivityEvent
}
```

---

# Design Rationale

## Why Activity Streams?

### The Problem

Current Idiomark profiles are **extraction-based**:
1. Pull data from platform APIs periodically
2. Create a snapshot of the user's personality
3. Snapshot becomes stale until next extraction

This creates several issues:
- **Latency**: Profile doesn't reflect recent activity
- **Loss of nuance**: Only final state, no evolution history
- **No causation**: Can't see what caused personality changes
- **Limited personalization**: NPCs can't respond to recent behavior

### The Solution

Activity streams are **event-based**:
1. Log each meaningful action as an event
2. Process events incrementally to update profile
3. Maintain history for analysis and replay
4. Enable real-time personalization

## Game AI Patterns Applied

Research into immersive games revealed key patterns:

### Pattern 1: Event Sourcing

**From Red Dead Redemption 2:**
- NPCs remember player actions via event logs
- Events are immutable and append-only
- State is derived by replaying relevant events

**Applied to Idiomark:**
- `RawActivityEvent` is the immutable event record
- Profile state is derived from event stream
- Enables replay for debugging and analysis

### Pattern 2: Incremental Updates

**From Baldur's Gate 3:**
- Relationship scores change incrementally
- Each interaction has small but cumulative effect
- Prevents sudden dramatic shifts

**Applied to Idiomark:**
- `IdiomarkGActivityProcessor` applies small deltas
- `adaptationRate` controls how fast personality shifts
- `maxDeltaPerEvent` prevents gaming the system

### Pattern 3: Memory Decay

**From MMOs:**
- Recent events have more weight
- Old events gradually lose influence
- Prevents ancient history from dominating

**Applied to Idiomark:**
- Optional `enableDecay` configuration
- `decayFactor` controls rate of forgetting
- `ttl` field for events that should expire

### Pattern 4: Genre-Based Inference

**From The Sims:**
- Behavior in one context implies traits
- Playing competitive games → competitive personality
- System learns from observed behavior

**Applied to Idiomark:**
```
FPS/MOBA/Battle Royale → increases competition
MMO/Strategy → increases cooperation
RPG/Sandbox → increases exploration
```

## Architecture Decisions

### Why UUID v7?

UUID v7 is time-sortable, meaning:
- Events can be sorted by ID without reading timestamp
- Distributed systems can generate IDs without coordination
- Natural ordering in databases and logs

### Why Microsecond Timestamps?

- Milliseconds can have collisions in high-frequency events
- Microseconds provide enough precision for any user action
- Compatible with Date objects (divide by 1000)

### Why Separate Raw Events and Aggregated Metrics?

- **Raw events**: Immutable audit trail, full fidelity
- **Aggregated metrics**: Fast queries, computed insights
- **Both**: Flexibility for different use cases

### Why Zod Schemas?

- Runtime validation (not just compile-time)
- Automatic type inference
- Clear error messages for debugging
- JSON Schema export for other tools

---

# Integration Guide

## Integration with IdiomarkG

The activity stream extends IdiomarkG's extraction-based profiles:

```typescript
import { IdiomarkGActivityProcessor, gamePlayed, matchCompleted } from '@idiomark/core'

// Start with extracted IdiomarkG profile
let profile = await extractIdiomarkGProfile(platforms)

// Create processor
const processor = new IdiomarkGActivityProcessor()

// Apply real-time events
const events = [
  gamePlayed('cs2', 'Counter-Strike 2', { genre: 'fps' }),
  matchCompleted('cs2', 'win')
]

// Profile evolves based on activity
profile = processor.processEvents(events, profile)
```

### What Changes in IdiomarkG

| Field | Before (Extraction) | After (Activity Stream) |
|-------|---------------------|-------------------------|
| `play_style.competition` | Static from history | Evolves with each match |
| `play_style.cooperation` | Fixed snapshot | Updates from game choices |
| `achievements.notable` | Only from APIs | Real-time unlocks |
| `skill_profile.rankings` | Periodic sync | Immediate updates |

## Integration with @idiomark/sync

Activity events can be synchronized across devices:

```typescript
import { SyncClient } from '@idiomark/sync'
import { ActivityStreamSection, createEmptyActivityStreamSection } from '@idiomark/core'

// Create activity stream section
const activitySection: ActivityStreamSection = {
  storage_mode: 'raw_events',
  raw_events: {
    events: recentEvents,
    count: recentEvents.length,
    oldest_timestamp: Math.min(...recentEvents.map(e => e.timestamp)),
    newest_timestamp: Math.max(...recentEvents.map(e => e.timestamp))
  },
  time_range: {
    from: startDate.toISOString(),
    to: endDate.toISOString()
  },
  generated_at: new Date().toISOString(),
  schema_version: '1.0.0'
}

// Sync with conflict resolution
const syncClient = new SyncClient()
await syncClient.push('activity', activitySection)
```

### Conflict Resolution

Activity events use **append-only** semantics:
- Conflicts are rare (each event has unique ID)
- Resolution: merge both event streams
- Deduplicate by event ID

## Integration with Binary Format

Activity Stream uses **Section 11** in the binary format:

```typescript
// Binary format header already defines:
const SECTION_ACTIVITY_STREAM = 11
const HAS_ACTIVITY_STREAM = 0x00000020  // Section flag

// Section structure:
// - Section header (type, length, flags)
// - Storage mode (1 byte)
// - Raw events (if present)
//   - Event count (4 bytes)
//   - Events (variable length, compressed)
// - Metrics (if present)
//   - Aggregation count (4 bytes)
//   - Aggregations (variable length)
```

### Binary Encoding

Events are encoded as:
```
[1 byte: verb length][N bytes: verb]
[8 bytes: timestamp]
[16 bytes: UUID]
[2 bytes: object length][N bytes: object]
[1 byte: flags][optional context]
```

### Compression

Activity data compresses well due to:
- Repeated verb strings
- Sequential timestamps
- Similar object patterns

Recommended: zstd compression for activity sections

## Integration with External Systems

### Discord Bot Example

```typescript
import { createActivityEvent } from '@idiomark/core'

// Track Discord activity
discordClient.on('messageCreate', (message) => {
  const event = createActivityEvent({
    verb: 'message_sent',
    object: message.channelId,
    context: {
      guild_id: message.guildId,
      has_attachments: message.attachments.size > 0
    }
  })

  activityBuffer.push(event)
})
```

### Game SDK Example

```typescript
import { gamePlayed, matchCompleted } from '@idiomark/core'

// In-game SDK
class IdiomarkGameSDK {
  private events: IdiomarkGActivityEvent[] = []

  onSessionStart(gameId: string) {
    this.sessionStart = Date.now()
  }

  onSessionEnd(result: 'win' | 'loss' | 'draw', score?: number) {
    this.events.push(matchCompleted(this.gameId, result, {
      score,
      playtimeMinutes: (Date.now() - this.sessionStart) / 60000
    }))
  }

  async syncToCloud() {
    await fetch('/api/idiomark/activity', {
      method: 'POST',
      body: JSON.stringify({ events: this.events })
    })
  }
}
```

### Webhook Integration

```typescript
// Server-side webhook handler
app.post('/webhook/activity', async (req, res) => {
  const { events } = req.body

  // Validate events
  const validEvents = events.filter(e =>
    RawActivityEventSchema.safeParse(e).success
  )

  // Store events
  await activityStore.append(validEvents)

  // Trigger profile update
  await queueProfileUpdate(req.user.id)

  res.json({ received: validEvents.length })
})
```

---

## Version Compatibility

| Idiomark Version | Activity Stream Support |
|-------------|------------------------|
| V1.x | Not supported |
| V2.x | Types and processor available |
| V3.0.0 | Full binary format support |

---

## References

- [Binary Format Specification](../../docs/plans/2026-02-13-idiomark-binary-format-specification.md)
- [IdiomarkG Design Document](../../docs/plans/2026-02-15-idiomarkg-design.md)
- [Activity Stream Research](../../docs/plans/2026-02-18-idiomark-activity-stream-research.md)
- [Activity Stream Implementation Plan](../../docs/plans/2026-02-18-idiomark-activity-stream-implementation.md)

---

*Last updated: 2026-02-18*
*Schema version: 1.0.0*
