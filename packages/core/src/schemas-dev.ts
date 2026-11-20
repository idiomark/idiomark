/**
 * IdiomarkD (Idiomark for Developers) Schemas
 *
 * Zod schemas for validating developer behavioral data
 * Following Idiomark principle: schema-based validation prevents garbage data
 */

import { z } from 'zod'
import type {
  DeveloperBehavior,
  DeveloperAIPersonality,
  DeveloperEnvironment
} from './types-dev'

/**
 * Developer Behavior Schema
 *
 * HOW you approach problems, structure code, name things, handle errors, test, review
 */
export const DeveloperBehaviorSchema = z.object({
  // Cognitive style: HOW you approach problems
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

  // Code structure: HOW you structure code
  code_structure: z.object({
    functional_preference: z.number().min(0).max(1),
    max_function_length: z.number().positive(),
    complexity_tolerance: z.enum(['minimal', 'moderate', 'high']),
    file_organization: z.enum(['co-located', 'domain_driven', 'layered'])
  }),

  // Naming: HOW you name things
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

  // Error handling: HOW you handle errors
  error_handling: z.object({
    philosophy: z.enum(['graceful_degradation', 'fail_fast', 'defensive']),
    fail_fast: z.boolean(),
    error_context: z.enum(['always_include_trace', 'on_error_only']),
    logging_level: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug'])
  }),

  // Testing: HOW you approach testing
  testing: z.object({
    temperament: z.enum(['pragmatic_not_zealous', 'tdd_zealot', 'exploratory']),
    coverage_threshold: z.number().min(0).max(1),
    test_external_dependencies: z.boolean(),
    mock_strategy: z.enum(['external_only', 'mixed', 'minimal'])
  }),

  // Code review: HOW you review code
  code_review: z.object({
    style: z.enum(['collaborative_not_adversarial', 'direct', 'mentoring']),
    focus_areas: z.array(z.string()),
    nit_picks: z.array(z.string())
  })
})

/**
 * AI Personality Schema
 *
 * How AI tools should represent and generate code for a specific developer
 */
export const DeveloperAIPersonalitySchema = z.object({
  // Voice: HOW AI should represent you
  voice: z.object({
    tone: z.object({
      primary: z.enum(['casual', 'professional', 'technical', 'friendly', 'professional_but_casual']),
      certainty: z.enum(['confident_with_hedges', 'very_certain', 'uncertain_and_ask', 'confident_with_edges']),
      }),
    formality: z.number().min(0).max(1),
    humor: z.number().min(0).max(1),
    sarcasm: z.number().min(0).max(1),
    enthusiasm: z.number().min(0).max(1),
    directness: z.number().min(0).max(1)
    }),

  // Code generation: HOW AI should generate code for you
  code_generation: z.object({
    prefer_patterns_over_raw_code: z.boolean(),
    include_explanations: z.enum(['selective', 'always', 'never']),
    comment_style: z.enum(['why_not_what', 'what_only', 'how_and_why']),
    docstring_preference: z.enum(['javadoc', 'jsdoc', 'none'])
  }),

  // Interaction: HOW AI should respond to you
  interaction: z.object({
    question_response_style: z.enum(['direct_with_options', 'socratic', 'exploratory']),
    error_communication: z.enum(['explain_then_fix', 'just_fix', 'acknowledge_only']),
    suggestion_openness: z.enum(['high_but_skeptical', 'balanced', 'conservative'])
  })
})

/**
 * Environment Schema
 *
 * Portability layer - editor, terminal, themes, etc.
 */
export const DeveloperEnvironmentSchema = z.object({
  optional: z.boolean(),                      // Clearly marked as optional

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
})

/**
 * IdiomarkD File Schema
 *
 * Based on IdiomarkFile, extended for developer profiles
 */
export const IdiomarkDSchema = z.object({
  // Identification
  idiomark: z.string().regex(/^\d+\.\d+\.\d+$/),
  profile_type: z.literal('developer'),

  // Metadata
  metadata: z.object({
    identity: z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      years_experience: z.number().optional(),
      primary_languages: z.array(z.string()).optional()
    }),
    created: z.string(),
    updated: z.string(),
    sources: z.array(z.string())
  }),

  // Behavioral layer (required)
  behavioral: DeveloperBehaviorSchema,

  // AI Personality layer (required)
  ai_personality: DeveloperAIPersonalitySchema,

  // Environmental layer (optional, clearly marked)
  environmental: DeveloperEnvironmentSchema.optional()
})

/**
 * Extraction Options Schema
 *
 * Options for extracting developer behavior
 */
export const DeveloperExtractionOptionsSchema = z.object({
  sources: z.array(z.string()),

  // Developer-specific extraction options
  code_patterns: z.object({
    include_tests: z.boolean().optional(),
    include_readme: z.boolean().optional(),
    include_contributing: z.boolean().optional(),
    commit_range: z.object({
      from: z.string(),
      to: z.string()
    }).optional()
  }).optional(),

  verbose: z.boolean().optional()
})
