/**
 * IdiomarkG Activity Processor
 *
 * Processes activity events and incrementally updates IdiomarkG profiles.
 * Inspired by game AI patterns for incremental state updates.
 *
 * @module activity-processor
 */

import type { IdiomarkGGaming, GameGenre } from './types-idiomarkg'
import type { IdiomarkGActivityEvent } from './types-activity'

// ============================================================================
// GENRE CATEGORIES FOR BEHAVIOR INFERENCE
// ============================================================================

/**
 * Genres considered primarily competitive
 */
const COMPETITIVE_GENRES: ReadonlySet<string> = new Set([
  'fps',
  'moba',
  'battle_royale',
  'sports',
  'racing'
])

/**
 * Genres considered primarily cooperative
 */
const COOPERATIVE_GENRES: ReadonlySet<string> = new Set([
  'mmo',
  'strategy',
  'puzzle'
])

/**
 * Genres associated with exploration
 */
const EXPLORATION_GENRES: ReadonlySet<string> = new Set([
  'rpg',
  'sandbox',
  'mmo'
])

// ============================================================================
// PROCESSOR CONFIGURATION
// ============================================================================

/**
 * Configuration for activity processing
 */
export interface ActivityProcessorConfig {
  /**
   * How much each event affects personality scores (0-1)
   * Lower = slower adaptation, Higher = faster adaptation
   */
  adaptationRate: number

  /**
   * Maximum change per event (capped)
   */
  maxDeltaPerEvent: number

  /**
   * Whether to apply decay to older traits
   */
  enableDecay: boolean

  /**
   * Decay factor per event (0-1)
   * Only applies if enableDecay is true
   */
  decayFactor: number
}

const DEFAULT_CONFIG: ActivityProcessorConfig = {
  adaptationRate: 0.01,
  maxDeltaPerEvent: 0.05,
  enableDecay: false,
  decayFactor: 0.001
}

// ============================================================================
// ACTIVITY PROCESSOR
// ============================================================================

/**
 * Processes IdiomarkG activity events and updates profiles incrementally
 *
 * Inspired by game AI patterns:
 * - Incremental state updates (not full rebuilds)
 * - Event-driven personality evolution
 * - Trend tracking over time
 */
export class IdiomarkGActivityProcessor {
  private config: ActivityProcessorConfig

  constructor(config: Partial<ActivityProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Process a single activity event and return updated profile
   */
  processEvent(
    event: IdiomarkGActivityEvent,
    currentProfile: IdiomarkGGaming
  ): IdiomarkGGaming {
    // Clone profile to avoid mutations
    const updated = JSON.parse(JSON.stringify(currentProfile)) as IdiomarkGGaming

    switch (event.verb) {
      case 'game_played':
        this.processGamePlayed(event, updated)
        break
      case 'match_completed':
        this.processMatchCompleted(event, updated)
        break
      case 'achievement_unlocked':
        this.processAchievementUnlocked(event, updated)
        break
      case 'rank_changed':
        this.processRankChanged(event, updated)
        break
      case 'friend_added':
        this.processFriendAdded(event, updated)
        break
      default:
        // Unknown event type, no changes
        break
    }

    return updated
  }

  /**
   * Process multiple events in sequence
   */
  processEvents(
    events: IdiomarkGActivityEvent[],
    initialProfile: IdiomarkGGaming
  ): IdiomarkGGaming {
    // Sort by timestamp (oldest first)
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)

    return sorted.reduce(
      (profile, event) => this.processEvent(event, profile),
      initialProfile
    )
  }

  // ============================================================================
  // PRIVATE EVENT PROCESSORS
  // ============================================================================

  private processGamePlayed(event: IdiomarkGActivityEvent, profile: IdiomarkGGaming): void {
    const genre = event.context?.genre as GameGenre | undefined
    if (!genre) return

    // Update competition based on genre
    if (COMPETITIVE_GENRES.has(genre)) {
      const delta = this.calculateDelta(profile.play_style.competition, 0.8)
      profile.play_style.competition = this.clamp(
        profile.play_style.competition + delta
      )
    }

    // Update cooperation based on genre
    if (COOPERATIVE_GENRES.has(genre)) {
      const delta = this.calculateDelta(profile.play_style.cooperation, 0.7)
      profile.play_style.cooperation = this.clamp(
        profile.play_style.cooperation + delta
      )
    }

    // Update exploration based on genre
    if (EXPLORATION_GENRES.has(genre)) {
      const delta = this.calculateDelta(profile.play_style.exploration, 0.6)
      profile.play_style.exploration = this.clamp(
        profile.play_style.exploration + delta
      )
    }
  }

  private processMatchCompleted(event: IdiomarkGActivityEvent, profile: IdiomarkGGaming): void {
    const result = event.context?.match_result
    if (!result) return

    // Win increases competition desire, loss may decrease or increase (grinding)
    if (result === 'win') {
      const delta = this.calculateDelta(profile.play_style.competition, 0.85)
      profile.play_style.competition = this.clamp(
        profile.play_style.competition + delta
      )

      // Also slightly increase win rate
      if (profile.skill_profile.performance) {
        const currentWinRate = profile.skill_profile.performance.win_rate
        profile.skill_profile.performance.win_rate = Math.min(1, currentWinRate + 0.001)
      }
    } else if (result === 'loss') {
      // Loss might decrease competition or increase it (determination)
      // We'll make it neutral to avoid over-correction
    }
  }

  private processAchievementUnlocked(event: IdiomarkGActivityEvent, profile: IdiomarkGGaming): void {
    const achievement = event.context?.achievement
    if (!achievement) return

    // Add to notable achievements if rare enough
    if (achievement.rarity !== undefined && achievement.rarity < 0.1) {
      const newAchievement = {
        platform: 'activity' as const,
        game: event.context?.game_id || 'unknown',
        achievement_id: achievement.id,
        name: achievement.name || achievement.id,
        description: '',
        rarity: achievement.rarity,
        unlocked_at: new Date().toISOString()
      }

      // Avoid duplicates
      const exists = profile.achievements.notable.some(
        a => a.achievement_id === achievement.id
      )

      if (!exists) {
        profile.achievements.notable.push(newAchievement)

        // Keep only top 20 by rarity
        profile.achievements.notable.sort((a, b) => a.rarity - b.rarity)
        if (profile.achievements.notable.length > 20) {
          profile.achievements.notable = profile.achievements.notable.slice(0, 20)
        }
      }
    }

    // Increment achievement count
    profile.achievements.stats.forEach(stat => {
      stat.unlocked += 1
      if (stat.total > 0) {
        stat.completion_rate = Math.min(1, stat.unlocked / stat.total)
      }
    })
  }

  private processRankChanged(event: IdiomarkGActivityEvent, profile: IdiomarkGGaming): void {
    const rankChange = event.context?.rank_change
    if (!rankChange) return

    const gameId = event.context?.game_id || 'unknown'

    // Find or create ranking entry
    let ranking = profile.skill_profile.rankings.find(r => r.game === gameId)

    if (!ranking) {
      ranking = {
        platform: 'activity' as const,
        game: gameId,
        rank: rankChange.to,
        tier: undefined,
        percentile: undefined
      }
      profile.skill_profile.rankings.push(ranking)
    } else {
      ranking.rank = rankChange.to
    }

    // Could infer tier from rank string here if needed
  }

  private processFriendAdded(event: IdiomarkGActivityEvent, profile: IdiomarkGGaming): void {
    // Update social preferences
    const currentFriends = profile.social.friends.reduce(
      (sum, f) => sum + f.friend_count,
      0
    )

    // If user has many friends, they're likely more social
    if (currentFriends > 10) {
      profile.social.preferences.play_with_friends = true
    }
    if (currentFriends > 50) {
      profile.social.preferences.open_to_group_invites = true
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Calculate the delta to apply based on current value and target
   */
  private calculateDelta(current: number, target: number): number {
    const diff = target - current
    let delta = diff * this.config.adaptationRate

    // Cap the delta
    delta = Math.max(-this.config.maxDeltaPerEvent, Math.min(this.config.maxDeltaPerEvent, delta))

    return delta
  }

  /**
   * Clamp a value to 0-1 range
   */
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value))
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const idiomarkgActivityProcessor = new IdiomarkGActivityProcessor()
