/**
 * IdiomarkD Developer Behavior Analyzer
 *
 * Analyzes code samples to extract developer behavioral patterns
 * for IdiomarkD (Idiomark for Developers) profiles.
 */

import type {
  DeveloperBehavior,
  DeveloperAIPersonality,
  CodeSample,
  CognitiveStyle,
  CodeStructure,
  Naming,
  ErrorHandling,
  Testing,
  CodeReview
} from './types-dev'

// CodeSample is now defined in types-dev; re-exported here for backward
// compatibility with `import { CodeSample } from './analyzer-dev'` consumers.
export type { CodeSample }

/**
 * Well-known developer abbreviations recognized inside identifiers.
 * Naming.abbreviations is documented as "Common dev abbreviations"
 * (types-dev.ts); prompts-dev.ts uses ctx/err/req/res/config as examples.
 */
const KNOWN_DEV_ABBREVIATIONS = new Set([
  'api', 'http', 'https', 'url', 'uri', 'db', 'sql', 'json', 'xml', 'yaml',
  'html', 'css', 'ui', 'ux', 'id', 'io', 'ai', 'cli', 'sdk', 'auth',
  'config', 'ctx', 'err', 'req', 'res', 'env', 'fs'
])

export interface BehavioralAnalysisResult {
  behavioral: DeveloperBehavior
  confidence: {
    overall: number
    cognitive_style: number
    code_structure: number
    naming: number
    error_handling: number
    testing: number
    code_review: number
  }
  sampleCount: number
  analyzedAt: string
}

/**
 * DeveloperBehaviorAnalyzer - Extracts behavioral patterns from code samples
 */
export class DeveloperBehaviorAnalyzer {
  private samples: CodeSample[] = []
  private cache = new Map<string, any>()

  constructor(samples?: CodeSample[]) {
    if (samples) {
      this.samples = samples
    }
  }

  /**
   * Add code samples for analysis
   */
  addSamples(samples: CodeSample[]): void {
    this.samples.push(...samples)
    this.cache.clear() // Clear cache when new samples added
  }

  /**
   * Run complete behavioral analysis
   */
  async analyze(): Promise<BehavioralAnalysisResult> {
    if (this.samples.length === 0) {
      throw new Error('No code samples to analyze')
    }

    const startTime = Date.now()

    // Analyze each behavioral dimension
    const cognitiveStyle = this.analyzeCognitiveStyle()
    const codeStructure = this.analyzeCodeStructure()
    const naming = this.analyzeNaming()
    const errorHandling = this.analyzeErrorHandling()
    const testing = this.analyzeTesting()
    const codeReview = this.analyzeCodeReview()

    // Calculate confidence scores
    const confidence = {
      overall: this.calculateOverallConfidence([
        cognitiveStyle.confidence,
        codeStructure.confidence,
        naming.confidence,
        errorHandling.confidence,
        testing.confidence,
        codeReview.confidence
      ]),
      cognitive_style: cognitiveStyle.confidence,
      code_structure: codeStructure.confidence,
      naming: naming.confidence,
      error_handling: errorHandling.confidence,
      testing: testing.confidence,
      code_review: codeReview.confidence
    }

    return {
      behavioral: {
        cognitive_style: cognitiveStyle.data,
        code_structure: codeStructure.data,
        naming: naming.data,
        error_handling: errorHandling.data,
        testing: testing.data,
        code_review: codeReview.data
      },
      confidence,
      sampleCount: this.samples.length,
      analyzedAt: new Date(startTime).toISOString()
    }
  }

  /**
   * Analyze cognitive style from code patterns
   * Detects: problem_solving, learning_style, documentation_preference
   */
  private analyzeCognitiveStyle(): { data: CognitiveStyle; confidence: number } {
    let iterativeCount = 0
    let divideConquerCount = 0
    let mvpFirstCount = 0
    let spikeFirstCount = 0

    let experimentationCount = 0
    let researchDrivenCount = 0
    let copyExistingCount = 0

    let codeFirstCount = 0
    let commentsFirstCount = 0
    let docstringDrivenCount = 0

    const totalSamples = this.samples.length

    for (const sample of this.samples) {
      const lines = sample.content.split('\n')

      // Detect problem-solving approach
      const hasIterations = lines.filter(l => l.includes('for') || l.includes('while')).length
      const hasSmallFunctions = lines.filter(l => l.match(/^function \w{1,10}\(/)).length > 3
      const hasEarlyReturn = lines.some(l => l.includes('return') && !l.match(/^\s*\/\//))

      if (hasIterations > 5 || hasEarlyReturn) {
        iterativeCount++
      }

      // Detect learning style
      const hasExperimentalCode = lines.some(l =>
        l.includes('TODO') || l.includes('FIXME') || l.includes('experiment')
      )
      const hasComments = lines.filter(l => l.match(/^\s*\/\//)).length
      const commentRatio = hasComments / lines.length

      if (hasExperimentalCode) {
        experimentationCount++
      } else if (commentRatio > 0.1) {
        researchDrivenCount++
      } else {
        copyExistingCount++
      }

      // Detect documentation preference
      const hasDocstrings = lines.filter(l => l.match(/^\s*\*\//)).length
      const hasRegularComments = lines.filter(l => l.match(/^\s*\/\//) && !l.match(/^\s*\*\//)).length

      if (hasRegularComments > hasDocstrings) {
        codeFirstCount++
      } else if (hasDocstrings > 0) {
        docstringDrivenCount++
      } else {
        commentsFirstCount++
      }
    }

    // Determine dominant styles
    const problemSolving = this.getDominantValue([
      { value: 'iterative_refinement', count: iterativeCount },
      { value: 'divide_conquer', count: divideConquerCount },
      { value: 'mvp_first', count: mvpFirstCount },
      { value: 'spike_first', count: spikeFirstCount }
    ]) as CognitiveStyle['problem_solving']

    const learningStyle = this.getDominantValue([
      { value: 'experimentation', count: experimentationCount },
      { value: 'research_driven', count: researchDrivenCount },
      { value: 'copy_existing_similar', count: copyExistingCount }
    ]) as CognitiveStyle['learning_style']

    const documentationPreference = this.getDominantValue([
      { value: 'code_first_comments_selective', count: codeFirstCount },
      { value: 'comments_first_code_second', count: commentsFirstCount },
      { value: 'docstring_driven', count: docstringDrivenCount }
    ]) as CognitiveStyle['documentation_preference']

    // Calculate confidence based on consensus
    const confidence = this.calculateConsensusConfidence([
      this.evidenceAdjustedRatio(iterativeCount, totalSamples),
      this.evidenceAdjustedRatio(experimentationCount, totalSamples),
      this.evidenceAdjustedRatio(codeFirstCount, totalSamples)
    ])

    return {
      data: {
        problem_solving: problemSolving,
        learning_style: learningStyle,
        documentation_preference: documentationPreference
      },
      confidence
    }
  }

  /**
   * Analyze code structure patterns
   * Detects: functional_preference, max_function_length, complexity_tolerance, file_organization
   */
  private analyzeCodeStructure(): { data: CodeStructure; confidence: number } {
    let totalFunctionalPreference = 0
    let maxFunctionLength = 0
    let functionLengths: number[] = []

    let minimalCount = 0
    let moderateCount = 0
    let highCount = 0

    let colocatedCount = 0
    let domainDrivenCount = 0
    let layeredCount = 0

    const totalSamples = this.samples.length

    for (const sample of this.samples) {
      const lines = sample.content.split('\n')

      // Count functional patterns (map, filter, reduce vs for loops)
      const mapFilterReduce = lines.filter(l =>
        l.match(/\.map\(|\.filter\(|\.reduce\(/)
      ).length
      const forLoops = lines.filter(l =>
        l.match(/\b(for|while)\s*\(/)
      ).length
      const totalLooping = mapFilterReduce + forLoops

      const functionalPreference = totalLooping > 0
        ? mapFilterReduce / totalLooping
        : 0.5

      totalFunctionalPreference += functionalPreference

      // Detect function lengths
      const functionMatches = sample.content.matchAll(
        /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?^\s*}/gm
      )

      for (const match of functionMatches) {
        const functionContent = match[0]
        const functionLines = functionContent.split('\n').length
        functionLengths.push(functionLines)
        maxFunctionLength = Math.max(maxFunctionLength, functionLines)
      }

      // Detect complexity tolerance from nesting depth
      const maxNesting = this.calculateMaxNestingDepth(lines)
      if (maxNesting <= 2) {
        minimalCount++
      } else if (maxNesting <= 4) {
        moderateCount++
      } else {
        highCount++
      }

      // Detect file organization (simplified heuristic)
      const hasIndexExport = lines.some(l => l.match(/export.*from.*index/))
      const hasBarrelExport = lines.some(l => l.match(/^export\s*\{/))

      if (hasIndexExport || hasBarrelExport) {
        layeredCount++
      } else {
        colocatedCount++
      }
    }

    const avgFunctionalPreference = totalFunctionalPreference / totalSamples
    const avgMaxFunctionLength = functionLengths.length > 0
      ? Math.round(functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length)
      : 20

    const complexityTolerance = this.getDominantValue([
      { value: 'minimal', count: minimalCount },
      { value: 'moderate', count: moderateCount },
      { value: 'high', count: highCount }
    ]) as CodeStructure['complexity_tolerance']

    const fileOrganization = this.getDominantValue([
      { value: 'co-located', count: colocatedCount },
      { value: 'domain_driven', count: domainDrivenCount },
      { value: 'layered', count: layeredCount }
    ]) as CodeStructure['file_organization']

    const confidence = this.calculateConsensusConfidence([
      avgFunctionalPreference > 0.5 ? 1 : avgFunctionalPreference,
      this.evidenceAdjustedRatio(Math.max(minimalCount, moderateCount, highCount), totalSamples),
      this.evidenceAdjustedRatio(Math.max(colocatedCount, domainDrivenCount, layeredCount), totalSamples)
    ])

    return {
      data: {
        functional_preference: this.clampValue(avgFunctionalPreference, 0, 1),
        max_function_length: avgMaxFunctionLength,
        complexity_tolerance: complexityTolerance,
        file_organization: fileOrganization
      },
      confidence
    }
  }

  /**
   * Analyze naming conventions
   * Detects: philosophy, conventions, abbreviations, anti_patterns
   */
  private analyzeNaming(): { data: Naming; confidence: number } {
    let descriptiveCount = 0
    let efficientCount = 0

    let camelCaseCount = 0
    let pascalCaseCount = 0
    let kebabCaseCount = 0

    const totalSamples = this.samples.length
    const allVariables = new Set<string>()
    const allAbbreviations = new Set<string>()
    const antiPatterns = new Set<string>()

    for (const sample of this.samples) {
      const lines = sample.content.split('\n')

      for (const line of lines) {
        // Detect variable declarations
        const varMatches = line.matchAll(/(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/g)
        for (const match of varMatches) {
          const varName = match[1]
          allVariables.add(varName)

          // Analyze naming philosophy
          if (varName.length > 8) {
            descriptiveCount++
          } else {
            efficientCount++
          }

          // Detect naming convention
          if (varName.match(/^[a-z][a-zA-Z0-9]*$/)) {
            camelCaseCount++
          } else if (varName.match(/^[A-Z][a-zA-Z0-9]*$/)) {
            pascalCaseCount++
          } else if (varName.match(/^[a-z][a-z0-9-]*$/)) {
            kebabCaseCount++
          }

          // Detect abbreviations
          const abbrMatches = varName.matchAll(/[A-Z]{2,}/g)
          for (const abbr of abbrMatches) {
            allAbbreviations.add(abbr[0].toLowerCase())
          }

          // Detect anti-patterns
          if (['data', 'info', 'temp', 'retval', 'obj'].includes(varName.toLowerCase())) {
            antiPatterns.add(varName)
          }
        }
      }

      // Detect well-known abbreviations anywhere in identifiers, including
      // camelCase segments (e.g. `httpClient` -> "http") and snake_case
      // groups (e.g. `API_BASE_URL` -> "api"), not just let/const/var names.
      for (const token of sample.content.matchAll(/[\w$]+/g)) {
        const segments = token[0]
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .split(/[\s_]+/)
        for (const segment of segments) {
          const lower = segment.toLowerCase()
          if (lower.length >= 2 && KNOWN_DEV_ABBREVIATIONS.has(lower)) {
            allAbbreviations.add(lower)
          }
        }
      }
    }

    const philosophy = descriptiveCount >= efficientCount
      ? 'descriptive_over_brief' as const
      : 'efficient' as const

    const variablesConvention = camelCaseCount >= Math.max(pascalCaseCount, kebabCaseCount)
      ? 'camelCase' as const
      : pascalCaseCount >= kebabCaseCount ? 'PascalCase' as const : 'kebab-case' as const

    const typesConvention = 'PascalCase' as const
    const constantsConvention = 'UPPER_SNAKE' as const
    const filesConvention = 'kebab-case' as const

    // No declarations -> no naming evidence at all. Computing max/count here
    // would be 0/0 = NaN and poison confidence.overall (NaN is not a valid
    // 0-1 confidence), so guard the denominators.
    const namingEvidence = descriptiveCount + efficientCount
    const conventionEvidence = camelCaseCount + pascalCaseCount + kebabCaseCount

    const confidence = this.calculateConsensusConfidence([
      namingEvidence > 0
        ? (Math.max(descriptiveCount, efficientCount) / namingEvidence) *
          this.evidenceWeight(namingEvidence)
        : 0,
      conventionEvidence > 0
        ? (Math.max(camelCaseCount, pascalCaseCount, kebabCaseCount) / conventionEvidence) *
          this.evidenceWeight(conventionEvidence)
        : 0
    ])

    return {
      data: {
        philosophy,
        conventions: {
          variables: variablesConvention,
          types: typesConvention,
          constants: constantsConvention,
          files: filesConvention
        },
        abbreviations: Array.from(allAbbreviations).slice(0, 20),
        anti_patterns: Array.from(antiPatterns).slice(0, 20)
      },
      confidence
    }
  }

  /**
   * Analyze error handling patterns
   * Detects: philosophy, fail_fast, error_context, logging_level
   */
  private analyzeErrorHandling(): { data: ErrorHandling; confidence: number } {
    let gracefulCount = 0
    let failFastCount = 0
    let defensiveCount = 0

    let failFastTrueCount = 0
    let failFastFalseCount = 0

    let alwaysTraceCount = 0
    let onErrorOnlyCount = 0

    let errorCount = 0
    let warnCount = 0
    let infoCount = 0
    let debugCount = 0
    let silentCount = 0

    const totalSamples = this.samples.length

    for (const sample of this.samples) {
      const lines = sample.content.split('\n')

      const tryCatchBlocks = lines.filter(l => l.includes('try')).length
      const throwStatements = lines.filter(l => l.includes('throw')).length
      const returnErrors = lines.filter(l => l.match(/return\s+(error|err|null)/)).length
      const earlyReturns = lines.filter(l => l.includes('return')).length

      // Detect error handling philosophy
      if (tryCatchBlocks > 0 && returnErrors > 0) {
        gracefulCount++
      } else if (throwStatements > tryCatchBlocks) {
        failFastCount++
      } else {
        defensiveCount++
      }

      // Detect fail_fast preference
      if (throwStatements >= tryCatchBlocks) {
        failFastTrueCount++
      } else {
        failFastFalseCount++
      }

      // Detect error context preference
      const consoleErrors = lines.filter(l => l.match(/console\.(error|log)/))
      const hasStackTraces = lines.some(l => l.includes('stack') || l.includes('trace'))
      if (consoleErrors.length > 0 && hasStackTraces) {
        alwaysTraceCount++
      } else {
        onErrorOnlyCount++
      }

      // Detect logging level
      errorCount += lines.filter(l => l.match(/\.(error|Error)\(/)).length
      warnCount += lines.filter(l => l.match(/\.warn\(/)).length
      infoCount += lines.filter(l => l.match(/\.info\(/)).length
      debugCount += lines.filter(l => l.match(/\.debug\(/)).length
    }

    const philosophy = this.getDominantValue([
      { value: 'graceful_degradation', count: gracefulCount },
      { value: 'fail_fast', count: failFastCount },
      { value: 'defensive', count: defensiveCount }
    ]) as ErrorHandling['philosophy']

    const failFast = failFastTrueCount >= failFastFalseCount

    const errorContext = alwaysTraceCount >= onErrorOnlyCount
      ? 'always_include_trace' as const
      : 'on_error_only' as const

    const totalLogging = errorCount + warnCount + infoCount + debugCount + silentCount
    const dominantLog = this.getDominantValue([
      { value: 'silent', count: silentCount },
      { value: 'fatal', count: errorCount },
      { value: 'error', count: errorCount },
      { value: 'warn', count: warnCount },
      { value: 'info', count: infoCount },
      { value: 'debug', count: debugCount }
    ]) as ErrorHandling['logging_level']

    const confidence = this.calculateConsensusConfidence([
      this.evidenceAdjustedRatio(Math.max(gracefulCount, failFastCount, defensiveCount), totalSamples),
      this.evidenceAdjustedRatio(Math.max(alwaysTraceCount, onErrorOnlyCount), totalSamples)
    ])

    return {
      data: {
        philosophy,
        fail_fast: failFast,
        error_context: errorContext,
        logging_level: dominantLog || 'warn'
      },
      confidence
    }
  }

  /**
   * Analyze testing patterns
   * Detects: temperament, coverage_threshold, test_external_dependencies, mock_strategy
   */
  private analyzeTesting(): { data: Testing; confidence: number } {
    let pragmaticCount = 0
    let tddZealotCount = 0
    let exploratoryCount = 0

    let externalTestsCount = 0
    let externalTestsNoCount = 0

    let mockExternalOnly = 0
    let mockMixed = 0
    let mockMinimal = 0

    let totalTests = 0
    let totalTestLines = 0
    let totalCodeLines = 0

    for (const sample of this.samples) {
      const isTestFile = sample.filePath.includes('.test.') ||
                       sample.filePath.includes('.spec.') ||
                       sample.filePath.includes('__tests__')

      if (!isTestFile) {
        totalCodeLines += sample.content.split('\n').length
        continue
      }

      const lines = sample.content.split('\n')
      totalTests++
      totalTestLines += lines.length

      // Detect testing temperament
      const hasMocks = lines.some(l => l.includes('mock') || l.includes('stub') || l.includes('spy'))
      const hasExpectations = lines.filter(l => l.includes('expect') || l.includes('assert')).length
      const testDescribeBlocks = lines.filter(l => l.match(/describe\s*\(/)).length

      if (testDescribeBlocks > 0 && hasExpectations > 0) {
        if (hasMocks && hasExpectations > 5) {
          tddZealotCount++
        } else {
          pragmaticCount++
        }
      } else {
        exploratoryCount++
      }

      // Detect external dependency testing
      const hasApiTests = lines.some(l => l.match(/(fetch|axios|http)/))
      const hasDbTests = lines.some(l => l.match(/(db|database|prisma)/))

      if (hasApiTests || hasDbTests) {
        externalTestsCount++
      } else {
        externalTestsNoCount++
      }

      // Detect mock strategy
      const mockCount = lines.filter(l => l.match(/mock\(|jest\.mock/)).length
      const importCount = lines.filter(l => l.match(/^import/)).length

      if (mockCount > importCount * 0.8) {
        mockExternalOnly++
      } else if (mockCount > 0) {
        mockMixed++
      } else {
        mockMinimal++
      }
    }

    const temperament = this.getDominantValue([
      { value: 'pragmatic_not_zealous', count: pragmaticCount },
      { value: 'tdd_zealot', count: tddZealotCount },
      { value: 'exploratory', count: exploratoryCount }
    ]) as Testing['temperament']

    const testExternalDeps = externalTestsCount >= externalTestsNoCount

    const mockStrategy = this.getDominantValue([
      { value: 'external_only', count: mockExternalOnly },
      { value: 'mixed', count: mockMixed },
      { value: 'minimal', count: mockMinimal }
    ]) as Testing['mock_strategy']

    // Estimate coverage threshold from test-to-code ratio
    const coverageThreshold = totalCodeLines > 0
      ? this.clampValue(totalTestLines / totalCodeLines, 0, 1)
      : 0.5

    const confidence = totalTests > 0
      ? this.calculateConsensusConfidence([
          Math.max(pragmaticCount, tddZealotCount, exploratoryCount) / totalTests,
          Math.max(mockExternalOnly, mockMixed, mockMinimal) / totalTests
        ])
      : 0.3 // Low confidence if no tests found

    return {
      data: {
        temperament,
        coverage_threshold: Math.round(coverageThreshold * 100) / 100,
        test_external_dependencies: testExternalDeps,
        mock_strategy: mockStrategy
      },
      confidence
    }
  }

  /**
   * Analyze code review patterns
   * Detects: style, focus_areas, nit_picks
   */
  private analyzeCodeReview(): { data: CodeReview; confidence: number } {
    // Since we're analyzing code samples, not actual reviews,
    // we'll infer code review preferences from code quality indicators

    let collaborativeCount = 0
    let directCount = 0
    let mentoringCount = 0

    const focusAreas = new Set<string>()
    const nitPicks = new Set<string>()

    for (const sample of this.samples) {
      const lines = sample.content.split('\n')

      // Infer review style from code comments and documentation
      const hasExplanatoryComments = lines.filter(l =>
        l.match(/^\s*\/\/\s*[A-Z]/) // Capitalized comments suggest collaboration
      ).length > 3

      const hasDocs = lines.some(l => l.match(/^\s*\*\//))

      const hasComplexLogic = lines.some(l =>
        l.match(/(?:for|while)\s*\(.*\s*\{/) && // Nested loops
        lines.some(l2 => l2.match(/\bif\s*\(.*\).*\bif\s*\(/)) // Nested ifs
      )

      if (hasExplanatoryComments && hasDocs) {
        collaborativeCount++
      } else if (hasComplexLogic) {
        mentoringCount++
      } else {
        directCount++
      }

      // Infer focus areas from code characteristics
      if (lines.some(l => l.includes('async') || l.includes('await'))) {
        focusAreas.add('asynchronous_patterns')
      }
      if (lines.some(l => l.includes('class ') || l.includes('interface '))) {
        focusAreas.add('architecture')
      }
      if (lines.some(l => l.match(/(?:console\.|logger\.)/))) {
        focusAreas.add('logging')
      }
      if (lines.some(l => l.includes('throw ') || l.includes('catch'))) {
        focusAreas.add('error_handling')
      }

      // Infer nit picks from code quality issues
      const hasInconsistencies = lines.some(l =>
        l.match(/var\s+\w+/) && // var usage
        lines.some(l2 => l2.match(/const\s+\w+/)) // const usage
      )
      if (hasInconsistencies) {
        nitPicks.add('inconsistency')
      }

      const hasConsoleLogs = lines.some(l => l.match(/console\.log/))
      if (hasConsoleLogs) {
        nitPicks.add('console_logs')
      }

      const hasMagicNumbers = lines.some(l =>
        l.match(/\b\d{2,}\b/) && // Numbers >= 10
        !l.includes('//') && !l.includes('*')
      )
      if (hasMagicNumbers) {
        nitPicks.add('magic_numbers')
      }
    }

    const style = this.getDominantValue([
      { value: 'collaborative_not_adversarial', count: collaborativeCount },
      { value: 'direct', count: directCount },
      { value: 'mentoring', count: mentoringCount }
    ]) as CodeReview['style']

    const reviewEvidence = collaborativeCount + directCount + mentoringCount
    const confidence = this.calculateConsensusConfidence([
      reviewEvidence > 0
        ? (Math.max(collaborativeCount, directCount, mentoringCount) / reviewEvidence) *
          this.evidenceWeight(reviewEvidence)
        : 0
    ])

    return {
      data: {
        style,
        focus_areas: focusAreas.size > 0
          ? Array.from(focusAreas).slice(0, 10)
          : ['code_quality', 'maintainability'],
        nit_picks: nitPicks.size > 0
          ? Array.from(nitPicks).slice(0, 10)
          : ['inconsistency', 'no_tests', 'silent_failures']
      },
      confidence
    }
  }

  /**
   * Helper: Calculate maximum nesting depth in code
   */
  private calculateMaxNestingDepth(lines: string[]): number {
    let maxDepth = 0
    let currentDepth = 0

    for (const line of lines) {
      const openBraces = (line.match(/{/g) || []).length
      const closeBraces = (line.match(/}/g) || []).length
      const openParens = (line.match(/\(/g) || []).length
      const closeParens = (line.match(/\)/g) || []).length

      currentDepth += openBraces + openParens - closeBraces - closeParens
      maxDepth = Math.max(maxDepth, currentDepth)
    }

    return maxDepth
  }

  /**
   * Helper: Get dominant value from count array
   */
  private getDominantValue<T>(items: { value: T; count: number }[]): T {
    const sorted = [...items].sort((a, b) => b.count - a.count)
    return sorted[0]?.value || items[0].value
  }

  /**
   * Helper: Calculate confidence from consensus ratio
   */
  private calculateConsensusConfidence(ratios: number[]): number {
    if (ratios.length === 0) return 0
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
    return this.clampValue(avgRatio, 0, 1)
  }

  /**
   * Helper: Shrink a confidence ratio by the volume of evidence behind it.
   * A consensus drawn from N observations is only trustworthy up to
   * N / (N + 1): one sample that agrees with itself still tells us little,
   * so a single trivial sample must not yield confidence 1.0.
   */
  private evidenceWeight(count: number): number {
    return count / (count + 1)
  }

  /**
   * Helper: count/total adjusted for evidence volume (0 when there is no data).
   */
  private evidenceAdjustedRatio(count: number, total: number): number {
    if (total <= 0) return 0
    return (count / total) * this.evidenceWeight(count)
  }

  /**
   * Helper: Calculate overall confidence from component confidences
   */
  private calculateOverallConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0
    return confidences.reduce((a, b) => a + b, 0) / confidences.length
  }

  /**
   * Helper: Clamp value between min and max
   */
  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}

/**
 * Convenience function to analyze code samples
 */
export async function analyzeDeveloperBehavior(
  samples: CodeSample[]
): Promise<BehavioralAnalysisResult> {
  const analyzer = new DeveloperBehaviorAnalyzer(samples)
  return analyzer.analyze()
}
