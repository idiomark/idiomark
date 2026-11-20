/**
 * IdiomarkD (Idiomark for Developers) Types
 *
 * Developer behavioral and environmental personality types
 * Following Idiomark principles: quantified, constrained, optional
 */

import { z } from 'zod'

/**
 * Developer Behavior Core Types
 *
 * Zod schemas for runtime validation
 */
export const DeveloperBehaviorSchema = z.object({
  cognitive_style: z.object({
    problem_solving: z.enum([
      'iterative_refinement',
      'divide_conquer',
      'mvp_first',
      'spike_first'
    ]),
    learning_style: z.enum([
      'experimentation',
      'research_driven',
      'copy_existing_similar'
    ]),
    documentation_preference: z.enum([
      'code_first_comments_selective',
      'comments_first_code_second',
      'docstring_driven'
    ])
  }),

  code_structure: z.object({
    functional_preference: z.number().min(0).max(1),
    max_function_length: z.number().positive(),
    complexity_tolerance: z.enum(['minimal', 'moderate', 'high']),
    file_organization: z.enum(['co-located', 'domain_driven', 'layered'])
  }),

  naming: z.object({
    philosophy: z.enum(['descriptive_over_brief', 'efficient']),
    conventions: z.object({
      variables: z.enum(['camelCase', 'PascalCase', 'UPPER_SNAKE', 'kebab-case']),
      types: z.enum(['PascalCase', 'camelCase']),
      constants: z.enum(['UPPER_SNAKE', 'kebab-case']),
      files: z.enum(['kebab-case', 'camelCase', 'PascalCase'])
    }),
    abbreviations: z.array(z.string()),
    anti_patterns: z.array(z.string())
  }),

  error_handling: z.object({
    philosophy: z.enum(['graceful_degradation', 'fail_fast', 'defensive']),
    fail_fast: z.boolean(),
    error_context: z.enum(['always_include_trace', 'on_error_only']),
    logging_level: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug'])
  }),

  testing: z.object({
    temperament: z.enum(['pragmatic_not_zealous', 'tdd_zealot', 'exploratory']),
    coverage_threshold: z.number().min(0).max(1),
    test_external_dependencies: z.boolean(),
    mock_strategy: z.enum(['external_only', 'mixed', 'minimal'])
  }),

  code_review: z.object({
    style: z.enum(['collaborative_not_adversarial', 'direct', 'mentoring']),
    focus_areas: z.array(z.string()),
    nit_picks: z.array(z.string())
  })
})

/**
 * AI Personality for Developers
 *
 * Zod schema for runtime validation
 */
export const DeveloperAIPersonalitySchema = z.object({
  voice: z.object({
    tone: z.object({
      primary: z.enum(['casual', 'professional', 'technical', 'friendly']),
      certainty: z.enum(['confident_with_hedges', 'very_certain', 'uncertain_and_ask'])
    }),
    formality: z.number().min(0).max(1),
    humor: z.number().min(0).max(1),
    sarcasm: z.number().min(0).max(1),
    enthusiasm: z.number().min(0).max(1),
    directness: z.number().min(0).max(1)
  }),

  code_generation: z.object({
    prefer_patterns_over_raw_code: z.boolean(),
    include_explanations: z.enum(['selective', 'always', 'never']),
    comment_style: z.enum(['why_not_what', 'what_only', 'how_and_why']),
    docstring_preference: z.enum(['javadoc', 'jsdoc', 'none'])
  }),

  interaction: z.object({
    question_response_style: z.enum(['direct_with_options', 'socratic', 'exploratory']),
    error_communication: z.enum(['explain_then_fix', 'just_fix', 'acknowledge_only']),
    suggestion_openness: z.enum(['high_but_skeptical', 'balanced', 'conservative'])
  })
})

/**
 * Environmental preferences for development
 *
 * Zod schema for runtime validation
 */
export const DeveloperEnvironmentSchema = z.object({
  optional: z.boolean(),

  editor: z.object({
    vscode: z.object({
      theme: z.string(),
      font_size: z.number(),
      tab_size: z.number(),
      format_on_save: z.boolean(),
      extensions: z.object({
        always_installed: z.array(z.string()),
        recommended: z.array(z.string())
      }).optional()
    }).optional(),

    terminal: z.object({
      shell: z.enum(['zsh', 'bash', 'fish', 'powershell']),
      theme: z.string().optional(),
      aliases: z.record(z.string(), z.string()).optional()
    }).optional(),

    operating_system: z.object({
      windows: z.record(z.string(), z.any()).optional(),
      macos: z.record(z.string(), z.any()).optional(),
      linux: z.record(z.string(), z.any()).optional()
    }).optional()
  }).optional()
});

/**
 * A code sample to analyze for developer behavioral patterns
 */
export interface CodeSample {
  filePath: string
  content: string
  language: string
  metadata?: {
    commitHash?: string
    timestamp?: string
    author?: string
  }
}

/**
 * Developer Behavior Types
 *
 * How a developer approaches problems, structures code, names things, etc.
 */
export interface CognitiveStyle {
  problem_solving: 'iterative_refinement' | 'divide_conquer' | 'mvp_first' | 'spike_first'
  learning_style: 'experimentation' | 'research_driven' | 'copy_existing_similar'
  documentation_preference: 'code_first_comments_selective' | 'comments_first_code_second' | 'docstring_driven'
}

export interface CodeStructure {
  functional_preference: number           // 0-1: How much you prefer functional approaches
  max_function_length: number             // Prevents impossible values
  complexity_tolerance: 'minimal' | 'moderate' | 'high'
  file_organization: 'co-located' | 'domain_driven' | 'layered'
}

export interface Naming {
  philosophy: 'descriptive_over_brief' | 'efficient'
  conventions: {
    // 'kebab-case' included because the analyzer detects it in real-world code
    variables: 'camelCase' | 'PascalCase' | 'UPPER_SNAKE' | 'kebab-case'
    types: 'PascalCase' | 'camelCase'
    constants: 'UPPER_SNAKE' | 'kebab-case'
    files: 'kebab-case' | 'camelCase' | 'PascalCase'
  }
  abbreviations: string[]          // Common dev abbreviations
  anti_patterns: string[]          // Avoid these patterns
}

export interface ErrorHandling {
  philosophy: 'graceful_degradation' | 'fail_fast' | 'defensive'
  fail_fast: boolean
  error_context: 'always_include_trace' | 'on_error_only'
  logging_level: 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug'
}

export interface Testing {
  temperament: 'pragmatic_not_zealous' | 'tdd_zealot' | 'exploratory'
  coverage_threshold: number          // 0-1: Minimum acceptable coverage
  test_external_dependencies: boolean
  mock_strategy: 'external_only' | 'mixed' | 'minimal'
}

export interface CodeReview {
  style: 'collaborative_not_adversarial' | 'direct' | 'mentoring'
  focus_areas: string[]          // Architecture, maintainability, security, etc.
  nit_picks: string[]             // What bothers you in reviews
}

export interface DeveloperBehavior {
  // HOW you approach problems
  cognitive_style: CognitiveStyle

  // HOW you structure code
  code_structure: CodeStructure

  // HOW you name things
  naming: Naming

  // HOW you handle errors
  error_handling: ErrorHandling

  // HOW you approach testing
  testing: Testing

  // HOW you review code
  code_review: CodeReview
}

/**
 * AI Personality for Developers
 *
 * How AI tools should represent and generate code for a specific developer
 */
export interface DeveloperAIPersonality {
  // HOW AI should represent you
  voice: {
    tone: {
      primary: 'casual' | 'professional' | 'technical' | 'friendly'
      certainty: 'confident_with_hedges' | 'very_certain' | 'uncertain_and_ask'
      }
    formality: number                 // 0-1: Formal to casual
    humor: number                    // 0-1: Serious to humorous
    sarcasm: number                 // 0-1: Sincere to sarcastic
    enthusiasm: number              // 0-1: Flat to high energy
    directness: number              // 0-1: Euphemistic to blunt
    }

  // HOW AI should generate code for you
  code_generation: {
    prefer_patterns_over_raw_code: boolean
    include_explanations: 'selective' | 'always' | 'never'
    comment_style: 'why_not_what' | 'what_only' | 'how_and_why'
    docstring_preference: 'javadoc' | 'jsdoc' | 'none'
  }

  // HOW AI should respond to you
  interaction: {
    question_response_style: 'direct_with_options' | 'socratic' | 'exploratory'
    error_communication: 'explain_then_fix' | 'just_fix' | 'acknowledge_only'
    suggestion_openness: 'high_but_skeptical' | 'balanced' | 'conservative'
  }
}

/**
 * Environmental preferences for development
 *
 * Portability layer - editor, terminal, themes, etc.
 */
export interface DeveloperEnvironment {
  optional: true                      // Clearly marked as optional

  editor?: {
    vscode?: {
      theme: string
      font_size: number
      tab_size: number
      format_on_save?: boolean
      extensions?: {
        always_installed?: string[]
        recommended?: string[]
      }
    }
    }

  terminal?: {
    shell: 'zsh' | 'bash' | 'fish' | 'powershell'
    theme?: string
    aliases?: Record<string, string>
  }

  operating_system?: {
    windows?: Record<string, any>
    macos?: Record<string, any>
    linux?: Record<string, any>
  }
}

/**
 * IdiomarkD File Structure
 *
 * Based on IdiomarkFile, extended for developer profiles
 */
export interface IdiomarkDFile {
  idiomark: '1.1.0'                  // Version: follows Idiomark versioning
  profile_type: 'developer'             // NEW: Distinguishes from personality profiles

  metadata: {
    identity: {
      name?: string
      role?: string
      years_experience?: number
      primary_languages?: string[]     // TypeScript, Python, Go, etc.
      }
    created: string
    updated: string
    sources: string[]               // github, manual, team, etc.
    }

  // The Core: Behavioral patterns
  behavioral: DeveloperBehavior

  // The Personality: How AI tools represent you
  ai_personality: DeveloperAIPersonality

  // The Optional: Environmental portability
  environmental?: DeveloperEnvironment      // Optional, clearly marked
}

/**
 * IdiomarkD V2 Experimental Types
 *
 * Future-proofing: Marked as optional, only included if needed
 */
export interface DeveloperBehaviorV2 {
  // V1 stable dimensions that might be enhanced in V2
  cognitive_dimensions?: {
    openness?: number          // Big Five: Openness to experience
    conscientiousness?: number  // Big Five: Achievement-oriented
    extraversion?: number        // Big Five: Social orientation
    agreeableness?: number      // Big Five: Collaboration preference
    neuroticism?: number        // Big Five: Negative emotion/anxiety
  }

  // Additional behavioral dimensions not in V1
  communication_style?: {
    synchronous?: boolean      // Prefer real-time vs async comms
    meeting_preference?: 'standup' | 'sit_down' | 'avoid_entirely'
    code_velocity?: 'deliberate' | 'rapid' | 'spam_my_slack'
  }

  // Development philosophy
  development_philosophy?: {
    yagni?: boolean          // You Aren't Gonna Need It
    testing_philosophy?: 'tdd' | 'bdd' | 'spike_first'
    delivery_preference?: 'continuous' | 'batch' | 'big_bang'
  }
}

/**
 * Result type for IdiomarkD operations
 */
export interface IdiomarkDResult {
  file: IdiomarkDFile
  metadata: {
    sampleSize: number
    sources: string[]
    confidence: number
  }

  save(path: string): Promise<void>
}

/**
 * Options for extracting developer behavior
 */
export interface DeveloperExtractionOptions {
  sources: string[]          // github, manual, team, etc.

  // Developer-specific extraction options
  code_patterns?: {
    include_tests?: boolean
    include_readme?: boolean
    include_contributing?: boolean
    commit_range?: {
      from: string
      to: string
    }
    }

  verbose?: boolean
}
