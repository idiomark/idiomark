import { describe, it, expect } from 'vitest';
import {
  PlayStyleSchema,
  PlatformPresenceSchema,
  AchievementRecordSchema,
  SocialGraphSchema,
  SkillProfileSchema,
  IdiomarkGFileSchema,
  validatePlayStyle,
  validatePlatformPresence,
  validateAchievementRecord,
  validateSocialGraph,
  validateSkillProfile,
  validateIdiomarkGFile,
  createEmptyPlayStyle,
  createEmptyPlatformPresence,
  createEmptyAchievementRecord,
  createEmptySocialGraph,
  createEmptySkillProfile,
  mmrToSkillLevel,
  calculateWinRate
} from '../types-idiomarkg';

describe('PlayStyle', () => {
  describe('Schema Validation', () => {
    it('should validate a complete play style', () => {
      const playStyle = {
        archetype: ['explorer', 'builder'],
        competition: 0.7,
        cooperation: 0.8,
        exploration: 0.9,
        preferred_modes: ['cooperative', 'casual'],
        session: {
          avg_duration_minutes: 90,
          preferred_time: 'evening',
          frequency: 'few_times_week'
        }
      };

      const result = PlayStyleSchema.safeParse(playStyle);
      expect(result.success).toBe(true);
    });

    it('should reject invalid archetype', () => {
      const playStyle = {
        archetype: ['invalid_archetype'],
        competition: 0.5,
        cooperation: 0.5,
        exploration: 0.5,
        preferred_modes: ['casual'],
        session: {
          avg_duration_minutes: 60,
          preferred_time: 'evening',
          frequency: 'daily'
        }
      };

      const result = PlayStyleSchema.safeParse(playStyle);
      expect(result.success).toBe(false);
    });

    it('should reject competition outside 0-1 range', () => {
      const playStyleTooHigh = {
        archetype: ['builder'],
        competition: 1.5,
        cooperation: 0.5,
        exploration: 0.5,
        preferred_modes: ['casual'],
        session: {
          avg_duration_minutes: 60,
          preferred_time: 'evening',
          frequency: 'daily'
        }
      };

      const playStyleTooLow = {
        archetype: ['builder'],
        competition: -0.5,
        cooperation: 0.5,
        exploration: 0.5,
        preferred_modes: ['casual'],
        session: {
          avg_duration_minutes: 60,
          preferred_time: 'evening',
          frequency: 'daily'
        }
      };

      const resultHigh = PlayStyleSchema.safeParse(playStyleTooHigh);
      const resultLow = PlayStyleSchema.safeParse(playStyleTooLow);

      expect(resultHigh.success).toBe(false);
      expect(resultLow.success).toBe(false);
    });
  });

  describe('validatePlayStyle', () => {
    it('should return valid for correct data', () => {
      const playStyle = {
        archetype: ['fighter'],
        competition: 0.9,
        cooperation: 0.3,
        exploration: 0.4,
        preferred_modes: ['competitive'],
        session: {
          avg_duration_minutes: 120,
          preferred_time: 'late_night',
          frequency: 'daily'
        }
      };

      const result = validatePlayStyle(playStyle);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const playStyle = {
        archetype: ['invalid'],
        competition: 2,
        cooperation: 0.5,
        exploration: 0.5,
        preferred_modes: ['casual'],
        session: {
          avg_duration_minutes: 60,
          preferred_time: 'evening',
          frequency: 'daily'
        }
      };

      const result = validatePlayStyle(playStyle);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('createEmptyPlayStyle', () => {
    it('should create empty play style with defaults', () => {
      const empty = createEmptyPlayStyle();

      expect(empty.archetype).toEqual([]);
      expect(empty.competition).toBe(0.5);
      expect(empty.cooperation).toBe(0.5);
      expect(empty.exploration).toBe(0.5);
      expect(empty.preferred_modes).toEqual([]);
      expect(empty.session.avg_duration_minutes).toBe(60);
      expect(empty.session.preferred_time).toBe('evening');
      expect(empty.session.frequency).toBe('casual');
    });

    it('should produce valid play style', () => {
      const empty = createEmptyPlayStyle();
      const result = validatePlayStyle(empty);
      expect(result.valid).toBe(true);
    });
  });
});

describe('PlatformPresence', () => {
  describe('Schema Validation', () => {
    it('should validate a complete platform presence', () => {
      const platformPresence = {
        linked: [
          {
            platform: 'steam',
            account_id: '123456789',
            display_name: 'GamerTag123',
            verified: true,
            last_sync: '2026-01-15T10:30:00Z'
          }
        ],
        primary: 'steam',
        aggregate: {
          total_playtime_hours: 1500,
          total_games_owned: 150,
          total_achievements: 500
        }
      };

      const result = PlatformPresenceSchema.safeParse(platformPresence);
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform', () => {
      const platformPresence = {
        linked: [
          {
            platform: 'invalid_platform',
            account_id: '123456789',
            display_name: 'GamerTag123',
            verified: true,
            last_sync: '2026-01-15T10:30:00Z'
          }
        ],
        primary: 'invalid_platform',
        aggregate: {
          total_playtime_hours: 1500,
          total_games_owned: 150,
          total_achievements: 500
        }
      };

      const result = PlatformPresenceSchema.safeParse(platformPresence);
      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format', () => {
      const platformPresence = {
        linked: [
          {
            platform: 'steam',
            account_id: '123456789',
            display_name: 'GamerTag123',
            verified: true,
            last_sync: 'not-a-datetime'
          }
        ],
        primary: 'steam',
        aggregate: {
          total_playtime_hours: 1500,
          total_games_owned: 150,
          total_achievements: 500
        }
      };

      const result = PlatformPresenceSchema.safeParse(platformPresence);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePlatformPresence', () => {
    it('should return valid for correct data', () => {
      const platformPresence = {
        linked: [
          {
            platform: 'xbox',
            account_id: 'xbox-123',
            display_name: 'XboxGamer',
            verified: false,
            last_sync: '2026-01-15T10:30:00Z'
          }
        ],
        primary: 'xbox',
        aggregate: {
          total_playtime_hours: 500,
          total_games_owned: 50,
          total_achievements: 200
        }
      };

      const result = validatePlatformPresence(platformPresence);
      expect(result.valid).toBe(true);
    });
  });

  describe('createEmptyPlatformPresence', () => {
    it('should create empty platform presence', () => {
      const empty = createEmptyPlatformPresence();

      expect(empty.linked).toEqual([]);
      expect(empty.primary).toBe('');
      expect(empty.aggregate.total_playtime_hours).toBe(0);
      expect(empty.aggregate.total_games_owned).toBe(0);
      expect(empty.aggregate.total_achievements).toBe(0);
    });

    it('should produce valid platform presence', () => {
      const empty = createEmptyPlatformPresence();
      const result = validatePlatformPresence(empty);
      expect(result.valid).toBe(true);
    });
  });
});

describe('AchievementRecord', () => {
  describe('Schema Validation', () => {
    it('should validate a complete achievement record', () => {
      const achievementRecord = {
        notable: [
          {
            platform: 'playstation',
            game: 'God of War',
            achievement_id: 'gow-plat',
            name: 'Platinum Trophy',
            description: 'Collect all trophies',
            rarity: 0.05,
            unlocked_at: '2025-06-15T14:00:00Z'
          }
        ],
        stats: [
          {
            platform: 'playstation',
            total: 100,
            unlocked: 85,
            completion_rate: 0.85
          }
        ],
        trophy_summary: {
          bronze: 50,
          silver: 25,
          gold: 9,
          platinum: 1
        }
      };

      const result = AchievementRecordSchema.safeParse(achievementRecord);
      expect(result.success).toBe(true);
    });

    it('should work without optional trophy_summary', () => {
      const achievementRecord = {
        notable: [
          {
            platform: 'steam',
            game: 'Half-Life 2',
            achievement_id: 'hl2-ach-1',
            name: 'Lambda Locator',
            description: 'Find all lambda caches',
            rarity: 0.15,
            unlocked_at: '2025-03-10T08:30:00Z'
          }
        ],
        stats: [
          {
            platform: 'steam',
            total: 50,
            unlocked: 30,
            completion_rate: 0.6
          }
        ]
      };

      const result = AchievementRecordSchema.safeParse(achievementRecord);
      expect(result.success).toBe(true);
    });

    it('should reject rarity outside 0-1 range', () => {
      const achievementRecord = {
        notable: [
          {
            platform: 'steam',
            game: 'Test Game',
            achievement_id: 'test-1',
            name: 'Test Achievement',
            description: 'Test',
            rarity: 1.5,
            unlocked_at: '2025-01-01T00:00:00Z'
          }
        ],
        stats: []
      };

      const result = AchievementRecordSchema.safeParse(achievementRecord);
      expect(result.success).toBe(false);
    });
  });

  describe('validateAchievementRecord', () => {
    it('should return valid for correct data', () => {
      const achievementRecord = {
        notable: [],
        stats: [
          {
            platform: 'epic',
            total: 20,
            unlocked: 10,
            completion_rate: 0.5
          }
        ]
      };

      const result = validateAchievementRecord(achievementRecord);
      expect(result.valid).toBe(true);
    });
  });

  describe('createEmptyAchievementRecord', () => {
    it('should create empty achievement record', () => {
      const empty = createEmptyAchievementRecord();

      expect(empty.notable).toEqual([]);
      expect(empty.stats).toEqual([]);
      expect(empty.trophy_summary).toBeDefined();
      expect(empty.trophy_summary?.bronze).toBe(0);
      expect(empty.trophy_summary?.silver).toBe(0);
      expect(empty.trophy_summary?.gold).toBe(0);
      expect(empty.trophy_summary?.platinum).toBe(0);
    });

    it('should produce valid achievement record', () => {
      const empty = createEmptyAchievementRecord();
      const result = validateAchievementRecord(empty);
      expect(result.valid).toBe(true);
    });
  });
});

describe('SocialGraph', () => {
  describe('Schema Validation', () => {
    it('should validate a complete social graph', () => {
      const socialGraph = {
        friends: [
          {
            platform: 'discord',
            friend_count: 150
          },
          {
            platform: 'steam',
            friend_count: 75
          }
        ],
        affiliations: [
          {
            name: 'Elite Gaming Clan',
            platform: 'discord',
            game: 'Valorant',
            role: 'Officer',
            joined_at: '2024-01-15T12:00:00Z'
          }
        ],
        preferences: {
          play_with_friends: true,
          open_to_group_invites: true,
          voice_chat: 'friends_only'
        }
      };

      const result = SocialGraphSchema.safeParse(socialGraph);
      expect(result.success).toBe(true);
    });

    it('should allow affiliations without game', () => {
      const socialGraph = {
        friends: [],
        affiliations: [
          {
            name: 'Gaming Discord Server',
            platform: 'discord',
            role: 'Member',
            joined_at: '2024-01-15T12:00:00Z'
          }
        ],
        preferences: {
          play_with_friends: false,
          open_to_group_invites: false,
          voice_chat: 'never'
        }
      };

      const result = SocialGraphSchema.safeParse(socialGraph);
      expect(result.success).toBe(true);
    });
  });

  describe('validateSocialGraph', () => {
    it('should return valid for correct data', () => {
      const socialGraph = {
        friends: [
          {
            platform: 'riot',
            friend_count: 50
          }
        ],
        affiliations: [],
        preferences: {
          play_with_friends: true,
          open_to_group_invites: false,
          voice_chat: 'always'
        }
      };

      const result = validateSocialGraph(socialGraph);
      expect(result.valid).toBe(true);
    });
  });

  describe('createEmptySocialGraph', () => {
    it('should create empty social graph', () => {
      const empty = createEmptySocialGraph();

      expect(empty.friends).toEqual([]);
      expect(empty.affiliations).toEqual([]);
      expect(empty.preferences.play_with_friends).toBe(true);
      expect(empty.preferences.open_to_group_invites).toBe(true);
      expect(empty.preferences.voice_chat).toBe('friends_only');
    });

    it('should produce valid social graph', () => {
      const empty = createEmptySocialGraph();
      const result = validateSocialGraph(empty);
      expect(result.valid).toBe(true);
    });
  });
});

describe('SkillProfile', () => {
  describe('Schema Validation', () => {
    it('should validate a complete skill profile', () => {
      const skillProfile = {
        by_genre: [
          {
            genre: ['fps', 'battle_royale'],
            estimated_mmr: 2500,
            skill_level: 'advanced',
            hours_played: 500
          }
        ],
        rankings: [
          {
            platform: 'riot',
            game: 'Valorant',
            rank: 'Diamond',
            tier: '2',
            percentile: 85
          }
        ],
        performance: {
          total_matches: 1000,
          win_rate: 0.55,
          kda_ratio: 1.2
        }
      };

      const result = SkillProfileSchema.safeParse(skillProfile);
      expect(result.success).toBe(true);
    });

    it('should work without optional fields', () => {
      const skillProfile = {
        by_genre: [
          {
            genre: ['mmo'],
            skill_level: 'intermediate',
            hours_played: 200
          }
        ],
        rankings: [
          {
            platform: 'battlenet',
            game: 'World of Warcraft'
          }
        ],
        performance: {
          total_matches: 100,
          win_rate: 0.5
        }
      };

      const result = SkillProfileSchema.safeParse(skillProfile);
      expect(result.success).toBe(true);
    });

    it('should reject win_rate outside 0-1 range', () => {
      const skillProfile = {
        by_genre: [],
        rankings: [],
        performance: {
          total_matches: 100,
          win_rate: 1.5
        }
      };

      const result = SkillProfileSchema.safeParse(skillProfile);
      expect(result.success).toBe(false);
    });

    it('should reject percentile outside 0-100 range', () => {
      const skillProfile = {
        by_genre: [],
        rankings: [
          {
            platform: 'steam',
            game: 'Test Game',
            percentile: 150
          }
        ],
        performance: {
          total_matches: 100,
          win_rate: 0.5
        }
      };

      const result = SkillProfileSchema.safeParse(skillProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('validateSkillProfile', () => {
    it('should return valid for correct data', () => {
      const skillProfile = {
        by_genre: [
          {
            genre: ['strategy'],
            skill_level: 'expert',
            hours_played: 1000
          }
        ],
        rankings: [],
        performance: {
          total_matches: 500,
          win_rate: 0.6
        }
      };

      const result = validateSkillProfile(skillProfile);
      expect(result.valid).toBe(true);
    });
  });

  describe('createEmptySkillProfile', () => {
    it('should create empty skill profile', () => {
      const empty = createEmptySkillProfile();

      expect(empty.by_genre).toEqual([]);
      expect(empty.rankings).toEqual([]);
      expect(empty.performance.total_matches).toBe(0);
      expect(empty.performance.win_rate).toBe(0);
      expect(empty.performance.kda_ratio).toBeUndefined();
    });

    it('should produce valid skill profile', () => {
      const empty = createEmptySkillProfile();
      const result = validateSkillProfile(empty);
      expect(result.valid).toBe(true);
    });
  });
});

describe('IdiomarkGFile', () => {
  describe('Schema Validation', () => {
    it('should validate a complete IdiomarkG file', () => {
      const idiomarkgFile = {
        idiomark: '1.0.0',
        personality: {
          traits: {
            openness: 0.8,
            conscientiousness: 0.6
          }
        },
        extensions: {
          idiomarkg: {
            version: '1.0.0',
            gaming: {
              play_style: createEmptyPlayStyle(),
              platforms: createEmptyPlatformPresence(),
              achievements: createEmptyAchievementRecord(),
              social: createEmptySocialGraph(),
              skill_profile: createEmptySkillProfile()
            }
          }
        }
      };

      const result = IdiomarkGFileSchema.safeParse(idiomarkgFile);
      expect(result.success).toBe(true);
    });

    it('should reject wrong version', () => {
      const idiomarkgFile = {
        idiomark: '2.0.0',
        personality: {},
        extensions: {
          idiomarkg: {
            version: '1.0.0',
            gaming: {
              play_style: createEmptyPlayStyle(),
              platforms: createEmptyPlatformPresence(),
              achievements: createEmptyAchievementRecord(),
              social: createEmptySocialGraph(),
              skill_profile: createEmptySkillProfile()
            }
          }
        }
      };

      const result = IdiomarkGFileSchema.safeParse(idiomarkgFile);
      expect(result.success).toBe(false);
    });

    it('should reject wrong IdiomarkG extension version', () => {
      const idiomarkgFile = {
        idiomark: '1.0.0',
        personality: {},
        extensions: {
          idiomarkg: {
            version: '2.0.0',
            gaming: {
              play_style: createEmptyPlayStyle(),
              platforms: createEmptyPlatformPresence(),
              achievements: createEmptyAchievementRecord(),
              social: createEmptySocialGraph(),
              skill_profile: createEmptySkillProfile()
            }
          }
        }
      };

      const result = IdiomarkGFileSchema.safeParse(idiomarkgFile);
      expect(result.success).toBe(false);
    });
  });

  describe('validateIdiomarkGFile', () => {
    it('should return valid for correct data', () => {
      const idiomarkgFile = {
        idiomark: '1.0.0',
        personality: {},
        extensions: {
          idiomarkg: {
            version: '1.0.0',
            gaming: {
              play_style: createEmptyPlayStyle(),
              platforms: createEmptyPlatformPresence(),
              achievements: createEmptyAchievementRecord(),
              social: createEmptySocialGraph(),
              skill_profile: createEmptySkillProfile()
            }
          }
        }
      };

      const result = validateIdiomarkGFile(idiomarkgFile);
      expect(result.valid).toBe(true);
    });

    it('should return errors for invalid data', () => {
      const idiomarkgFile = {
        idiomark: '1.0.0',
        personality: {},
        extensions: {
          idiomarkg: {
            version: '1.0.0',
            gaming: {
              play_style: { invalid: 'data' },
              platforms: createEmptyPlatformPresence(),
              achievements: createEmptyAchievementRecord(),
              social: createEmptySocialGraph(),
              skill_profile: createEmptySkillProfile()
            }
          }
        }
      };

      const result = validateIdiomarkGFile(idiomarkgFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

describe('Helper Functions', () => {
  describe('mmrToSkillLevel', () => {
    it('should return beginner for MMR below 1000', () => {
      expect(mmrToSkillLevel(0)).toBe('beginner');
      expect(mmrToSkillLevel(500)).toBe('beginner');
      expect(mmrToSkillLevel(999)).toBe('beginner');
    });

    it('should return intermediate for MMR 1000-1999', () => {
      expect(mmrToSkillLevel(1000)).toBe('intermediate');
      expect(mmrToSkillLevel(1500)).toBe('intermediate');
      expect(mmrToSkillLevel(1999)).toBe('intermediate');
    });

    it('should return advanced for MMR 2000-2999', () => {
      expect(mmrToSkillLevel(2000)).toBe('advanced');
      expect(mmrToSkillLevel(2500)).toBe('advanced');
      expect(mmrToSkillLevel(2999)).toBe('advanced');
    });

    it('should return expert for MMR 3000-3999', () => {
      expect(mmrToSkillLevel(3000)).toBe('expert');
      expect(mmrToSkillLevel(3500)).toBe('expert');
      expect(mmrToSkillLevel(3999)).toBe('expert');
    });

    it('should return professional for MMR 4000+', () => {
      expect(mmrToSkillLevel(4000)).toBe('professional');
      expect(mmrToSkillLevel(5000)).toBe('professional');
      expect(mmrToSkillLevel(10000)).toBe('professional');
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate correctly', () => {
      expect(calculateWinRate(50, 50)).toBe(0.5);
      expect(calculateWinRate(75, 25)).toBe(0.75);
      expect(calculateWinRate(100, 0)).toBe(1);
      expect(calculateWinRate(0, 100)).toBe(0);
    });

    it('should handle zero games played', () => {
      expect(calculateWinRate(0, 0)).toBe(0);
    });

    it('should handle edge cases', () => {
      // Perfect win rate
      expect(calculateWinRate(1, 0)).toBe(1);
      // Zero win rate
      expect(calculateWinRate(0, 1)).toBe(0);
      // Large numbers
      expect(calculateWinRate(10000, 10000)).toBe(0.5);
    });

    it('should return value between 0 and 1', () => {
      const testCases = [
        [3, 7],
        [10, 5],
        [0, 0],
        [100, 50],
        [1, 999]
      ];

      testCases.forEach(([wins, losses]) => {
        const winRate = calculateWinRate(wins, losses);
        expect(winRate).toBeGreaterThanOrEqual(0);
        expect(winRate).toBeLessThanOrEqual(1);
      });
    });
  });
});
