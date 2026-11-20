import { describe, it, expect } from 'vitest'
import {
  IdiomarkGNormalizer,
  idiomarkgNormalizer,
  RawPlatformData,
  AggregatedPlatformData,
  PersonalityData
} from '../idiomarkg-normalizer'
import {
  createEmptyPlayStyle,
  createEmptyPlatformPresence,
  createEmptyAchievementRecord,
  createEmptySocialGraph,
  createEmptySkillProfile
} from '../types-idiomarkg'

describe('IdiomarkGNormalizer', () => {
  const normalizer = new IdiomarkGNormalizer()

  // ============================================================================
  // NORMALIZE TESTS
  // ============================================================================

  describe('normalize', () => {
    it('should normalize empty data', () => {
      const emptyData: AggregatedPlatformData = {
        platforms: []
      }

      const result = normalizer.normalize(emptyData)

      // Should return empty structures
      expect(result.play_style).toEqual(createEmptyPlayStyle())
      expect(result.platforms).toEqual(createEmptyPlatformPresence())
      expect(result.achievements).toEqual(createEmptyAchievementRecord())
      expect(result.social).toEqual(createEmptySocialGraph())
      expect(result.skill_profile).toEqual(createEmptySkillProfile())
    })

    it('should normalize single platform data', () => {
      const singlePlatform: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123456',
            display_name: 'TestGamer',
            verified: true,
            games: [
              {
                app_id: '730',
                name: 'Counter-Strike 2',
                playtime_minutes: 5000,
                genres: ['fps']
              }
            ],
            stats: {
              total_achievements: 50,
              total_games: 1,
              total_playtime_minutes: 5000
            },
            friends: {
              count: 25
            }
          }
        ]
      }

      const result = normalizer.normalize(singlePlatform)

      // Check play_style
      expect(result.play_style.archetype).toContain('fighter')
      expect(result.play_style.competition).toBeGreaterThan(0.3)

      // Check platforms
      expect(result.platforms.linked).toHaveLength(1)
      expect(result.platforms.linked[0].platform).toBe('steam')
      expect(result.platforms.linked[0].display_name).toBe('TestGamer')
      expect(result.platforms.linked[0].verified).toBe(true)
      expect(result.platforms.primary).toBe('steam')
      expect(result.platforms.aggregate.total_games_owned).toBe(1)
      expect(result.platforms.aggregate.total_playtime_hours).toBeCloseTo(83.3, 0)

      // Check social
      expect(result.social.friends).toHaveLength(1)
      expect(result.social.friends[0].friend_count).toBe(25)

      // Check skill_profile
      expect(result.skill_profile.by_genre.length).toBeGreaterThan(0)
    })

    it('should infer fighter archetype from FPS games', () => {
      const fpsData: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'FPSPlayer',
            verified: true,
            games: [
              {
                app_id: '730',
                name: 'Counter-Strike 2',
                playtime_minutes: 10000,
                genres: ['fps']
              },
              {
                app_id: 'valorant',
                name: 'Valorant',
                playtime_minutes: 8000,
                genres: ['fps']
              },
              {
                app_id: 'apex',
                name: 'Apex Legends',
                playtime_minutes: 5000,
                genres: ['battle_royale']
              }
            ]
          }
        ]
      }

      const result = normalizer.normalize(fpsData)

      // Fighter should be the primary archetype
      expect(result.play_style.archetype).toContain('fighter')
      expect(result.play_style.archetype.indexOf('fighter')).toBeLessThanOrEqual(0)
      expect(result.play_style.competition).toBeGreaterThan(0.5)
    })

    it('should infer builder archetype from sandbox/strategy games', () => {
      const builderData: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '456',
            display_name: 'BuilderPlayer',
            verified: true,
            games: [
              {
                app_id: 'minecraft',
                name: 'Minecraft',
                playtime_minutes: 10000,
                genres: ['sandbox']
              },
              {
                app_id: 'civ6',
                name: 'Civilization VI',
                playtime_minutes: 8000,
                genres: ['strategy']
              },
              {
                app_id: 'factorio',
                name: 'Factorio',
                playtime_minutes: 5000,
                genres: ['sandbox']
              }
            ]
          }
        ]
      }

      const result = normalizer.normalize(builderData)

      // Builder should be the primary archetype
      expect(result.play_style.archetype).toContain('builder')
      expect(result.play_style.archetype.indexOf('builder')).toBeLessThanOrEqual(0)
      expect(result.play_style.cooperation).toBeGreaterThan(0.3)
    })
  })

  // ============================================================================
  // NORMALIZE ACHIEVEMENTS TESTS
  // ============================================================================

  describe('normalize achievements', () => {
    it('should extract notable rare achievements (rarity < 0.1)', () => {
      const dataWithAchievements: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'Achiever',
            verified: true,
            games: [
              {
                app_id: '730',
                name: 'Counter-Strike 2',
                playtime_minutes: 1000,
                genres: ['fps']
              }
            ],
            achievements: [
              {
                app_id: '730',
                achievement_id: 'rare-1',
                name: 'Super Rare Achievement',
                description: 'Only the best get this',
                rarity: 0.01,
                unlocked_at: '2025-01-15T12:00:00Z'
              },
              {
                app_id: '730',
                achievement_id: 'common-1',
                name: 'Common Achievement',
                description: 'Everyone has this',
                rarity: 0.8,
                unlocked_at: '2025-01-10T12:00:00Z'
              },
              {
                app_id: '730',
                achievement_id: 'rare-2',
                name: 'Very Rare Achievement',
                description: 'Extremely rare',
                rarity: 0.05,
                unlocked_at: '2025-01-20T12:00:00Z'
              }
            ]
          }
        ]
      }

      const result = normalizer.normalize(dataWithAchievements)

      // Should only include achievements with rarity < 0.1
      expect(result.achievements.notable).toHaveLength(2)
      expect(result.achievements.notable.map(a => a.name)).toContain('Super Rare Achievement')
      expect(result.achievements.notable.map(a => a.name)).toContain('Very Rare Achievement')
      expect(result.achievements.notable.map(a => a.name)).not.toContain('Common Achievement')

      // Should be sorted by rarity (ascending)
      expect(result.achievements.notable[0].rarity).toBeLessThanOrEqual(
        result.achievements.notable[1].rarity
      )
    })

    it('should limit notable achievements to 20', () => {
      const manyAchievements = Array.from({ length: 30 }, (_, i) => ({
        app_id: 'game-1',
        achievement_id: `ach-${i}`,
        name: `Achievement ${i}`,
        description: `Description ${i}`,
        rarity: 0.01 + (i * 0.002), // All under 0.1
        unlocked_at: '2025-01-15T12:00:00Z'
      }))

      const dataWithManyAchievements: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'Achiever',
            verified: true,
            games: [
              {
                app_id: 'game-1',
                name: 'Test Game',
                playtime_minutes: 1000
              }
            ],
            achievements: manyAchievements as RawPlatformData['achievements']
          }
        ]
      }

      const result = normalizer.normalize(dataWithManyAchievements)

      // Should be limited to 20
      expect(result.achievements.notable.length).toBeLessThanOrEqual(20)
    })

    it('should include trophy summary when available', () => {
      const dataWithTrophies: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'playstation',
            account_id: 'psn-123',
            display_name: 'TrophyHunter',
            verified: true,
            games: [],
            stats: {
              trophy_counts: {
                bronze: 100,
                silver: 50,
                gold: 25,
                platinum: 5
              }
            }
          }
        ]
      }

      const result = normalizer.normalize(dataWithTrophies)

      expect(result.achievements.trophy_summary).toBeDefined()
      expect(result.achievements.trophy_summary?.bronze).toBe(100)
      expect(result.achievements.trophy_summary?.silver).toBe(50)
      expect(result.achievements.trophy_summary?.gold).toBe(25)
      expect(result.achievements.trophy_summary?.platinum).toBe(5)
    })
  })

  // ============================================================================
  // NORMALIZE SKILL PROFILE TESTS
  // ============================================================================

  describe('normalize skill profile', () => {
    it('should include rankings from platform data', () => {
      const dataWithRankings: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'riot',
            account_id: 'riot-123',
            display_name: 'RankedPlayer',
            verified: true,
            games: [
              {
                app_id: 'valorant',
                name: 'Valorant',
                playtime_minutes: 5000,
                genres: ['fps']
              }
            ],
            rankings: [
              {
                game: 'Valorant',
                rank: 'Diamond',
                tier: '2',
                percentile: 90
              },
              {
                game: 'League of Legends',
                rank: 'Platinum',
                tier: '3',
                percentile: 75
              }
            ]
          }
        ]
      }

      const result = normalizer.normalize(dataWithRankings)

      expect(result.skill_profile.rankings).toHaveLength(2)
      expect(result.skill_profile.rankings[0].rank).toBe('Diamond')
      expect(result.skill_profile.rankings[0].tier).toBe('2')
      expect(result.skill_profile.rankings[0].percentile).toBe(90)
      expect(result.skill_profile.rankings[1].rank).toBe('Platinum')
    })

    it('should infer skill level from MMR', () => {
      const dataWithMMR: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'MMRPlayer',
            verified: true,
            games: [
              {
                app_id: 'dota2',
                name: 'Dota 2',
                playtime_minutes: 1000,
                genres: ['moba']
              }
            ],
            rankings: [
              {
                game: 'Dota 2',
                mmr: 3500 // Expert level
              }
            ]
          }
        ]
      }

      const result = normalizer.normalize(dataWithMMR)

      // Check that skill level was inferred
      const mobaEntry = result.skill_profile.by_genre.find(g => g.genre.includes('moba'))
      expect(mobaEntry).toBeDefined()
      expect(mobaEntry?.estimated_mmr).toBe(3500)
      expect(mobaEntry?.skill_level).toBe('expert')
    })

    it('should aggregate performance stats (wins, losses, KDA)', () => {
      const dataWithPerformance: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'PerfPlayer',
            verified: true,
            games: [],
            performance: {
              wins: 150,
              losses: 100,
              kills: 500,
              deaths: 300,
              assists: 200
            }
          },
          {
            platform: 'riot',
            account_id: '456',
            display_name: 'PerfPlayer2',
            verified: true,
            games: [],
            performance: {
              wins: 50,
              losses: 50,
              kills: 200,
              deaths: 200,
              assists: 100
            }
          }
        ]
      }

      const result = normalizer.normalize(dataWithPerformance)

      // Check aggregated performance
      expect(result.skill_profile.performance.total_matches).toBe(350) // 150+100+50+50
      expect(result.skill_profile.performance.win_rate).toBeCloseTo(200/350, 3)

      // KDA = (kills + assists) / deaths = (700 + 300) / 500 = 2.0
      expect(result.skill_profile.performance.kda_ratio).toBeCloseTo(2.0, 1)
    })
  })

  // ============================================================================
  // CREATE IdiomarkG FILE TESTS
  // ============================================================================

  describe('createIdiomarkGFile', () => {
    it('should create a complete IdiomarkG file with correct structure', () => {
      const data: AggregatedPlatformData = {
        platforms: [
          {
            platform: 'steam',
            account_id: '123',
            display_name: 'TestPlayer',
            verified: true,
            games: [
              {
                app_id: '730',
                name: 'Counter-Strike 2',
                playtime_minutes: 1000,
                genres: ['fps']
              }
            ]
          }
        ]
      }

      const personality: PersonalityData = {
        traits: {
          openness: 0.8,
          conscientiousness: 0.6
        }
      }

      const idiomarkgFile = normalizer.createIdiomarkGFile(data, personality)

      // Check top-level structure
      expect(idiomarkgFile.idiomark).toBe('1.0.0')
      expect(idiomarkgFile.personality).toEqual(personality)
      expect(idiomarkgFile.extensions).toBeDefined()
      expect(idiomarkgFile.extensions.idiomarkg).toBeDefined()

      // Check IdiomarkG extension structure
      expect(idiomarkgFile.extensions.idiomarkg.version).toBe('1.0.0')
      expect(idiomarkgFile.extensions.idiomarkg.gaming).toBeDefined()

      // Check gaming section has all required fields
      const gaming = idiomarkgFile.extensions.idiomarkg.gaming
      expect(gaming.play_style).toBeDefined()
      expect(gaming.platforms).toBeDefined()
      expect(gaming.achievements).toBeDefined()
      expect(gaming.social).toBeDefined()
      expect(gaming.skill_profile).toBeDefined()
    })

    it('should include personality in file', () => {
      const data: AggregatedPlatformData = {
        platforms: []
      }

      const personality: PersonalityData = {
        traits: {
          extraversion: 0.9,
          agreeableness: 0.7,
          neuroticism: 0.3
        },
        preferences: {
          favorite_genre: 'fps',
          play_time: 'evening'
        }
      }

      const idiomarkgFile = normalizer.createIdiomarkGFile(data, personality)

      expect(idiomarkgFile.personality).toEqual(personality)
      expect(idiomarkgFile.personality.traits?.extraversion).toBe(0.9)
      expect(idiomarkgFile.personality.traits?.agreeableness).toBe(0.7)
      expect(idiomarkgFile.personality.traits?.neuroticism).toBe(0.3)
      expect(idiomarkgFile.personality.preferences?.favorite_genre).toBe('fps')
    })
  })

  // ============================================================================
  // SINGLETON EXPORT TEST
  // ============================================================================

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(idiomarkgNormalizer).toBeInstanceOf(IdiomarkGNormalizer)
    })

    it('should be able to use singleton for normalization', () => {
      const result = idiomarkgNormalizer.normalize({ platforms: [] })
      expect(result).toBeDefined()
      expect(result.play_style).toEqual(createEmptyPlayStyle())
    })
  })

  // ============================================================================
  // ADDITIONAL HELPER METHOD TESTS
  // ============================================================================

  describe('genre inference', () => {
    it('should correctly normalize genre strings', () => {
      expect(normalizer.normalizeGenre('FPS')).toBe('fps')
      expect(normalizer.normalizeGenre('First-Person Shooter')).toBe('fps')
      expect(normalizer.normalizeGenre('first person shooter')).toBe('fps')
      expect(normalizer.normalizeGenre('shooter')).toBe('fps')
      expect(normalizer.normalizeGenre('MOBA')).toBe('moba')
      expect(normalizer.normalizeGenre('sandbox')).toBe('sandbox')
      expect(normalizer.normalizeGenre('invalid genre')).toBeNull()
    })

    it('should infer genre from game names', () => {
      expect(normalizer.inferGameGenre('Counter-Strike 2')).toBe('fps')
      expect(normalizer.inferGameGenre('League of Legends')).toBe('moba')
      expect(normalizer.inferGameGenre('Minecraft')).toBe('sandbox')
      expect(normalizer.inferGameGenre('World of Warcraft')).toBe('mmo')
      expect(normalizer.inferGameGenre('Civilization VI')).toBe('strategy')
      expect(normalizer.inferGameGenre('Some Unknown Game')).toBeNull()
    })

    it('should identify competitive genres', () => {
      expect(normalizer.isCompetitiveGenre('fps')).toBe(true)
      expect(normalizer.isCompetitiveGenre('moba')).toBe(true)
      expect(normalizer.isCompetitiveGenre('battle_royale')).toBe(true)
      expect(normalizer.isCompetitiveGenre('sandbox')).toBe(false)
      expect(normalizer.isCompetitiveGenre('rpg')).toBe(false)
    })

    it('should identify cooperative genres', () => {
      expect(normalizer.isCooperativeGenre('mmo')).toBe(true)
      expect(normalizer.isCooperativeGenre('strategy')).toBe(true)
      expect(normalizer.isCooperativeGenre('fps')).toBe(false)
      expect(normalizer.isCooperativeGenre('sandbox')).toBe(false)
    })
  })
})
