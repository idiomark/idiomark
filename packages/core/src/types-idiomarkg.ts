/**
 * IdiomarkG (Idiomark for Gaming) Types
 *
 * Gaming behavioral and social personality types
 * Following Idiomark principles: quantified, constrained, optional
 */

import { z } from 'zod'

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Gaming Platform Types
 */
export const GamingPlatformSchema = z.enum([
  'steam',
  'xbox',
  'playstation',
  'epic',
  'nintendo',
  'discord',
  'roblox',
  'mobile',
  'riot',
  'battlenet',
  'activity'
])
export type GamingPlatform = z.infer<typeof GamingPlatformSchema>

/**
 * Game Genre Types
 */
export const GameGenreSchema = z.enum([
  'fps',
  'moba',
  'rpg',
  'strategy',
  'sports',
  'racing',
  'puzzle',
  'sandbox',
  'mmo',
  'battle_royale'
])
export type GameGenre = z.infer<typeof GameGenreSchema>

/**
 * Play Style Archetypes
 */
export const PlayStyleArchetypeSchema = z.enum([
  'builder',
  'fighter',
  'explorer',
  'social',
  'creator'
])
export type PlayStyleArchetype = z.infer<typeof PlayStyleArchetypeSchema>

/**
 * Game Mode Preferences
 */
export const GameModeSchema = z.enum([
  'competitive',
  'cooperative',
  'solo',
  'casual'
])
export type GameMode = z.infer<typeof GameModeSchema>

// ============================================================================
// PLAY STYLE SCHEMA
// ============================================================================

export const PlayStyleSchema = z.object({
  archetype: z.array(PlayStyleArchetypeSchema),
  competition: z.number().min(0).max(1),
  cooperation: z.number().min(0).max(1),
  exploration: z.number().min(0).max(1),
  preferred_modes: z.array(GameModeSchema),
  session: z.object({
    avg_duration_minutes: z.number().positive(),
    preferred_time: z.enum(['morning', 'afternoon', 'evening', 'late_night']),
    frequency: z.enum(['daily', 'few_times_week', 'weekly', 'casual'])
  })
})

export interface PlayStyle extends z.infer<typeof PlayStyleSchema> {}

// ============================================================================
// PLATFORM PRESENCE SCHEMA
// ============================================================================

export const PlatformPresenceSchema = z.object({
  linked: z.array(z.object({
    platform: GamingPlatformSchema,
    account_id: z.string(),
    display_name: z.string(),
    verified: z.boolean(),
    last_sync: z.string().datetime()
  })),
  primary: z.string(),
  aggregate: z.object({
    total_playtime_hours: z.number().nonnegative(),
    total_games_owned: z.number().nonnegative(),
    total_achievements: z.number().nonnegative()
  })
})

export interface PlatformPresence extends z.infer<typeof PlatformPresenceSchema> {}

// ============================================================================
// ACHIEVEMENT RECORD SCHEMA
// ============================================================================

export const AchievementRecordSchema = z.object({
  notable: z.array(z.object({
    platform: GamingPlatformSchema,
    game: z.string(),
    achievement_id: z.string(),
    name: z.string(),
    description: z.string(),
    rarity: z.number().min(0).max(1),
    unlocked_at: z.string().datetime()
  })),
  stats: z.array(z.object({
    platform: GamingPlatformSchema,
    total: z.number().nonnegative(),
    unlocked: z.number().nonnegative(),
    completion_rate: z.number().min(0).max(1)
  })),
  trophy_summary: z.object({
    bronze: z.number().nonnegative(),
    silver: z.number().nonnegative(),
    gold: z.number().nonnegative(),
    platinum: z.number().nonnegative()
  }).optional()
})

export interface AchievementRecord extends z.infer<typeof AchievementRecordSchema> {}

// ============================================================================
// SOCIAL GRAPH SCHEMA
// ============================================================================

export const SocialGraphSchema = z.object({
  friends: z.array(z.object({
    platform: GamingPlatformSchema,
    friend_count: z.number().nonnegative()
  })),
  affiliations: z.array(z.object({
    name: z.string(),
    platform: GamingPlatformSchema,
    game: z.string().optional(),
    role: z.string(),
    joined_at: z.string().datetime()
  })),
  preferences: z.object({
    play_with_friends: z.boolean(),
    open_to_group_invites: z.boolean(),
    voice_chat: z.enum(['always', 'friends_only', 'never'])
  })
})

export interface SocialGraph extends z.infer<typeof SocialGraphSchema> {}

// ============================================================================
// SKILL PROFILE SCHEMA
// ============================================================================

export const SkillProfileSchema = z.object({
  by_genre: z.array(z.object({
    genre: z.array(GameGenreSchema),
    estimated_mmr: z.number().positive().optional(),
    skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'professional']),
    hours_played: z.number().nonnegative()
  })),
  rankings: z.array(z.object({
    platform: GamingPlatformSchema,
    game: z.string(),
    rank: z.string().optional(),
    tier: z.string().optional(),
    percentile: z.number().min(0).max(100).optional()
  })),
  performance: z.object({
    total_matches: z.number().nonnegative(),
    win_rate: z.number().min(0).max(1),
    kda_ratio: z.number().nonnegative().optional()
  })
})

export interface SkillProfile extends z.infer<typeof SkillProfileSchema> {}

// ============================================================================
// IdiomarkG GAMING EXTENSION SCHEMA
// ============================================================================

export const IdiomarkGGamingSchema = z.object({
  play_style: PlayStyleSchema,
  platforms: PlatformPresenceSchema,
  achievements: AchievementRecordSchema,
  social: SocialGraphSchema,
  skill_profile: SkillProfileSchema
})

export interface IdiomarkGGaming extends z.infer<typeof IdiomarkGGamingSchema> {}

export const IdiomarkGExtensionSchema = z.object({
  version: z.literal('1.0.0'),
  gaming: IdiomarkGGamingSchema
})

export interface IdiomarkGExtension extends z.infer<typeof IdiomarkGExtensionSchema> {}

// Placeholder for base Idiomark personality schema (imported from main types)
const PersonalityPlaceholder = z.object({
  // This would be replaced with actual Idiomark personality schema
  traits: z.record(z.string(), z.number()).optional(),
  preferences: z.record(z.string(), z.any()).optional()
})

export const IdiomarkGFileSchema = z.object({
  idiomark: z.literal('1.0.0'),
  personality: PersonalityPlaceholder,
  extensions: z.object({
    idiomarkg: IdiomarkGExtensionSchema
  })
})

export interface IdiomarkGFile extends z.infer<typeof IdiomarkGFileSchema> {}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors?: Record<string, string>
}

export function validatePlayStyle(data: unknown): ValidationResult {
  const result = PlayStyleSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

export function validatePlatformPresence(data: unknown): ValidationResult {
  const result = PlatformPresenceSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

export function validateAchievementRecord(data: unknown): ValidationResult {
  const result = AchievementRecordSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

export function validateSocialGraph(data: unknown): ValidationResult {
  const result = SocialGraphSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

export function validateSkillProfile(data: unknown): ValidationResult {
  const result = SkillProfileSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

export function validateIdiomarkGFile(data: unknown): ValidationResult {
  const result = IdiomarkGFileSchema.safeParse(data)
  if (result.success) {
    return { valid: true }
  }
  const errors: Record<string, string> = {}
  result.error.issues.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return { valid: false, errors }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createEmptyPlayStyle(): PlayStyle {
  return {
    archetype: [],
    competition: 0.5,
    cooperation: 0.5,
    exploration: 0.5,
    preferred_modes: [],
    session: {
      avg_duration_minutes: 60,
      preferred_time: 'evening',
      frequency: 'casual'
    }
  }
}

export function createEmptyPlatformPresence(): PlatformPresence {
  return {
    linked: [],
    primary: '',
    aggregate: {
      total_playtime_hours: 0,
      total_games_owned: 0,
      total_achievements: 0
    }
  }
}

export function createEmptyAchievementRecord(): AchievementRecord {
  return {
    notable: [],
    stats: [],
    trophy_summary: {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0
    }
  }
}

export function createEmptySocialGraph(): SocialGraph {
  return {
    friends: [],
    affiliations: [],
    preferences: {
      play_with_friends: true,
      open_to_group_invites: true,
      voice_chat: 'friends_only'
    }
  }
}

export function createEmptySkillProfile(): SkillProfile {
  return {
    by_genre: [],
    rankings: [],
    performance: {
      total_matches: 0,
      win_rate: 0,
      kda_ratio: undefined
    }
  }
}

/**
 * MMR thresholds for skill level determination
 */
const MMR_THRESHOLDS = {
  beginner: 0,
  intermediate: 1000,
  advanced: 2000,
  expert: 3000,
  professional: 4000
} as const

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'professional'

/**
 * Convert MMR to skill level based on thresholds
 */
export function mmrToSkillLevel(mmr: number): SkillLevel {
  if (mmr >= MMR_THRESHOLDS.professional) return 'professional'
  if (mmr >= MMR_THRESHOLDS.expert) return 'expert'
  if (mmr >= MMR_THRESHOLDS.advanced) return 'advanced'
  if (mmr >= MMR_THRESHOLDS.intermediate) return 'intermediate'
  return 'beginner'
}

/**
 * Calculate win rate from wins and losses
 * Returns a value between 0 and 1
 */
export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses
  if (total === 0) return 0
  return wins / total
}
