/**
 * Anticipatory Service Layer
 *
 * Predicts user needs before explicit request based on patterns and context.
 * Integrates with behavioral pattern detection from Phase 3.
 */

import type { BehavioralEvent, PatternMatch } from '../types-behavioral';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input context for analysis
 */
export interface ContextInput {
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  day_of_week?: string;
  location?: string;
  recent_events?: BehavioralEvent[];
  [key: string]: unknown;
}

/**
 * Analyzed context
 */
export interface AnalyzedContext {
  time_context: string[];
  location_context: string;
  location_type: 'commercial' | 'residential' | 'transit' | 'unknown';
  activity_hints: string[];
}

/**
 * Prediction context
 */
export interface PredictionContext {
  human_idiomark_id: string;
  current_context: ContextInput;
  behavioral_history: BehavioralEvent[];
  detected_patterns?: PatternMatch[];
}

/**
 * Single prediction
 */
export interface Prediction {
  field: string;
  predicted_value: unknown;
  confidence: number;
  source_pattern: string;
}

/**
 * Anticipated need
 */
export interface AnticipatedNeed {
  need_type: string;
  likelihood: number;
  confidence: number;
  recommended_actions: RecommendedAction[];
  reasoning: string;
  expires_at?: string;
}

/**
 * Recommended action
 */
export interface RecommendedAction {
  action_type: string;
  robot_type?: string;
  parameters?: Record<string, unknown>;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// CONTEXT ANALYZER
// ============================================================================

/**
 * Analyzes current context to understand user situation
 */
export class ContextAnalyzer {
  private commercialLocations = [
    'restaurant', 'coffee_shop', 'store', 'mall', 'office', 'hospital', 'bank'
  ];
  private residentialLocations = ['home', 'apartment', 'house'];

  /**
   * Analyze context input
   */
  analyze(input: ContextInput): AnalyzedContext {
    const timeContext = this.analyzeTime(input);
    const locationContext = this.analyzeLocation(input);
    const locationType = this.determineLocationType(input.location);
    const activityHints = this.inferActivities(input, locationType);

    return {
      time_context: timeContext,
      location_context: locationContext,
      location_type: locationType,
      activity_hints: activityHints
    };
  }

  private analyzeTime(input: ContextInput): string[] {
    const contexts: string[] = [];

    if (input.time_of_day) {
      contexts.push(input.time_of_day);
    }

    if (input.day_of_week) {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const weekends = ['saturday', 'sunday'];

      if (weekdays.includes(input.day_of_week.toLowerCase())) {
        contexts.push('weekday');
      } else if (weekends.includes(input.day_of_week.toLowerCase())) {
        contexts.push('weekend');
      }
    }

    return contexts;
  }

  private analyzeLocation(input: ContextInput): string {
    return input.location || 'unknown';
  }

  private determineLocationType(location?: string): AnalyzedContext['location_type'] {
    if (!location) return 'unknown';

    const loc = location.toLowerCase();

    if (this.commercialLocations.some(l => loc.includes(l))) {
      return 'commercial';
    }

    if (this.residentialLocations.some(l => loc.includes(l))) {
      return 'residential';
    }

    if (['car', 'train', 'bus', 'airport', 'station'].some(l => loc.includes(l))) {
      return 'transit';
    }

    return 'unknown';
  }

  private inferActivities(input: ContextInput, locationType: string): string[] {
    const activities: string[] = [];

    // Infer from location
    if (input.location) {
      const loc = input.location.toLowerCase();
      if (loc.includes('coffee')) activities.push('caffeine');
      if (loc.includes('restaurant') || loc.includes('food')) activities.push('dining');
      if (loc.includes('gym')) activities.push('exercise');
      if (loc.includes('office')) activities.push('work');
    }

    // Infer from time
    if (input.time_of_day === 'morning') {
      activities.push('breakfast', 'coffee');
    } else if (input.time_of_day === 'afternoon') {
      activities.push('lunch');
    } else if (input.time_of_day === 'evening') {
      activities.push('dinner', 'relaxation');
    }

    return [...new Set(activities)];
  }
}

// ============================================================================
// PREFERENCE PREDICTOR
// ============================================================================

/**
 * Predicts preferences from detected patterns
 */
export class PreferencePredictor {
  /**
   * Predict preferences from patterns
   */
  predict(patterns: PatternMatch[]): Prediction[] {
    const predictions: Prediction[] = [];
    const fieldPredictions = new Map<string, Prediction>();

    for (const pattern of patterns) {
      const patternPredictions = this.predictFromPattern(pattern);

      for (const pred of patternPredictions) {
        const existing = fieldPredictions.get(pred.field);

        // Keep higher confidence prediction
        if (!existing || pred.confidence > existing.confidence) {
          fieldPredictions.set(pred.field, pred);
        }
      }
    }

    return Array.from(fieldPredictions.values());
  }

  private predictFromPattern(pattern: PatternMatch): Prediction[] {
    const predictions: Prediction[] = [];

    switch (pattern.pattern_type) {
      case 'time_preference':
        if (pattern.pattern_data.preferred_time) {
          predictions.push({
            field: 'preferred_time',
            predicted_value: pattern.pattern_data.preferred_time,
            confidence: pattern.confidence,
            source_pattern: pattern.pattern_id
          });
        }
        break;

      case 'interaction_style':
        if (pattern.pattern_data.preferred_style) {
          predictions.push({
            field: 'interaction_style',
            predicted_value: pattern.pattern_data.preferred_style,
            confidence: pattern.confidence,
            source_pattern: pattern.pattern_id
          });
        }
        break;

      case 'satisfaction_pattern':
        if (pattern.pattern_data.high_satisfaction_contexts) {
          predictions.push({
            field: 'preferred_contexts',
            predicted_value: pattern.pattern_data.high_satisfaction_contexts,
            confidence: pattern.confidence,
            source_pattern: pattern.pattern_id
          });
        }
        break;
    }

    return predictions;
  }
}

// ============================================================================
// ANTICIPATORY ENGINE
// ============================================================================

/**
 * Main engine for anticipating user needs
 */
export class AnticipatoryEngine {
  private contextAnalyzer: ContextAnalyzer;
  private preferencePredictor: PreferencePredictor;

  constructor() {
    this.contextAnalyzer = new ContextAnalyzer();
    this.preferencePredictor = new PreferencePredictor();
  }

  /**
   * Anticipate needs from context and history
   */
  anticipate(input: PredictionContext): AnticipatedNeed[] {
    const needs: AnticipatedNeed[] = [];

    // Analyze context
    const analyzedContext = this.contextAnalyzer.analyze(input.current_context);

    // Get predictions from detected patterns
    const predictions = input.detected_patterns
      ? this.preferencePredictor.predict(input.detected_patterns)
      : [];

    // Generate anticipations from context
    const contextNeeds = this.anticipateFromContext(analyzedContext, input.behavioral_history);
    needs.push(...contextNeeds);

    // Generate anticipations from predictions
    const predictionNeeds = this.anticipateFromPredictions(predictions);
    needs.push(...predictionNeeds);

    // Learn from behavioral history
    const historyNeeds = this.learnFromHistory(input.behavioral_history, analyzedContext);
    needs.push(...historyNeeds);

    // Deduplicate and sort by likelihood
    const uniqueNeeds = this.deduplicateNeeds(needs);
    uniqueNeeds.sort((a, b) => b.likelihood - a.likelihood);

    return uniqueNeeds;
  }

  private anticipateFromContext(
    context: AnalyzedContext,
    history: BehavioralEvent[]
  ): AnticipatedNeed[] {
    const needs: AnticipatedNeed[] = [];

    // Coffee anticipation in morning
    if (context.time_context.includes('morning')) {
      const morningCoffeeHistory = history.filter(e => {
        const hour = new Date(e.timestamp).getUTCHours();
        return hour >= 6 && hour < 12 && e.context?.location?.includes('coffee');
      });

      if (morningCoffeeHistory.length >= 3) {
        needs.push({
          need_type: 'coffee_service',
          likelihood: Math.min(0.95, 0.5 + morningCoffeeHistory.length * 0.05),
          confidence: morningCoffeeHistory.length / 10,
          recommended_actions: [
            {
              action_type: 'prepare_service',
              robot_type: 'barista',
              priority: 'high'
            }
          ],
          reasoning: `User has visited coffee shops ${morningCoffeeHistory.length} times in the morning`
        });
      }
    }

    // Dining anticipation
    if (context.activity_hints.includes('dining') || context.activity_hints.includes('lunch')) {
      needs.push({
        need_type: 'food_service',
        likelihood: 0.7,
        confidence: 0.6,
        recommended_actions: [
          {
            action_type: 'prepare_service',
            robot_type: 'waiter',
            priority: 'medium'
          }
        ],
        reasoning: 'User is in dining context during meal time'
      });
    }

    // Work context anticipation
    if (context.location_type === 'commercial' && context.time_context.includes('weekday')) {
      needs.push({
        need_type: 'assistance',
        likelihood: 0.5,
        confidence: 0.4,
        recommended_actions: [
          {
            action_type: 'standby',
            priority: 'low'
          }
        ],
        reasoning: 'User is at commercial location on weekday'
      });
    }

    return needs;
  }

  private anticipateFromPredictions(predictions: Prediction[]): AnticipatedNeed[] {
    const needs: AnticipatedNeed[] = [];

    for (const pred of predictions) {
      if (pred.confidence > 0.6) {
        needs.push({
          need_type: `${pred.field}_anticipation`,
          likelihood: pred.confidence,
          confidence: pred.confidence,
          recommended_actions: [
            {
              action_type: 'prepare_for',
              parameters: { [pred.field]: pred.predicted_value },
              priority: 'medium'
            }
          ],
          reasoning: `Predicted ${pred.field} from pattern ${pred.source_pattern}`
        });
      }
    }

    return needs;
  }

  private learnFromHistory(
    history: BehavioralEvent[],
    context: AnalyzedContext
  ): AnticipatedNeed[] {
    const needs: AnticipatedNeed[] = [];

    if (history.length < 3) return needs;

    // Find recurring patterns
    const robotInteractions = history.filter(e => e.event_type === 'robot_interaction');

    // Group by robot
    const robotCounts = new Map<string, { count: number; totalSatisfaction: number }>();
    for (const event of robotInteractions) {
      if (event.robot_id) {
        const current = robotCounts.get(event.robot_id) || { count: 0, totalSatisfaction: 0 };
        current.count++;
        current.totalSatisfaction += event.outcome?.satisfaction_score || 0.5;
        robotCounts.set(event.robot_id, current);
      }
    }

    // High satisfaction robots should be anticipated
    for (const [robotId, data] of robotCounts) {
      const avgSatisfaction = data.totalSatisfaction / data.count;
      if (avgSatisfaction > 0.7 && data.count >= 3) {
        needs.push({
          need_type: 'preferred_robot',
          likelihood: avgSatisfaction * (data.count / 10),
          confidence: Math.min(0.95, data.count / 10),
          recommended_actions: [
            {
              action_type: 'notify_robot',
              parameters: { robot_id: robotId },
              priority: 'medium'
            }
          ],
          reasoning: `Robot ${robotId} has ${data.count} interactions with ${avgSatisfaction.toFixed(2)} avg satisfaction`
        });
      }
    }

    return needs;
  }

  private deduplicateNeeds(needs: AnticipatedNeed[]): AnticipatedNeed[] {
    const seen = new Map<string, AnticipatedNeed>();

    for (const need of needs) {
      const existing = seen.get(need.need_type);
      if (!existing || need.likelihood > existing.likelihood) {
        seen.set(need.need_type, need);
      }
    }

    return Array.from(seen.values());
  }
}
