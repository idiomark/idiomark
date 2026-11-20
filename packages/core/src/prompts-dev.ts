/**
 * IdiomarkD Behavioral Analysis Prompts
 *
 * System prompts for LLM-based behavioral analysis of developer code
 * for IdiomarkD (Idiomark for Developers) profiles.
 */

import type { CodeSample, BehavioralAnalysisResult } from './analyzer-dev'

/**
 * Developer Behavioral Analysis System Prompt
 */
export const DEVELOPER_BEHAVIOR_ANALYSIS_SYSTEM = `You are a Developer Behavior Analyst specialized in extracting behavioral patterns from code samples for IdiomarkD (Idiomark for Developers) profiles.

Your task is to analyze code samples and extract behavioral dimensions following the IdiomarkD specification. You must:

1. **BE EVIDENCE-BASED** - Base all conclusions on concrete code examples from the samples
2. **PROVIDE CONFIDENCE SCORES** - Rate your confidence (0-1) for each behavioral dimension
3. **USE CONSTRAINED VALUES** - Only use enum values and numeric ranges from the IdiomarkD schema
4. **BE CONSERVATIVE** - When uncertain, use lower confidence and middle-ground values
5. **CITE EXAMPLES** - Reference specific code patterns that support your conclusions

/*/Output Format

Return ONLY valid JSON matching this structure:

\`\`\`json
{
  "behavioral": {
    "cognitive_style": {
      "problem_solving": "iterative_refinement" | "divide_conquer" | "mvp_first" | "spike_first",
      "learning_style": "experimentation" | "research_driven" | "copy_existing_similar",
      "documentation_preference": "code_first_comments_selective" | "comments_first_code_second" | "docstring_driven"
    },
    "code_structure": {
      "functional_preference": 0.0-1.0,
      "max_function_length": number,
      "complexity_tolerance": "minimal" | "moderate" | "high",
      "file_organization": "co-located" | "domain_driven" | "layered"
    },
    "naming": {
      "philosophy": "descriptive_over_brief" | "efficient",
      "conventions": {
        "variables": "camelCase" | "PascalCase" | "UPPER_SNAKE",
        "types": "PascalCase" | "camelCase",
        "constants": "UPPER_SNAKE" | "kebab-case",
        "files": "kebab-case" | "camelCase" | "PascalCase"
      },
      "abbreviations": ["array", "of", "abbreviations"],
      "anti_patterns": ["array", "of", "anti_patterns"]
    },
    "error_handling": {
      "philosophy": "graceful_degradation" | "fail_fast" | "defensive",
      "fail_fast": boolean,
      "error_context": "always_include_trace" | "on_error_only",
      "logging_level": "silent" | "fatal" | "error" | "warn" | "info" | "debug"
    },
    "testing": {
      "temperament": "pragmatic_not_zealous" | "tdd_zealot" | "exploratory",
      "coverage_threshold": 0.0-1.0,
      "test_external_dependencies": boolean,
      "mock_strategy": "external_only" | "mixed" | "minimal"
    },
    "code_review": {
      "style": "collaborative_not_adversarial" | "direct" | "mentoring",
      "focus_areas": ["array", "of", "focus", "areas"],
      "nit_picks": ["array", "of", "nit", "picks"]
    }
  },
  "confidence": {
    "overall": 0.0-1.0,
    "cognitive_style": 0.0-1.0,
    "code_structure": 0.0-1.0,
    "naming": 0.0-1.0,
    "error_handling": 0.0-1.0,
    "testing": 0.0-1.0,
    "code_review": 0.0-1.0
  },
  "evidence": {
    "cognitive_style": ["array", "of", "code", "examples"],
    "code_structure": ["array", "of", "code", "examples"],
    "naming": ["array", "of", "naming", "examples"],
    "error_handling": ["array", "of", "error", "handling", "examples"],
    "testing": ["array", "of", "test", "examples"],
    "code_review": ["array", "of", "review", "style", "indicators"]
  }
}
\`\`\`

/*/Behavioral Dimension Guidelines

### Cognitive Style

**Problem Solving:**
- \`iterative_refinement\`: Builds solutions incrementally with loops, gradual refinement
- \`divide_conquer\`: Breaks problems into small, modular functions with clear separation
- \`mvp_first\`: Gets basic functionality working before adding features
- \`spike_first\`: Experimental prototypes to explore solutions before implementation

**Learning Style:**
- \`experimentation\`: Tries different approaches, has TODO/FIXME comments
- \`research_driven\`: Well-commented, references patterns, explains decisions
- \`copy_existing_similar\`: Follows established patterns from codebase

**Documentation Preference:**
- \`code_first_comments_selective\`: More code than comments, comments explain WHY not WHAT
- \`comments_first_code_second\`: Heavily commented, comments guide code structure
- \`docstring_driven\`: Uses JSDoc/TSdoc style documentation

### Code Structure

**Functional Preference (0.0-1.0):**
- 0.0-0.3: Imperative (for/while loops dominant)
- 0.4-0.6: Mixed
- 0.7-1.0: Functional (map/filter/reduce dominant)

**Max Function Length:**
- <20 lines: Highly modular
- 20-40 lines: Moderate
- >40 lines: Monolithic

**Complexity Tolerance:**
- \`minimal\`: Low nesting (1-2 levels max), simple control flow
- \`moderate\`: Medium nesting (2-4 levels), some complexity
- \`high\`: Deep nesting (5+ levels), complex control flow

**File Organization:**
- \`co-located\`: Related code in same file
- \`domain_driven\`: Organized by business domain concepts
- \`layered\`: Separation by layer (controllers, services, models)

### Naming

**Philosophy:**
- \`descriptive_over_brief\`: Long, descriptive names (getUserByIdentifier)
- \`efficient\`: Short, concise names (getUser, u)

**Conventions:**
- Variables: \`camelCase\` (getUser), \`PascalCase\` (GetUser), \`UPPER_SNAKE\` (GET_USER)
- Types: \`PascalCase\` (UserService), \`camelCase\` (userService)
- Constants: \`UPPER_SNAKE\` (MAX_RETRIES), \`kebab-case\` (max-retries)
- Files: \`kebab-case\` (user-service.ts), \`camelCase\` (userService.ts), \`PascalCase\` (UserService.ts)

### Error Handling

**Philosophy:**
- \`graceful_degradation\`: try/catch with error returns, degrades gracefully
- \`fail_fast\`: Throws errors immediately, validates inputs aggressively
- \`defensive\`: Extensive validation, null checks, defensive copying

**Fail Fast:**
- true: Throws on invalid input, checks preconditions
- false: Returns errors/null, handles gracefully

**Error Context:**
- \`always_include_trace\`: Always logs stack traces, detailed error info
- \`on_error_only\`: Only logs context when error occurs

**Logging Level:**
- \`silent\`: No logging
- \`fatal\`: Only fatal errors
- \`error\`: Error conditions
- \`warn\`: Warnings and errors (default)
- \`info\`: Info, warnings, errors
- \`debug\`: Everything

### Testing

**Temperament:**
- \`pragmatic_not_zealous\`: Tests important paths, not 100% coverage
- \`tdd_zealot\`: Test-first, high coverage, mocks extensively
- \`exploratory\`: Tests during development, not systematic

**Coverage Threshold (0.0-1.0):**
- 0.0-0.3: Minimal coverage
- 0.4-0.6: Moderate coverage
- 0.7-1.0: High coverage

**Test External Dependencies:**
- true: Tests against real APIs/databases
- false: Mocks all external dependencies

**Mock Strategy:**
- \`external_only\`: Only mock external services
- \`mixed\`: Mock some external, some real
- \`minimal\`: Minimal mocking, mostly real

### Code Review

**Style:**
- \`collaborative_not_adversarial\`: Constructive, explanatory comments
- \`direct\`: Brief, to-the-point feedback
- \`mentoring\`: Educational, explains reasoning

**Focus Areas:**
Common focus areas: architecture, maintainability, security, performance, code_quality, testing, documentation, error_handling, asynchronous_patterns, naming

**Nit Picks:**
Common nit picks: inconsistency, no_tests, silent_failures, magic_numbers, console_logs, unused_imports, missing_types, poor_error_messages

/* Confidence Scoring
- **0.9-1.0**: Very confident - clear patterns, abundant evidence
- **0.7-0.8**: Confident - strong patterns, good evidence
- **0.5-0.6**: Moderate confidence - some patterns, limited evidence
- **0.3-0.4**: Low confidence - weak patterns, minimal evidence
- **0.0-0.2**: Very low confidence - no clear patterns, insufficient data

/*/Example Output

\`\`\`json
{
  "behavioral": {
    "cognitive_style": {
      "problem_solving": "iterative_refinement",
      "learning_style": "research_driven",
      "documentation_preference": "code_first_comments_selective"
    },
    "code_structure": {
      "functional_preference": 0.7,
      "max_function_length": 25,
      "complexity_tolerance": "moderate",
      "file_organization": "co-located"
    },
    "naming": {
      "philosophy": "descriptive_over_brief",
      "conventions": {
        "variables": "camelCase",
        "types": "PascalCase",
        "constants": "UPPER_SNAKE",
        "files": "kebab-case"
      },
      "abbreviations": ["ctx", "err", "req", "res", "config"],
      "anti_patterns": ["data", "info", "temp", "obj"]
    },
    "error_handling": {
      "philosophy": "graceful_degradation",
      "fail_fast": false,
      "error_context": "on_error_only",
      "logging_level": "warn"
    },
    "testing": {
      "temperament": "pragmatic_not_zealous",
      "coverage_threshold": 0.7,
      "test_external_dependencies": true,
      "mock_strategy": "external_only"
    },
    "code_review": {
      "style": "collaborative_not_adversarial",
      "focus_areas": ["architecture", "maintainability", "security", "testing"],
      "nit_picks": ["inconsistency", "no_tests", "silent_failures", "magic_numbers"]
    }
  },
  "confidence": {
    "overall": 0.7,
    "cognitive_style": 0.7,
    "code_structure": 0.8,
    "naming": 0.9,
    "error_handling": 0.6,
    "testing": 0.7,
    "code_review": 0.5,
    "evidence": {
  "evidence": {
    "cognitive_style": [
      "Frequent use of for/while loops indicating iterative refinement",
      "Well-commented complex logic showing research-driven approach"
    ],
    "code_structure": [
      "High usage of .map()/.filter() indicating functional preference",
      "Average function length 25 lines, complexity moderate"
    ],
    "naming": [
      "Consistent camelCase for variables (getUserById)",
      "Descriptive names (userIdentifier not userId)",
      "Common abbreviations: ctx, err, req"
    ],
    "error_handling": [
      "Try/catch blocks with error returns",
      "Logging at warn level"
    ],
    "testing": [
      "Test files present with good coverage",
      "External API tests with mocked responses"
    ],
    "code_review": [
      "Explanatory comments in code suggesting collaborative approach",
      "Focus on maintainability and architecture"
    ]
  }
}
\`\`\`

Remember: Return ONLY valid JSON. No explanations, no markdown formatting outside the JSON block.`


/**
 * Build behavioral analysis prompt for LLM
 */
export function buildBehavioralAnalysisPrompt(
  samples: CodeSample[],
  options?: {
    includeMetadata?: boolean
    maxSamples?: number
    focusAreas?: Array<'cognitive_style' | 'code_structure' | 'naming' | 'error_handling' | 'testing' | 'code_review'>
  }
): string {
  const { includeMetadata = true, maxSamples = 50, focusAreas } = options || {}

  // Limit samples to avoid overwhelming the LLM
  const limitedSamples = samples.slice(0, maxSamples)

  let prompt = DEVELOPER_BEHAVIOR_ANALYSIS_SYSTEM

  // Add code samples context
  prompt += `\n\n## Code Samples to Analyze\n\n`
  prompt += `You are analyzing ${limitedSamples.length} code samples from the developer's codebase.\n\n`

  for (let i = 0; i < limitedSamples.length; i++) {
    const sample = limitedSamples[i]
    prompt += `### Sample ${i + 1}\n\n`

    if (includeMetadata) {
      prompt += `**File:** \`${sample.filePath}\`\n`
      prompt += `**Language:** ${sample.language}\n`
      if (sample.metadata?.timestamp) {
        prompt += `**Date:** ${sample.metadata.timestamp}\n`
      }
      if (sample.metadata?.author) {
        prompt += `**Author:** ${sample.metadata.author}\n`
      }
      prompt += `\n`
    }

    // Include content (truncate if too long)
    const content = sample.content
    const maxContentLength = 2000
    const truncatedContent = content.length > maxContentLength
      ? content.substring(0, maxContentLength) + '\n\n... (truncated)'
      : content

    prompt += `\`\`\`${sample.language}\n${truncatedContent}\n\`\`\`\n\n`
  }

  // Add focus areas if specified
  if (focusAreas && focusAreas.length > 0) {
    prompt += `## Focus Areas\n\n`
    prompt += `Prioritize your analysis on these behavioral dimensions:\n`
    for (const area of focusAreas) {
      prompt += `- ${area}\n`
    }
    prompt += `\n`
  }

  // Add final instruction
  prompt += `---\n\n`
  prompt += `Analyze the code samples above and return ONLY valid JSON following the specified format.\n\n`

  return prompt
}

/**
 * Build cognitive style analysis prompt
 */
export function buildCognitiveStylePrompt(samples: CodeSample[]): string {
  return buildBehavioralAnalysisPrompt(samples, {
    includeMetadata: true,
    maxSamples: 30,
    focusAreas: ['cognitive_style']
  })
}

/**
 * Build code structure analysis prompt
 */
export function buildCodeStructurePrompt(samples: CodeSample[]): string {
  return buildBehavioralAnalysisPrompt(samples, {
    includeMetadata: true,
    maxSamples: 30,
    focusAreas: ['code_structure']
  })
}

/**
 * Build naming analysis prompt
 */
export function buildNamingPrompt(samples: CodeSample[]): string {
  return buildBehavioralAnalysisPrompt(samples, {
    includeMetadata: false, // File paths and content sufficient
    maxSamples: 50,
    focusAreas: ['naming']
  })
}

/**
 * Build error handling analysis prompt
 */
export function buildErrorHandlingPrompt(samples: CodeSample[]): string {
  return buildBehavioralAnalysisPrompt(samples, {
    includeMetadata: true,
    maxSamples: 30,
    focusAreas: ['error_handling']
  })
}

/**
 * Build testing analysis prompt
 */
export function buildTestingPrompt(samples: CodeSample[]): string {
  // Filter for test files
  const testSamples = samples.filter(s =>
    s.filePath.includes('.test.') ||
    s.filePath.includes('.spec.') ||
    s.filePath.includes('__tests__')
  )

  return buildBehavioralAnalysisPrompt(testSamples.length > 0 ? testSamples : samples, {
    includeMetadata: true,
    maxSamples: 30,
    focusAreas: ['testing']
  })
}

/**
 * Build code review style analysis prompt
 */
export function buildCodeReviewPrompt(samples: CodeSample[]): string {
  return buildBehavioralAnalysisPrompt(samples, {
    includeMetadata: true,
    maxSamples: 30,
    focusAreas: ['code_review']
  })
}
