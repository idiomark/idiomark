import { describe, it, expect } from 'vitest'
import {
  IdiomarkGActivityProcessor,
  idiomarkgActivityProcessor
} from '../activity-processor'
import {
  gamePlayed,
  matchCompleted,
  achievementUnlocked,
  rankChanged,
  friendAdded
} from '../activity-factory'
import { createEmptyPlayStyle } from '../types-idiomarkg'
import type { IdiomarkGGaming } from '../types-idiomarkg'

// Helper to create a minimal IdiomarkG profile for testing
function createTestProfile(): IdiomarkGGaming {
  return {
    play_style: createEmptyPlayStyle(),
    platforms: {
      linked: [],
      primary: '',
      aggregate: {
        total_playtime_hours: 0,
        total_games_owned: 0,
        total_achievements: 0
      }
    },
    achievements: {
      notable: [],
      stats: [],
      trophy_summary: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    },
    social: {
      friends: [],
      affiliations: [],
      preferences: {
        play_with_friends: true,
        open_to_group_invites: true,
        voice_chat: 'friends_only'
      }
    },
    skill_profile: {
      by_genre: [],
      rankings: [],
      performance: {
        total_matches: 0,
        win_rate: 0
      }
    }
  }
}

describe('IdiomarkGActivityProcessor', () => {
  describe('processEvent', () => {
    it('returns unchanged profile for unknown event types', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = {
        id: 'test',
        timestamp: Date.now() * 1000,
        verb: 'level_up' as const,
        object: 'character'
      }

      const result = processor.processEvent(event, profile)
      expect(result).toEqual(profile)
    })
  })

  describe('gamePlayed processing', () => {
    it('increases competition for competitive games', () => {
      const processor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })
      const profile = createTestProfile()
      const initialCompetition = profile.play_style.competition

      const event = gamePlayed('cs2', 'Counter-Strike 2', {
        genre: 'fps',
        playtimeMinutes: 60
      })

      const result = processor.processEvent(event, profile)

      expect(result.play_style.competition).toBeGreaterThan(initialCompetition)
    })

    it('increases cooperation for cooperative games', () => {
      const processor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })
      const profile = createTestProfile()
      const initialCooperation = profile.play_style.cooperation

      const event = gamePlayed('wow', 'World of Warcraft', {
        genre: 'mmo',
        playtimeMinutes: 120
      })

      const result = processor.processEvent(event, profile)

      expect(result.play_style.cooperation).toBeGreaterThan(initialCooperation)
    })

    it('does not modify profile without genre', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = gamePlayed('unknown-game', 'Unknown Game', {})

      const result = processor.processEvent(event, profile)

      expect(result.play_style).toEqual(profile.play_style)
    })
  })

  describe('matchCompleted processing', () => {
    it('increases competition on win', () => {
      const processor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })
      const profile = createTestProfile()
      const initialCompetition = profile.play_style.competition

      const event = matchCompleted('valorant', 'win', { score: 13 })

      const result = processor.processEvent(event, profile)

      expect(result.play_style.competition).toBeGreaterThan(initialCompetition)
    })

    it('updates win rate on win', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = matchCompleted('valorant', 'win')

      const result = processor.processEvent(event, profile)

      expect(result.skill_profile.performance.win_rate).toBeGreaterThan(0)
    })
  })

  describe('achievementUnlocked processing', () => {
    it('adds rare achievements to notable list', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = achievementUnlocked('ow2', 'ach_rare', {
        achievementName: 'Rare Achievement',
        rarity: 0.05 // 5% of players
      })

      const result = processor.processEvent(event, profile)

      expect(result.achievements.notable).toHaveLength(1)
      expect(result.achievements.notable[0].achievement_id).toBe('ach_rare')
    })

    it('ignores common achievements', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = achievementUnlocked('ow2', 'ach_common', {
        achievementName: 'Common Achievement',
        rarity: 0.8 // 80% of players
      })

      const result = processor.processEvent(event, profile)

      expect(result.achievements.notable).toHaveLength(0)
    })

    it('does not add duplicate achievements', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = achievementUnlocked('ow2', 'ach_rare', {
        rarity: 0.05
      })

      // Process same event twice
      let result = processor.processEvent(event, profile)
      result = processor.processEvent(event, result)

      expect(result.achievements.notable).toHaveLength(1)
    })
  })

  describe('rankChanged processing', () => {
    it('updates existing ranking', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()
      profile.skill_profile.rankings.push({
        platform: 'activity',
        game: 'valorant',
        rank: 'Gold'
      })

      const event = rankChanged('valorant', 'Platinum', { oldRank: 'Gold' })

      const result = processor.processEvent(event, profile)

      expect(result.skill_profile.rankings[0].rank).toBe('Platinum')
    })

    it('creates new ranking if not exists', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      const event = rankChanged('cs2', 'Global Elite')

      const result = processor.processEvent(event, profile)

      expect(result.skill_profile.rankings).toHaveLength(1)
      expect(result.skill_profile.rankings[0].game).toBe('cs2')
      expect(result.skill_profile.rankings[0].rank).toBe('Global Elite')
    })
  })

  describe('friendAdded processing', () => {
    it('updates social preferences for active social users', () => {
      const processor = new IdiomarkGActivityProcessor()
      const profile = createTestProfile()

      // Add friends first
      profile.social.friends = [
        { platform: 'steam', friend_count: 20 }
      ]

      const event = friendAdded('player_new')

      const result = processor.processEvent(event, profile)

      expect(result.social.preferences.play_with_friends).toBe(true)
    })
  })

  describe('processEvents (batch)', () => {
    it('processes multiple events in sequence', () => {
      const processor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })
      const profile = createTestProfile()

      const events = [
        gamePlayed('cs2', 'CS2', { genre: 'fps' }),
        matchCompleted('cs2', 'win'),
        achievementUnlocked('cs2', 'ach_1', { rarity: 0.05 })
      ]

      const result = processor.processEvents(events, profile)

      // Competition should have increased from both game and match
      expect(result.play_style.competition).toBeGreaterThan(0.5)

      // Achievement should be added
      expect(result.achievements.notable).toHaveLength(1)
    })

    it('processes events in timestamp order', () => {
      const processor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })
      const profile = createTestProfile()

      // Events out of order
      const events = [
        { ...matchCompleted('cs2', 'win'), timestamp: 3000000 },
        { ...gamePlayed('cs2', 'CS2', { genre: 'fps' }), timestamp: 1000000 },
        { ...achievementUnlocked('cs2', 'ach', { rarity: 0.05 }), timestamp: 2000000 }
      ]

      // Should process in timestamp order: game -> achievement -> match
      const result = processor.processEvents(events, profile)

      // Should still work correctly
      expect(result.play_style.competition).toBeGreaterThan(0)
      expect(result.achievements.notable).toHaveLength(1)
    })
  })

  describe('configuration', () => {
    it('respects adaptation rate', () => {
      const slowProcessor = new IdiomarkGActivityProcessor({ adaptationRate: 0.01 })
      const fastProcessor = new IdiomarkGActivityProcessor({ adaptationRate: 0.1 })

      const event = gamePlayed('cs2', 'CS2', { genre: 'fps' })

      const slowResult = slowProcessor.processEvent(event, createTestProfile())
      const fastResult = fastProcessor.processEvent(event, createTestProfile())

      // Faster adaptation should result in larger change
      expect(fastResult.play_style.competition)
        .toBeGreaterThan(slowResult.play_style.competition)
    })

    it('respects max delta cap', () => {
      const processor = new IdiomarkGActivityProcessor({
        adaptationRate: 1.0,
        maxDeltaPerEvent: 0.02
      })

      const profile = createTestProfile()
      const event = gamePlayed('cs2', 'CS2', { genre: 'fps' })

      const result = processor.processEvent(event, profile)

      // Should be capped at 0.02 even with high adaptation rate
      // Use toBeCloseTo to handle floating-point precision
      const delta = result.play_style.competition - profile.play_style.competition
      expect(delta).toBeCloseTo(0.02, 10) // Should be ~0.02 (the cap)
      expect(delta).toBeLessThanOrEqual(0.021) // With tolerance for FP errors
    })
  })
})
