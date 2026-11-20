/**
 * IdiomarkD Platform-Agnostic Integration Interface
 *
 * Provides standardized interfaces for AI tools to consume IdiomarkD profiles
 * for IdiomarkD (Idiomark for Developers) profiles.
 */

/**
 * Loaded developer behavioral profile
 */
export interface DevBehavior {
  /** Behavioral layer from IdiomarkD file */
  behavioral: {
    cognitive_style: {
      problem_solving: string
      learning_style: string
      documentation_preference: string
    }
    code_structure: {
      functional_preference: number
      max_function_length: number
      complexity_tolerance: string
      file_organization: string
    }
    naming: {
      philosophy: string
      conventions: {
        variables: string
        types: string
        constants: string
        files: string
        functions?: string
      }
      abbreviations: string[]
      anti_patterns: string[]
    }
    error_handling: {
      philosophy: string
      fail_fast: boolean
      error_context: string
      logging_level: string
    }
    testing: {
      temperament: string
      coverage_threshold: number
      test_external_dependencies: boolean
      mock_strategy: string
    }
    code_review: {
      style: string
      focus_areas: string[]
      nit_picks: string[]
    }
  }
  /** AI Personality layer from IdiomarkD file */
  ai_personality?: {
    voice?: {
      tone?: {
        primary?: string
        certainty?: string
      }
      formality?: number
      humor?: number
      sarcasm?: number
      enthusiasm?: number
      directness?: number
    }
    code_generation?: {
      prefer_patterns_over_raw_code?: boolean
      include_explanations?: string
      comment_style?: string
      docstring_preference?: string
    }
    interaction?: {
      question_response_style?: string
      error_communication?: string
      suggestion_openness?: string
    }
  }
  /** Source IdiomarkD file identifier */
  sourceFile?: string
}

/**
 * Code transformation result
 */
export interface CodeTransformation {
  /** Original code before transformation */
  original: string
  /** Transformed code matching developer behavior */
  transformed: string
  /** Applied transformations */
  transformations: {
    namingConvention?: string
    commentStyle?: string
    errorHandling?: string
    functionStyle?: string
  }
  /** Confidence score (0-1) */
  confidence: number
}

/**
 * Comment generation options
 */
export interface CommentGenerationOptions {
  /** Code context for comment generation */
  code: string
  /** Comment type (inline, block, jsdoc) */
  type?: 'inline' | 'block' | 'jsdoc'
  /** Position preference (before, after, inline) */
  position?: 'before' | 'after' | 'inline'
  /** Explanation depth (brief, detailed, why-focused) */
  depth?: 'brief' | 'detailed' | 'why-focused'
}

/**
 * Editor Integration interface
 *
 * Standard interface for AI tools (VS Code, Cursor, Copilot, etc.)
 * to load and apply IdiomarkD profiles.
 */
export interface EditorIntegration {
  /** Integration name (e.g., "vscode", "cursor", "copilot") */
  name: string

  /**
   * Load a IdiomarkD profile
   * @param profilePath - Path to IdiomarkD file or profile ID
   * @returns Loaded developer behavior
   */
  loadBehavior(profilePath: string): Promise<DevBehavior>

  /**
   * Apply behavioral profile to code
   * @param code - Source code to transform
   * @param behavior - Loaded developer behavior
   * @returns Transformed code matching developer style
   */
  applyBehavior(code: string, behavior: DevBehavior): CodeTransformation

  /**
   * Generate comment matching developer style
   * @param options - Comment generation options
   * @returns Generated comment text
   */
  generateComment(options: CommentGenerationOptions): string

  /**
   * Check if integration is available
   * @returns true if ready to use
   */
  isAvailable(): Promise<boolean>
}

/**
 * Apply code style transformation
 */
export function applyCodeStyle(
  code: string,
  behavior: DevBehavior
): CodeTransformation {
  let transformed = code
  const transformations: CodeTransformation['transformations'] = {}
  let confidence = 1.0

  // Apply naming conventions
  if (behavior.behavioral.naming) {
    const { conventions, philosophy } = behavior.behavioral.naming

    // Transform variable naming (simplified - real implementation would use AST)
    if (conventions.variables === 'UPPER_SNAKE' && philosophy === 'efficient') {
      // Strings are immutable: the previous `.replace(...).toUpperCase()`
      // discarded its result and left `transformed` untouched. Assign it.
      transformed = transformed.replace(
        /\b(let|const|var)(\s+)([A-Za-z_$][\w$]*)\b/g,
        (_match, keyword: string, space: string, name: string) =>
          `${keyword.toUpperCase()}${space}${name.toUpperCase()}`
      )
      transformations.namingConvention = 'UPPER_SNAKE variables'
      confidence *= 0.9
    } else if (conventions.variables === 'PascalCase' && philosophy === 'descriptive_over_brief') {
      transformed = transformed.replace(
        /\b(let|const|var)(\s+)([a-z])([a-zA-Z_$][\w$]*)\b/g,
        (_match, keyword: string, space: string, first: string, rest: string) =>
          `${keyword}${space}${first.toUpperCase()}${rest}`
      )
      transformations.namingConvention = 'PascalCase variables'
      confidence *= 0.9
    } else if (philosophy === 'descriptive_over_brief') {
      // descriptive_over_brief developers avoid brief names: expand
      // single-character variable names to a descriptive one.
      transformed = transformed.replace(
        /\b(let|const|var)(\s+)([a-z_$])(?=[\s,;=)])/g,
        (_match, keyword: string, space: string) => `${keyword}${space}value`
      )
      transformations.namingConvention = 'descriptive variable names'
      confidence *= 0.9
    }

    // Transform function naming
    if (conventions.functions === 'PascalCase') {
      transformed = transformed.replace(
        /\bfunction\s+([a-z])([a-zA-Z_$][\w$]*)\b/g,
        (_match, first: string, rest: string) => `function ${first.toUpperCase()}${rest}`
      )
      transformations.namingConvention = 'PascalCase functions'
      confidence *= 0.9
    }
  }

  // Apply function style from the structural preference. CodeTransformation
  // declares `transformations.functionStyle`, but it was never populated.
  const functionalPreference = behavior.behavioral.code_structure?.functional_preference
  if (typeof functionalPreference === 'number') {
    if (functionalPreference >= 0.7) {
      transformations.functionStyle = 'functional (map/filter/reduce)'
      confidence *= 0.95
    } else if (functionalPreference <= 0.3) {
      transformations.functionStyle = 'imperative (loops and statements)'
      confidence *= 0.95
    }
  }

  // Apply comment style
  const docPref = behavior.behavioral.cognitive_style?.documentation_preference
  if (docPref) {

    if (docPref === 'code_first_comments_selective') {
      // Add selective comments to complex logic
      transformations.commentStyle = 'selective inline comments'
      confidence *= 0.8
    } else if (docPref === 'comments_first_code_second') {
      // Add comprehensive comments
      transformations.commentStyle = 'comprehensive block comments'
      confidence *= 0.8
    } else if (docPref === 'docstring_driven') {
      // Use JSDoc/TSDoc style
      transformations.commentStyle = 'docstring documentation'
      confidence *= 0.8
    }
  }

  // Apply error handling
  if (behavior.behavioral.error_handling) {
    const { philosophy, fail_fast } = behavior.behavioral.error_handling

    if (philosophy === 'graceful_degradation') {
      transformations.errorHandling = 'graceful with error returns'
      confidence *= 0.7
    } else if (philosophy === 'fail_fast') {
      transformations.errorHandling = 'fail-fast with early validation'
      confidence *= 0.7
    }
  }

  return {
    original: code,
    transformed,
    transformations,
    confidence: Math.min(confidence, 1.0)
  }
}

/**
 * Generate comment matching developer style
 */
export function generateComment(
  behavior: DevBehavior,
  options: CommentGenerationOptions
): string {
  const { code, type = 'inline', position = 'after', depth = 'brief' } = options

  // Base comment from code context
  let comment = ''

  // Apply documentation preference
  const docPreference = behavior.behavioral.cognitive_style?.documentation_preference
  if (docPreference === 'code_first_comments_selective') {
    if (depth === 'why-focused') {
      comment = `// ${code}: ${explanation(code, depth)}`
    } else if (type === 'jsdoc') {
      comment = `/**\n * ${code}\n *\n * ${explanation(code, depth)}\n */`
    } else {
      // Selective comments are still why-comments: append the depth-based
      // explanation for brief/detailed too (the code name is already in the
      // prefix, so explanation() must not echo it a second time).
      comment = `// ${code}: ${explanation(code, depth)}`
    }
  } else if (docPreference === 'comments_first_code_second') {
    comment = `//\n// ${code}\n// ${explanation(code, depth)}\n`
  }

  return comment
}

/**
 * Generate explanation based on depth preference
 */
function explanation(code: string, depth: 'brief' | 'detailed' | 'why-focused'): string {
  if (depth === 'brief') {
    // The code name is already part of the generated comment prefix.
    return 'implementation'
  } else if (depth === 'detailed') {
    return `Implements ${code} with full error handling and validation`
  } else if (depth === 'why-focused') {
    return 'handles edge cases and provides clear intent'
  }

  return code
}

/**
 * Create integration instance
 */
export function createIntegration(config: {
  name: string
  loadBehavior?: (profile: string) => Promise<DevBehavior>
  applyBehavior?: (code: string, behavior: DevBehavior) => CodeTransformation
  generateComment?: (options: CommentGenerationOptions) => string
}): EditorIntegration {
  return {
    name: config.name,
    async loadBehavior(profilePath: string): Promise<DevBehavior> {
      // Delegate to the config-provided loader. Checking `this.loadBehavior`
      // here is always truthy (it is this very method on the returned object),
      // which caused infinite recursion (RangeError: Maximum call stack size
      // exceeded) instead of ever calling config.loadBehavior.
      if (config.loadBehavior) {
        return await config.loadBehavior(profilePath)
      }
      throw new Error('loadBehavior not implemented')
    },
    applyBehavior(code: string, behavior: DevBehavior): CodeTransformation {
      // Same as above: dispatch on `config`, not on `this`.
      if (config.applyBehavior) {
        return config.applyBehavior(code, behavior)
      }
      // Use default implementation
      return applyCodeStyle(code, behavior)
    },
    generateComment(options: CommentGenerationOptions): string {
      // Same as above: dispatch on `config`, not on `this`.
      if (config.generateComment) {
        return config.generateComment(options)
      }
      // No behavior profile is available in this context; the standalone
      // generateComment(behavior, options) must be called directly instead.
      throw new Error('generateComment not implemented')
    },
    async isAvailable(): Promise<boolean> {
      return true
    }
  }
}
