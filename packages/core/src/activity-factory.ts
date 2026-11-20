/**
 * Activity Event Factory
 *
 * Factory functions for creating activity events with proper IDs and timestamps
 *
 * @module activity-factory
 */

import { randomUUID } from 'crypto'
import type {
  RawActivityEvent,
  IdiomarkGActivityEvent,
  GamingContext,
  ActivityVerb
} from './types-activity'

// ============================================================================
// TIMESTAMP UTILITIES
// ============================================================================

/**
 * Get current timestamp in microseconds
 */
export function getMicroseconds(): number {
  return Date.now() * 1000
}

/**
 * Convert Date to microseconds
 */
export function dateToMicroseconds(date: Date): number {
  return date.getTime() * 1000
}

/**
 * Convert microseconds to Date
 */
export function microsecondsToDate(micros: number): Date {
  return new Date(Math.floor(micros / 1000))
}

// ============================================================================
// UUID V7 GENERATION
// ============================================================================

/**
 * Generate a UUID v7 (time-sortable)
 *
 * Note: This is a simplified implementation. For production, use a proper UUID v7 library.
 * Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
 * - t: timestamp (48 bits, milliseconds since epoch)
 * - x: random bits
 * - y: version (4 for random, we use 7 for v7)
 */
export function generateUUIDv7(): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now()

  // Convert to hex (12 characters for 48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0')

  // Generate random bytes for the rest
  const randomBytes = new Uint8Array(10)
  crypto.getRandomValues(randomBytes)

  // Build the UUID
  const hex = [
    timestampHex.slice(0, 8),
    timestampHex.slice(8, 12),
    '7' + Array.from(randomBytes.slice(0, 2))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('').slice(1),
    ((randomBytes[2] & 0x3f) | 0x80).toString(16).padStart(2, '0') +
      randomBytes[3].toString(16).padStart(2, '0'),
    Array.from(randomBytes.slice(4))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  ]

  return `${hex[0]}-${hex[1]}-${hex[2]}-${hex[3]}-${hex[4]}`
}

// ============================================================================
// EVENT FACTORY
// ============================================================================

/**
 * Options for creating an activity event
 */
export interface CreateActivityEventOptions {
  verb: ActivityVerb
  object: string
  actor?: string
  context?: Record<string, unknown>
  ttl?: number
  timestamp?: number // microseconds, defaults to now
  id?: string // UUID, defaults to generated
}

/**
 * Create a raw activity event
 */
export function createActivityEvent(options: CreateActivityEventOptions): RawActivityEvent {
  const event: RawActivityEvent = {
    id: options.id ?? generateUUIDv7(),
    timestamp: options.timestamp ?? getMicroseconds(),
    verb: options.verb,
    object: options.object
  }

  if (options.actor !== undefined) {
    event.actor = options.actor
  }

  if (options.context !== undefined) {
    event.context = options.context
  }

  if (options.ttl !== undefined) {
    event.ttl = options.ttl
  }

  return event
}

// ============================================================================
// IdiomarkG GAMING EVENT FACTORY
// ============================================================================

/**
 * Options for creating a gaming activity event
 */
export interface CreateGamingEventOptions {
  verb: IdiomarkGActivityEvent['verb']
  object: string
  context?: GamingContext
  ttl?: number
  timestamp?: number
  id?: string
}

/**
 * Create a IdiomarkG gaming activity event
 */
export function createGamingEvent(options: CreateGamingEventOptions): IdiomarkGActivityEvent {
  const event: IdiomarkGActivityEvent = {
    id: options.id ?? generateUUIDv7(),
    timestamp: options.timestamp ?? getMicroseconds(),
    verb: options.verb,
    object: options.object
  }

  if (options.context !== undefined) {
    event.context = options.context
  }

  if (options.ttl !== undefined) {
    event.ttl = options.ttl
  }

  return event
}

// ============================================================================
// SPECIALIZED GAMING EVENT CREATORS
// ============================================================================

/**
 * Create a "game played" event
 */
export function gamePlayed(
  gameId: string,
  gameName: string,
  options: {
    playtimeMinutes?: number
    genre?: string
    platform?: string
  } = {}
): IdiomarkGActivityEvent {
  return createGamingEvent({
    verb: 'game_played',
    object: gameId,
    context: {
      game_id: gameId,
      game_name: gameName,
      playtime_minutes: options.playtimeMinutes,
      genre: options.genre,
      platform: options.platform
    }
  })
}

/**
 * Create a "match completed" event
 */
export function matchCompleted(
  gameId: string,
  result: 'win' | 'loss' | 'draw',
  options: {
    score?: number
    position?: number
    playtimeMinutes?: number
  } = {}
): IdiomarkGActivityEvent {
  return createGamingEvent({
    verb: 'match_completed',
    object: gameId,
    context: {
      game_id: gameId,
      match_result: result,
      score: options.score,
      position: options.position,
      playtime_minutes: options.playtimeMinutes
    }
  })
}

/**
 * Create an "achievement unlocked" event
 */
export function achievementUnlocked(
  gameId: string,
  achievementId: string,
  options: {
    achievementName?: string
    rarity?: number
  } = {}
): IdiomarkGActivityEvent {
  return createGamingEvent({
    verb: 'achievement_unlocked',
    object: achievementId,
    context: {
      game_id: gameId,
      achievement: {
        id: achievementId,
        name: options.achievementName,
        rarity: options.rarity
      }
    }
  })
}

/**
 * Create a "rank changed" event
 */
export function rankChanged(
  gameId: string,
  newRank: string,
  options: {
    oldRank?: string
  } = {}
): IdiomarkGActivityEvent {
  return createGamingEvent({
    verb: 'rank_changed',
    object: `${gameId}:${newRank}`,
    context: {
      game_id: gameId,
      rank_change: {
        from: options.oldRank,
        to: newRank
      }
    }
  })
}

/**
 * Create a "friend added" event
 */
export function friendAdded(
  platformId: string,
  options: {
    gameId?: string
  } = {}
): IdiomarkGActivityEvent {
  return createGamingEvent({
    verb: 'friend_added',
    object: platformId,
    context: options.gameId ? { game_id: options.gameId } : undefined
  })
}
