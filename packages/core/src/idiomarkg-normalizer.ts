/**
 * IdiomarkG Normalizer
 *
 * Converts raw platform data into unified IdiomarkG schema format.
 * Transforms data from Steam, Xbox, Epic, etc. into standardized IdiomarkG profiles.
 */

import {
  GamingPlatform,
  GameGenre,
  PlayStyle,
  PlayStyleArchetype,
  GameMode,
  PlatformPresence,
  AchievementRecord,
  SocialGraph,
  SkillProfile,
  IdiomarkGGaming,
  IdiomarkGFile,
  mmrToSkillLevel,
  calculateWinRate,
  createEmptyPlayStyle,
  createEmptyPlatformPresence,
  createEmptyAchievementRecord,
  createEmptySocialGraph,
  createEmptySkillProfile
} from './types-idiomarkg'

// ============================================================================
// RAW DATA INTERFACES
// ============================================================================

/**
 * Raw game data from a gaming platform adapter
 */
export interface RawGameData {
  app_id: string
  name: string
  playtime_minutes: number
  genres?: string[]
}

/**
 * Raw achievement data from a gaming platform adapter
 */
export interface RawAchievementData {
  app_id: string
  achievement_id: string
  name: string
  description?: string
  rarity?: number
  unlocked_at?: string
}

/**
 * Raw ranking data from a gaming platform adapter
 */
export interface RawRankingData {
  game: string
  rank?: string
  tier?: string
  mmr?: number
  percentile?: number
}

/**
 * Raw performance stats from a gaming platform adapter
 */
export interface RawPerformanceData {
  wins?: number
  losses?: number
  kills?: number
  deaths?: number
  assists?: number
}

/**
 * Raw stats summary from a gaming platform adapter
 */
export interface RawStatsData {
  total_achievements?: number
  total_games?: number
  total_playtime_minutes?: number
  trophy_counts?: {
    bronze?: number
    silver?: number
    gold?: number
    platinum?: number
  }
}

/**
 * Raw friends data from a gaming platform adapter
 */
export interface RawFriendsData {
  count: number
}

/**
 * Raw platform data from a gaming platform adapter
 */
export interface RawPlatformData {
  platform: GamingPlatform
  account_id: string
  display_name: string
  verified: boolean
  games?: RawGameData[]
  achievements?: RawAchievementData[]
  stats?: RawStatsData
  friends?: RawFriendsData
  rankings?: RawRankingData[]
  performance?: RawPerformanceData
}

/**
 * Aggregated platform data from multiple sources
 */
export interface AggregatedPlatformData {
  platforms: RawPlatformData[]
}

/**
 * Personality data for IdiomarkG file creation (placeholder for Idiomark personality)
 */
export interface PersonalityData {
  traits?: Record<string, number>
  preferences?: Record<string, unknown>
}

// ============================================================================
// GENRE MAPPING HELPERS
// ============================================================================

/**
 * Mapping of various genre names to standardized GameGenre
 */
const GENRE_MAPPINGS: Record<string, GameGenre> = {
  // FPS
  'fps': 'fps',
  'first-person shooter': 'fps',
  'first person shooter': 'fps',
  'shooter': 'fps',

  // MOBA
  'moba': 'moba',
  'multiplayer online battle arena': 'moba',
  'arts': 'moba', // Action RTS
  'action rts': 'moba',

  // RPG
  'rpg': 'rpg',
  'role-playing game': 'rpg',
  'role playing game': 'rpg',
  'role-playing': 'rpg',
  'jrpg': 'rpg',

  // Strategy
  'strategy': 'strategy',
  'rts': 'strategy',
  'real-time strategy': 'strategy',
  'turn-based strategy': 'strategy',
  'turn based strategy': 'strategy',
  '4x': 'strategy',
  'grand strategy': 'strategy',

  // Sports
  'sports': 'sports',
  'sport': 'sports',
  'football': 'sports',
  'soccer': 'sports',
  'basketball': 'sports',
  'hockey': 'sports',
  'baseball': 'sports',

  // Racing
  'racing': 'racing',
  'driving': 'racing',
  'car game': 'racing',

  // Puzzle
  'puzzle': 'puzzle',
  'logic': 'puzzle',
  'match-3': 'puzzle',
  'match three': 'puzzle',

  // Sandbox
  'sandbox': 'sandbox',
  'creative': 'sandbox',
  'building': 'sandbox',
  'simulation': 'sandbox',
  'sim': 'sandbox',

  // MMO
  'mmo': 'mmo',
  'mmorpg': 'mmo',
  'massively multiplayer': 'mmo',

  // Battle Royale
  'battle_royale': 'battle_royale',
  'battle royale': 'battle_royale',
  'br': 'battle_royale',
  'last man standing': 'battle_royale'
}

/**
 * Genres considered primarily competitive
 */
const COMPETITIVE_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'fps',
  'moba',
  'battle_royale',
  'sports',
  'racing'
])

/**
 * Genres considered primarily cooperative
 */
const COOPERATIVE_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'mmo',
  'strategy'
])

/**
 * Genres associated with exploration play style
 */
const EXPLORATION_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'rpg',
  'sandbox',
  'mmo'
])

/**
 * Genres associated with builder play style
 */
const BUILDER_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'sandbox',
  'strategy'
])

/**
 * Genres associated with fighter play style
 */
const FIGHTER_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'fps',
  'moba',
  'battle_royale',
  'sports',
  'racing'
])

/**
 * Genres associated with social play style
 */
const SOCIAL_GENRES: ReadonlySet<GameGenre> = new Set<GameGenre>([
  'mmo',
  'puzzle'
])

/**
 * Game name keywords to infer genre when not provided
 */
const GAME_NAME_GENRE_KEYWORDS: Record<string, GameGenre> = {
  // FPS games
  'counter-strike': 'fps',
  'counter strike': 'fps',
  'cs2': 'fps',
  'csgo': 'fps',
  'call of duty': 'fps',
  'cod': 'fps',
  'valorant': 'fps',
  'overwatch': 'fps',
  'apex': 'fps',
  'rainbow six': 'fps',
  'battlefield': 'fps',
  'doom': 'fps',
  'halo': 'fps',
  'destiny': 'fps',

  // MOBA games
  'league of legends': 'moba',
  'lol': 'moba',
  'dota': 'moba',
  'smite': 'moba',
  'heroes of the storm': 'moba',

  // Battle Royale
  'fortnite': 'battle_royale',
  'pubg': 'battle_royale',
  'warzone': 'battle_royale',
  'apex legends': 'battle_royale',

  // RPG
  'skyrim': 'rpg',
  'witcher': 'rpg',
  'elden ring': 'rpg',
  'dark souls': 'rpg',
  'final fantasy': 'rpg',
  'mass effect': 'rpg',
  'dragon age': 'rpg',
  'cyberpunk': 'rpg',
  'baldur': 'rpg',

  // Strategy
  'civilization': 'strategy',
  'starcraft': 'strategy',
  'age of empires': 'strategy',
  'total war': 'strategy',
  'crusader kings': 'strategy',
  'europa universalis': 'strategy',
  'xcom': 'strategy',

  // MMO
  'world of warcraft': 'mmo',
  'wow': 'mmo',
  'final fantasy xiv': 'mmo',
  'ffxiv': 'mmo',
  'guild wars': 'mmo',
  'eso': 'mmo',
  'elder scrolls online': 'mmo',
  'runescape': 'mmo',
  'black desert': 'mmo',
  'eve online': 'mmo',

  // Sandbox
  'minecraft': 'sandbox',
  'terraria': 'sandbox',
  'roblox': 'sandbox',
  'garry': 'sandbox',
  'gmod': 'sandbox',
  'factorio': 'sandbox',
  'satisfactory': 'sandbox',
  'cities: skylines': 'sandbox',
  'the sims': 'sandbox',
  'animal crossing': 'sandbox',
  'stardew valley': 'sandbox',

  // Sports
  'fifa': 'sports',
  'madden': 'sports',
  'nba 2k': 'sports',
  'mlb the show': 'sports',
  'nhl': 'sports',
  'rocket league': 'sports',

  // Racing
  'forza': 'racing',
  'gran turismo': 'racing',
  'need for speed': 'racing',
  'mario kart': 'racing',
  'dirt': 'racing',

  // Puzzle
  'tetris': 'puzzle',
  'portal': 'puzzle',
  'candy crush': 'puzzle',
  'among us': 'puzzle'
}

// ============================================================================
// IdiomarkG NORMALIZER CLASS
// ============================================================================

/**
 * IdiomarkG Normalizer
 *
 * Transforms raw platform data into standardized IdiomarkG gaming profiles.
 */
export class IdiomarkGNormalizer {
  // -------------------------------------------------------------------------
  // PUBLIC METHODS
  // -------------------------------------------------------------------------

  /**
   * Main entry point - normalize aggregated platform data into IdiomarkGGaming
   */
  normalize(aggregated: AggregatedPlatformData): IdiomarkGGaming {
    return {
      play_style: this.inferPlayStyle(aggregated),
      platforms: this.normalizePlatforms(aggregated),
      achievements: this.normalizeAchievements(aggregated),
      social: this.normalizeSocial(aggregated),
      skill_profile: this.inferSkillProfile(aggregated)
    }
  }

  /**
   * Create a complete IdiomarkG file with personality data
   */
  createIdiomarkGFile(
    aggregated: AggregatedPlatformData,
    personality: PersonalityData
  ): IdiomarkGFile {
    return {
      idiomark: '1.0.0',
      personality,
      extensions: {
        idiomarkg: {
          version: '1.0.0',
          gaming: this.normalize(aggregated)
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // PLAY STYLE INFERENCE
  // -------------------------------------------------------------------------

  /**
   * Infer play style from aggregated game data
   */
  private inferPlayStyle(aggregated: AggregatedPlatformData): PlayStyle {
    const allGames = this.getAllGames(aggregated)
    const totalPlaytime = allGames.reduce((sum, g) => sum + g.playtime_minutes, 0)

    if (allGames.length === 0 || totalPlaytime === 0) {
      return createEmptyPlayStyle()
    }

    // Get unique genres with normalized forms
    const genrePlaytime = this.calculateGenrePlaytime(allGames)
    const uniqueGenres = new Set(genrePlaytime.keys())

    // Calculate archetype scores
    const archetypes = this.inferArchetypes(genrePlaytime, totalPlaytime)

    // Calculate competition and cooperation scores
    const competition = this.calculateCompetitionScore(genrePlaytime, totalPlaytime)
    const cooperation = this.calculateCooperationScore(genrePlaytime, totalPlaytime)

    // Calculate exploration score (based on genre diversity)
    const exploration = Math.min(1, uniqueGenres.size / 5)

    // Infer preferred modes
    const preferredModes = this.inferPreferredModes(competition, cooperation)

    // Infer session preferences
    const session = this.inferSessionPreferences(allGames, totalPlaytime)

    return {
      archetype: archetypes,
      competition,
      cooperation,
      exploration,
      preferred_modes: preferredModes,
      session
    }
  }

  /**
   * Calculate playtime per genre
   */
  private calculateGenrePlaytime(games: RawGameData[]): Map<GameGenre, number> {
    const genrePlaytime = new Map<GameGenre, number>()

    for (const game of games) {
      const genres = game.genres?.map(g => this.normalizeGenre(g)).filter((g): g is GameGenre => g !== null) ??
        [this.inferGameGenre(game.name)].filter((g): g is GameGenre => g !== null)

      for (const genre of genres) {
        const current = genrePlaytime.get(genre) ?? 0
        genrePlaytime.set(genre, current + game.playtime_minutes)
      }
    }

    return genrePlaytime
  }

  /**
   * Helper to iterate over Map entries safely
   */
  private mapEntries<K, V>(map: Map<K, V>): Array<[K, V]> {
    return Array.from(map.entries())
  }

  /**
   * Infer play style archetypes from genre playtime
   */
  private inferArchetypes(
    genrePlaytime: Map<GameGenre, number>,
    totalPlaytime: number
  ): PlayStyleArchetype[] {
    const archetypeScores: Map<PlayStyleArchetype, number> = new Map()

    for (const [genre, playtime] of this.mapEntries(genrePlaytime)) {
      const ratio = playtime / totalPlaytime

      if (BUILDER_GENRES.has(genre)) {
        archetypeScores.set('builder', (archetypeScores.get('builder') ?? 0) + ratio)
      }
      if (FIGHTER_GENRES.has(genre)) {
        archetypeScores.set('fighter', (archetypeScores.get('fighter') ?? 0) + ratio)
      }
      if (EXPLORATION_GENRES.has(genre)) {
        archetypeScores.set('explorer', (archetypeScores.get('explorer') ?? 0) + ratio)
      }
      if (SOCIAL_GENRES.has(genre)) {
        archetypeScores.set('social', (archetypeScores.get('social') ?? 0) + ratio)
      }
    }

    // Return archetypes with score >= 0.2, sorted by score descending
    return this.mapEntries(archetypeScores)
      .filter(([_, score]) => score >= 0.2)
      .sort((a, b) => b[1] - a[1])
      .map(([archetype]) => archetype)
  }

  /**
   * Calculate competition score from competitive genre playtime
   */
  private calculateCompetitionScore(
    genrePlaytime: Map<GameGenre, number>,
    totalPlaytime: number
  ): number {
    let competitivePlaytime = 0

    for (const [genre, playtime] of this.mapEntries(genrePlaytime)) {
      if (COMPETITIVE_GENRES.has(genre)) {
        competitivePlaytime += playtime
      }
    }

    return totalPlaytime > 0 ? Math.min(1, competitivePlaytime / totalPlaytime) : 0.5
  }

  /**
   * Calculate cooperation score from cooperative genre playtime
   */
  private calculateCooperationScore(
    genrePlaytime: Map<GameGenre, number>,
    totalPlaytime: number
  ): number {
    let cooperativePlaytime = 0

    for (const [genre, playtime] of this.mapEntries(genrePlaytime)) {
      if (COOPERATIVE_GENRES.has(genre)) {
        cooperativePlaytime += playtime
      }
    }

    return totalPlaytime > 0 ? Math.min(1, cooperativePlaytime / totalPlaytime) : 0.5
  }

  /**
   * Infer preferred game modes from competition/cooperation ratios
   */
  private inferPreferredModes(competition: number, cooperation: number): GameMode[] {
    const modes: GameMode[] = []

    if (competition > 0.3) {
      modes.push('competitive')
    }
    if (cooperation > 0.3) {
      modes.push('cooperative')
    }
    if (competition < 0.3 && cooperation < 0.3) {
      modes.push('casual')
    }
    if (competition < 0.5 && cooperation < 0.5) {
      modes.push('solo')
    }

    // Ensure at least one mode
    if (modes.length === 0) {
      modes.push('casual')
    }

    return modes
  }

  /**
   * Infer session preferences from game data
   */
  private inferSessionPreferences(
    games: RawGameData[],
    _totalPlaytime: number
  ): PlayStyle['session'] {
    // Calculate average session duration (rough estimate based on game types)
    const avgDuration = games.length > 0
      ? games.reduce((sum, g) => sum + g.playtime_minutes, 0) / games.length
      : 60

    // Clamp to reasonable session durations
    const avgDurationMinutes = Math.max(15, Math.min(240, avgDuration))

    // Infer frequency from game count
    const gameCount = games.length
    const frequency: PlayStyle['session']['frequency'] =
      gameCount > 20 ? 'daily' :
      gameCount > 10 ? 'few_times_week' :
      gameCount > 5 ? 'weekly' : 'casual'

    // Default preferred time to evening (most common)
    return {
      avg_duration_minutes: avgDurationMinutes,
      preferred_time: 'evening',
      frequency
    }
  }

  // -------------------------------------------------------------------------
  // PLATFORM NORMALIZATION
  // -------------------------------------------------------------------------

  /**
   * Normalize platform presence data
   */
  private normalizePlatforms(aggregated: AggregatedPlatformData): PlatformPresence {
    if (aggregated.platforms.length === 0) {
      return createEmptyPlatformPresence()
    }

    const linked = aggregated.platforms.map(p => ({
      platform: p.platform,
      account_id: p.account_id,
      display_name: p.display_name,
      verified: p.verified,
      last_sync: new Date().toISOString()
    }))

    // Calculate aggregate stats
    let totalPlaytimeMinutes = 0
    let totalGames = 0
    let totalAchievements = 0

    for (const platform of aggregated.platforms) {
      totalPlaytimeMinutes += platform.stats?.total_playtime_minutes ??
        platform.games?.reduce((sum, g) => sum + g.playtime_minutes, 0) ?? 0
      totalGames += platform.stats?.total_games ?? platform.games?.length ?? 0
      totalAchievements += platform.stats?.total_achievements ?? platform.achievements?.length ?? 0
    }

    // Determine primary platform (most playtime)
    let primaryPlatform = linked[0]?.platform ?? ''
    let maxPlaytime = 0

    for (const platform of aggregated.platforms) {
      const playtime = platform.stats?.total_playtime_minutes ??
        platform.games?.reduce((sum, g) => sum + g.playtime_minutes, 0) ?? 0

      if (playtime > maxPlaytime) {
        maxPlaytime = playtime
        primaryPlatform = platform.platform
      }
    }

    return {
      linked,
      primary: primaryPlatform,
      aggregate: {
        total_playtime_hours: Math.round(totalPlaytimeMinutes / 60 * 10) / 10,
        total_games_owned: totalGames,
        total_achievements: totalAchievements
      }
    }
  }

  // -------------------------------------------------------------------------
  // ACHIEVEMENT NORMALIZATION
  // -------------------------------------------------------------------------

  /**
   * Normalize achievement data
   */
  private normalizeAchievements(aggregated: AggregatedPlatformData): AchievementRecord {
    if (aggregated.platforms.length === 0) {
      return createEmptyAchievementRecord()
    }

    // Collect all achievements with their platforms
    const allAchievements: Array<{
      platform: GamingPlatform
      game: string
      achievement: RawAchievementData
    }> = []

    for (const platform of aggregated.platforms) {
      if (!platform.achievements) continue

      // Create game lookup map
      const gameMap = new Map<string, string>()
      for (const game of platform.games ?? []) {
        gameMap.set(game.app_id, game.name)
      }

      for (const achievement of platform.achievements) {
        const gameName = gameMap.get(achievement.app_id) ?? achievement.app_id
        allAchievements.push({
          platform: platform.platform,
          game: gameName,
          achievement
        })
      }
    }

    // Filter to notable achievements (rarity < 0.1)
    const notableAchievements = allAchievements
      .filter(item => {
        const rarity = item.achievement.rarity
        return rarity !== undefined && rarity < 0.1
      })
      .sort((a, b) => (a.achievement.rarity ?? 1) - (b.achievement.rarity ?? 1))
      .slice(0, 20)
      .map(item => ({
        platform: item.platform,
        game: item.game,
        achievement_id: item.achievement.achievement_id,
        name: item.achievement.name,
        description: item.achievement.description ?? '',
        rarity: item.achievement.rarity ?? 1,
        unlocked_at: item.achievement.unlocked_at ?? new Date().toISOString()
      }))

    // Build stats per platform
    const stats = aggregated.platforms.map(platform => {
      const total = platform.stats?.total_achievements ?? platform.achievements?.length ?? 0
      const unlocked = platform.achievements?.length ?? 0

      return {
        platform: platform.platform,
        total,
        unlocked,
        completion_rate: total > 0 ? unlocked / total : 0
      }
    })

    // Build trophy summary if available
    let trophySummary: AchievementRecord['trophy_summary'] | undefined

    for (const platform of aggregated.platforms) {
      if (platform.stats?.trophy_counts) {
        const { bronze = 0, silver = 0, gold = 0, platinum = 0 } = platform.stats.trophy_counts

        if (!trophySummary) {
          trophySummary = { bronze: 0, silver: 0, gold: 0, platinum: 0 }
        }

        trophySummary.bronze += bronze
        trophySummary.silver += silver
        trophySummary.gold += gold
        trophySummary.platinum += platinum
      }
    }

    return {
      notable: notableAchievements,
      stats,
      trophy_summary: trophySummary
    }
  }

  // -------------------------------------------------------------------------
  // SOCIAL NORMALIZATION
  // -------------------------------------------------------------------------

  /**
   * Normalize social graph data
   */
  private normalizeSocial(aggregated: AggregatedPlatformData): SocialGraph {
    if (aggregated.platforms.length === 0) {
      return createEmptySocialGraph()
    }

    // Collect friend counts per platform
    const friends = aggregated.platforms
      .filter(p => p.friends && p.friends.count > 0)
      .map(p => ({
        platform: p.platform,
        friend_count: p.friends!.count
      }))

    // Calculate average friend count to determine social preferences
    const totalFriends = friends.reduce((sum, f) => sum + f.friend_count, 0)
    const avgFriends = friends.length > 0 ? totalFriends / friends.length : 0

    // Infer social preferences from friend counts
    const playWithFriends = avgFriends > 5
    const openToGroupInvites = avgFriends > 10
    const voiceChat: SocialGraph['preferences']['voice_chat'] =
      avgFriends > 20 ? 'always' :
      avgFriends > 5 ? 'friends_only' : 'never'

    return {
      friends,
      affiliations: [], // No affiliation data in raw input currently
      preferences: {
        play_with_friends: playWithFriends,
        open_to_group_invites: openToGroupInvites,
        voice_chat: voiceChat
      }
    }
  }

  // -------------------------------------------------------------------------
  // SKILL PROFILE INFERENCE
  // -------------------------------------------------------------------------

  /**
   * Infer skill profile from aggregated data
   */
  private inferSkillProfile(aggregated: AggregatedPlatformData): SkillProfile {
    if (aggregated.platforms.length === 0) {
      return createEmptySkillProfile()
    }

    // Build by_genre skill data
    const genreHours = new Map<GameGenre, number>()
    const genreMMR = new Map<GameGenre, number[]>()

    const allGames = this.getAllGames(aggregated)

    for (const game of allGames) {
      const genres = game.genres?.map(g => this.normalizeGenre(g)).filter((g): g is GameGenre => g !== null) ??
        [this.inferGameGenre(game.name)].filter((g): g is GameGenre => g !== null)

      const hours = game.playtime_minutes / 60

      for (const genre of genres) {
        genreHours.set(genre, (genreHours.get(genre) ?? 0) + hours)
      }
    }

    // Collect rankings and MMR per genre
    for (const platform of aggregated.platforms) {
      for (const ranking of platform.rankings ?? []) {
        const genre = this.inferGameGenre(ranking.game)
        if (genre && ranking.mmr) {
          if (!genreMMR.has(genre)) {
            genreMMR.set(genre, [])
          }
          genreMMR.get(genre)!.push(ranking.mmr)
        }
      }
    }

    // Build by_genre array
    const byGenre = Array.from(genreHours.entries()).map(([genre, hours]) => {
      const mmrs = genreMMR.get(genre) ?? []
      const avgMMR = mmrs.length > 0
        ? mmrs.reduce((sum, m) => sum + m, 0) / mmrs.length
        : undefined

      const skillLevel = this.inferSkillLevel(avgMMR, hours)

      return {
        genre: [genre],
        estimated_mmr: avgMMR ? Math.round(avgMMR) : undefined,
        skill_level: skillLevel,
        hours_played: Math.round(hours)
      }
    })

    // Collect rankings
    const rankings = aggregated.platforms.flatMap(platform =>
      (platform.rankings ?? []).map(ranking => ({
        platform: platform.platform,
        game: ranking.game,
        rank: ranking.rank,
        tier: ranking.tier,
        percentile: ranking.percentile
      }))
    )

    // Aggregate performance stats
    let totalWins = 0
    let totalLosses = 0
    let totalKills = 0
    let totalDeaths = 0
    let totalAssists = 0

    for (const platform of aggregated.platforms) {
      if (platform.performance) {
        totalWins += platform.performance.wins ?? 0
        totalLosses += platform.performance.losses ?? 0
        totalKills += platform.performance.kills ?? 0
        totalDeaths += platform.performance.deaths ?? 0
        totalAssists += platform.performance.assists ?? 0
      }
    }

    const totalMatches = totalWins + totalLosses
    const winRate = calculateWinRate(totalWins, totalLosses)
    const kda = totalDeaths > 0
      ? (totalKills + totalAssists) / totalDeaths
      : undefined

    return {
      by_genre: byGenre,
      rankings,
      performance: {
        total_matches: totalMatches,
        win_rate: winRate,
        kda_ratio: kda
      }
    }
  }

  /**
   * Infer skill level from MMR or hours played
   */
  private inferSkillLevel(
    mmr: number | undefined,
    hoursPlayed: number
  ): SkillProfile['by_genre'][0]['skill_level'] {
    if (mmr !== undefined) {
      return mmrToSkillLevel(mmr)
    }

    // Fallback to hours-based estimation
    if (hoursPlayed >= 1000) return 'expert'
    if (hoursPlayed >= 500) return 'advanced'
    if (hoursPlayed >= 100) return 'intermediate'
    return 'beginner'
  }

  // -------------------------------------------------------------------------
  // GENRE HELPERS
  // -------------------------------------------------------------------------

  /**
   * Normalize a genre string to a standard GameGenre
   */
  normalizeGenre(genre: string): GameGenre | null {
    const normalized = genre.toLowerCase().trim()
    return GENRE_MAPPINGS[normalized] ?? null
  }

  /**
   * Infer game genre from game name
   */
  inferGameGenre(gameName: string): GameGenre | null {
    const normalizedName = gameName.toLowerCase()

    for (const [keyword, genre] of Object.entries(GAME_NAME_GENRE_KEYWORDS)) {
      if (normalizedName.includes(keyword)) {
        return genre
      }
    }

    return null
  }

  /**
   * Check if a genre is primarily competitive
   */
  isCompetitiveGenre(genre: string): boolean {
    const normalized = this.normalizeGenre(genre)
    return normalized !== null && COMPETITIVE_GENRES.has(normalized)
  }

  /**
   * Check if a genre is primarily cooperative
   */
  isCooperativeGenre(genre: string): boolean {
    const normalized = this.normalizeGenre(genre)
    return normalized !== null && COOPERATIVE_GENRES.has(normalized)
  }

  // -------------------------------------------------------------------------
  // UTILITY METHODS
  // -------------------------------------------------------------------------

  /**
   * Get all games from all platforms
   */
  private getAllGames(aggregated: AggregatedPlatformData): RawGameData[] {
    return aggregated.platforms.flatMap(p => p.games ?? [])
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const idiomarkgNormalizer = new IdiomarkGNormalizer()
