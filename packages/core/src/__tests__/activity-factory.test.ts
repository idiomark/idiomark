import { describe, it, expect } from 'vitest'
import {
  getMicroseconds,
  dateToMicroseconds,
  microsecondsToDate,
  generateUUIDv7,
  createActivityEvent,
  createGamingEvent,
  gamePlayed,
  matchCompleted,
  achievementUnlocked,
  rankChanged,
  friendAdded
} from '../activity-factory'

describe('Timestamp utilities', () => {
  it('gets current microseconds', () => {
    const before = Date.now() * 1000
    const micros = getMicroseconds()
    const after = Date.now() * 1000
    expect(micros).toBeGreaterThan(0)
    expect(micros).toBeGreaterThanOrEqual(before)
    expect(micros).toBeLessThanOrEqual(after)
  })

  it('converts date to microseconds', () => {
    const date = new Date('2026-02-18T12:00:00Z')
    const micros = dateToMicroseconds(date)
    const expectedMicros = date.getTime() * 1000
    expect(micros).toBe(expectedMicros)
  })

  it('converts microseconds to date', () => {
    const date = new Date('2026-02-18T12:00:00Z')
    const micros = date.getTime() * 1000
    const result = microsecondsToDate(micros)
    expect(result.getTime()).toBe(date.getTime())
  })

  it('round-trips date conversion', () => {
    const original = new Date()
    const micros = dateToMicroseconds(original)
    const result = microsecondsToDate(micros)
    expect(result.getTime()).toBe(original.getTime())
  })
})

describe('generateUUIDv7', () => {
  it('generates valid UUID format', () => {
    const uuid = generateUUIDv7()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique UUIDs', () => {
    const uuids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUIDv7())
    }
    expect(uuids.size).toBe(100)
  })

  it('generates time-sortable UUIDs', async () => {
    const uuid1 = generateUUIDv7()
    await new Promise(r => setTimeout(r, 2)) // 2ms delay
    const uuid2 = generateUUIDv7()

    // UUID v7 should be sortable - earlier timestamp means lower UUID
    expect(uuid1 < uuid2).toBe(true)
  })
})

describe('createActivityEvent', () => {
  it('creates event with required fields', () => {
    const event = createActivityEvent({
      verb: 'logged_in',
      object: 'dashboard'
    })

    expect(event.verb).toBe('logged_in')
    expect(event.object).toBe('dashboard')
    expect(event.id).toBeDefined()
    expect(event.timestamp).toBeGreaterThan(0)
  })

  it('creates event with all optional fields', () => {
    const event = createActivityEvent({
      verb: 'profile_updated',
      object: 'user_profile',
      actor: 'system',
      context: { changes: ['name', 'email'] },
      ttl: 86400
    })

    expect(event.verb).toBe('profile_updated')
    expect(event.object).toBe('user_profile')
    expect(event.actor).toBe('system')
    expect(event.context).toEqual({ changes: ['name', 'email'] })
    expect(event.ttl).toBe(86400)
  })

  it('allows custom timestamp and id', () => {
    const customId = '018c5c6e-7b4a-7d2e-8f3a-5b6c7d8e9f0a'
    const customTimestamp = 1739847600000000

    const event = createActivityEvent({
      verb: 'extraction_completed',
      object: 'github',
      id: customId,
      timestamp: customTimestamp
    })

    expect(event.id).toBe(customId)
    expect(event.timestamp).toBe(customTimestamp)
  })
})

describe('createGamingEvent', () => {
  it('creates gaming event with context', () => {
    const event = createGamingEvent({
      verb: 'game_played',
      object: 'cs2',
      context: {
        game_id: 'cs2',
        playtime_minutes: 45,
        genre: 'fps'
      }
    })

    expect(event.verb).toBe('game_played')
    expect(event.object).toBe('cs2')
    expect(event.context?.game_id).toBe('cs2')
    expect(event.context?.playtime_minutes).toBe(45)
  })
})

describe('Specialized gaming event creators', () => {
  it('creates gamePlayed event', () => {
    const event = gamePlayed('cs2', 'Counter-Strike 2', {
      playtimeMinutes: 60,
      genre: 'fps',
      platform: 'pc'
    })

    expect(event.verb).toBe('game_played')
    expect(event.object).toBe('cs2')
    expect(event.context?.game_name).toBe('Counter-Strike 2')
    expect(event.context?.playtime_minutes).toBe(60)
    expect(event.context?.genre).toBe('fps')
    expect(event.context?.platform).toBe('pc')
  })

  it('creates matchCompleted event with win', () => {
    const event = matchCompleted('valorant', 'win', {
      score: 13,
      position: 1
    })

    expect(event.verb).toBe('match_completed')
    expect(event.context?.match_result).toBe('win')
    expect(event.context?.score).toBe(13)
    expect(event.context?.position).toBe(1)
  })

  it('creates achievementUnlocked event', () => {
    const event = achievementUnlocked('ow2', 'ach_headshot_master', {
      achievementName: 'Headshot Master',
      rarity: 0.05
    })

    expect(event.verb).toBe('achievement_unlocked')
    expect(event.object).toBe('ach_headshot_master')
    expect(event.context?.achievement?.name).toBe('Headshot Master')
    expect(event.context?.achievement?.rarity).toBe(0.05)
  })

  it('creates rankChanged event', () => {
    const event = rankChanged('ow2', 'Platinum', {
      oldRank: 'Gold'
    })

    expect(event.verb).toBe('rank_changed')
    expect(event.context?.rank_change?.from).toBe('Gold')
    expect(event.context?.rank_change?.to).toBe('Platinum')
  })

  it('creates friendAdded event', () => {
    const event = friendAdded('player_123', {
      gameId: 'valorant'
    })

    expect(event.verb).toBe('friend_added')
    expect(event.object).toBe('player_123')
    expect(event.context?.game_id).toBe('valorant')
  })
})
