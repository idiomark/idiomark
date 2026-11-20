/**
 * IdiomarkD AST Analyzer
 *
 * Analyzes code using TypeScript Compiler API for precise behavioral pattern detection
 * for IdiomarkD (Idiomark for Developers) profiles.
 */

import type { CodeSample } from './analyzer-dev'

export interface ASTAnalysisResult {
  functionLength: {
    average: number
    median: number
    max: number
    count?: number
    distribution: { short: number; medium: number; long: number }
  }
  functionalStyle: {
    mapUsage: number
    filterUsage: number
    reduceUsage: number
    loopUsage: number
    functionalPreference: number
  }
  namingPatterns: {
    variables: { camelCase: number; pascalCase: number; other: number }
    functions: { camelCase: number; pascalCase: number; other: number }
    classes: { pascalCase: number; other: number }
    avgVariableLength: number
    classCount?: number
  }
  errorPatterns: {
    tryCatchCount: number
    throwCount: number
    errorReturnCount: number
    explicitErrorCount: number
    dominantStrategy: 'try_catch' | 'throw' | 'return_error' | 'none'
  }
  testPatterns: {
    testCount: number
    assertionCount: number
    mockCount: number
    describeBlocks: number
    avgAssertionsPerTest: number
    hasMocks: boolean
  }
  complexity: {
    avgNestingDepth: number
    maxNestingDepth: number
    cyclomaticComplexity: number
  }
}

export interface ASTCodeMetrics {
  samples: number
  totalLines: number
  totalFunctions: number
  totalClasses: number
  languages: Record<string, number>
}

/**
 * ASTAnalyzer - Analyzes code structure using TypeScript compiler API
 */
export class ASTAnalyzer {
  private samples: CodeSample[] = []
  private metrics = new Map<string, Partial<ASTAnalysisResult>>()

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
    this.metrics.clear()
  }

  /**
   * Run complete AST analysis on all samples
   */
  analyze(): { result: ASTAnalysisResult; metrics: ASTCodeMetrics } {
    const allResults: Partial<ASTAnalysisResult>[] = []

    let totalLines = 0
    let totalFunctions = 0
    let totalClasses = 0
    const languages: Record<string, number> = {}

    for (const sample of this.samples) {
      const result = this.analyzeSample(sample)
      allResults.push(result)

      totalLines += sample.content.split('\n').length
      languages[sample.language] = (languages[sample.language] || 0) + 1

      // Count functions and classes (approximate from analysis)
      if (result.functionLength) {
        totalFunctions += result.functionLength.count || 0
      }
      if (result.namingPatterns) {
        totalClasses += result.namingPatterns.classCount || 0
      }
    }

    return {
      result: this.aggregateResults(allResults),
      metrics: {
        samples: this.samples.length,
        totalLines,
        totalFunctions,
        totalClasses,
        languages
      }
    }
  }

  /**
   * Analyze a single code sample
   */
  private analyzeSample(sample: CodeSample): Partial<ASTAnalysisResult> {
    const content = sample.content
    const language = sample.language

    // For TypeScript/JavaScript, do structural analysis
    if (['typescript', 'javascript', 'ts', 'js', 'tsx', 'jsx'].includes(language)) {
      return this.analyzeTypeScriptCode(content, sample.filePath)
    }

    // For other languages, do basic text analysis
    return this.analyzeGenericCode(content)
  }

  /**
   * Analyze TypeScript/JavaScript code structure
   */
  private analyzeTypeScriptCode(content: string, filePath: string): Partial<ASTAnalysisResult> {
    const lines = content.split('\n')

    const result: Partial<ASTAnalysisResult> = {
      functionLength: this.detectFunctionLength(lines),
      functionalStyle: this.detectFunctionalStyle(lines),
      namingPatterns: this.detectNamingPatterns(lines),
      errorPatterns: this.detectErrorPatterns(lines),
      testPatterns: this.detectTestPatterns(content, filePath),
      complexity: this.detectComplexity(lines)
    }

    return result
  }

  /**
   * Analyze generic code (non-TS/JS)
   */
  private analyzeGenericCode(content: string): Partial<ASTAnalysisResult> {
    const lines = content.split('\n')

    return {
      functionLength: this.detectFunctionLength(lines),
      complexity: this.detectComplexity(lines)
    }
  }

  /**
   * Detect function length distribution
   */
  private detectFunctionLength(lines: string[]): ASTAnalysisResult['functionLength'] & { count: number } {
    const functionLengths: number[] = []
    let count = 0

    // Detect function definitions using regex patterns
    const patterns = [
      /function\s+\w+\s*\([^)]*\)\s*{/,
      /const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*{)/,
      /\w+\s*\([^)]*\)\s*{/,  // Method calls
      /export\s+(?:const|function|class)\s+\w+/
    ]

    let inFunction = false
    let braceDepth = 0
    let functionStart = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!inFunction) {
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            inFunction = true
            functionStart = i
            braceDepth = (line.match(/{/g) || []).length
            count++
            break
          }
        }
      } else {
        const openBraces = (line.match(/{/g) || []).length
        const closeBraces = (line.match(/}/g) || []).length
        braceDepth += openBraces - closeBraces

        if (braceDepth <= 0) {
          const length = i - functionStart + 1
          if (length > 0) {
            functionLengths.push(length)
          }
          inFunction = false
          functionStart = -1
        }
      }
    }

    // Calculate statistics
    const total = functionLengths.length
    const average = total > 0 ? functionLengths.reduce((a, b) => a + b, 0) / total : 0
    const sorted = [...functionLengths].sort((a, b) => a - b)
    const median = total > 0 ? sorted[Math.floor(total / 2)] : 0
    const max = total > 0 ? sorted[sorted.length - 1] : 0

    // Classify by length (short: <10, medium: 10-30, long: >30)
    const short = functionLengths.filter(l => l < 10).length
    const medium = functionLengths.filter(l => l >= 10 && l <= 30).length
    const long = functionLengths.filter(l => l > 30).length

    return {
      average: Math.round(average),
      median,
      max,
      distribution: {
        short,
        medium,
        long
      },
      count
    }
  }

  /**
   * Detect functional programming patterns
   */
  private detectFunctionalStyle(lines: string[]): ASTAnalysisResult['functionalStyle'] {
    let mapUsage = 0
    let filterUsage = 0
    let reduceUsage = 0
    let loopUsage = 0

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect functional methods
      if (trimmed.match(/\.(map|flatMap)\s*\(/)) {
        mapUsage++
      }
      if (trimmed.match(/\.(filter|reject|select)\s*\(/)) {
        filterUsage++
      }
      if (trimmed.match(/\.(reduce|fold|inject)\s*\(/)) {
        reduceUsage++
      }

      // Detect loops
      if (trimmed.match(/\b(for|while|do)\s*\(/)) {
        loopUsage++
      }
    }

    const functionalCalls = mapUsage + filterUsage + reduceUsage
    const totalIterations = functionalCalls + loopUsage
    const functionalPreference = totalIterations > 0
      ? functionalCalls / totalIterations
      : 0.5

    return {
      mapUsage,
      filterUsage,
      reduceUsage,
      loopUsage,
      functionalPreference
    }
  }

  /**
   * Detect naming patterns
   */
  private detectNamingPatterns(lines: string[]): ASTAnalysisResult['namingPatterns'] & { classCount: number } {
    const variables = { camelCase: 0, pascalCase: 0, other: 0 }
    const functions = { camelCase: 0, pascalCase: 0, other: 0 }
    const classes = { pascalCase: 0, other: 0 }
    const variableLengths: number[] = []
    let classCount = 0

    // Patterns for different declarations
    const patterns = {
      variableConst: /const\s+([a-zA-Z_$][\w$]*)\s*=/,
      variableLet: /let\s+([a-zA-Z_$][\w$]*)\s*=/,
      function: /function\s+([a-zA-Z_$][\w$]*)\s*\(/,
      arrowFunction: /(?:const|let)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:\([^)]*\)\s*=>)/,
      class: /class\s+([a-zA-Z_$][\w$]*)/,
      method: /\s+(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/,
      exportClass: /export\s+class\s+([a-zA-Z_$][\w$]*)/,
      exportFunction: /export\s+(?:const|function)\s+([a-zA-Z_$][\w$]*)/
    }

    for (const line of lines) {
      const trimmed = line.trim()

      // Match variables
      let match = trimmed.match(patterns.variableConst || patterns.variableLet)
      if (match) {
        const name = match[1]
        variableLengths.push(name.length)

        if (name.match(/^[a-z][a-zA-Z0-9]*$/)) {
          variables.camelCase++
        } else if (name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          variables.pascalCase++
        } else {
          variables.other++
        }
        continue
      }

      // Match functions
      match = trimmed.match(patterns.function || patterns.arrowFunction || patterns.exportFunction)
      if (match) {
        const name = match[1]

        if (name.match(/^[a-z][a-zA-Z0-9]*$/)) {
          functions.camelCase++
        } else if (name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          functions.pascalCase++
        } else {
          functions.other++
        }
        continue
      }

      // Match classes
      match = trimmed.match(patterns.class || patterns.exportClass)
      if (match) {
        const name = match[1]
        classCount++

        if (name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          classes.pascalCase++
        } else {
          classes.other++
        }
        continue
      }
    }

    const totalVariables = variables.camelCase + variables.pascalCase + variables.other
    const avgVariableLength = totalVariables > 0
      ? variableLengths.reduce((a, b) => a + b, 0) / totalVariables
      : 0

    return {
      variables,
      functions,
      classes,
      classCount,
      avgVariableLength: Math.round(avgVariableLength * 10) / 10
    }
  }

  /**
   * Detect error handling patterns
   */
  private detectErrorPatterns(lines: string[]): ASTAnalysisResult['errorPatterns'] {
    let tryCatchCount = 0
    let throwCount = 0
    let errorReturnCount = 0
    let explicitErrorCount = 0

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.match(/\btry\s*{/)) {
        tryCatchCount++
      }

      if (trimmed.match(/\bthrow\s+(?:new\s+)?(?:Error|TypeError|RangeError|ReferenceError|SyntaxError)/)) {
        throwCount++
      }

      if (trimmed.match(/return\s+(?:error|err|null)/)) {
        errorReturnCount++
      }

      if (trimmed.match(/\.(?:error|Error)\(/)) {
        explicitErrorCount++
      }
    }

    // Determine dominant strategy
    let dominantStrategy: ASTAnalysisResult['errorPatterns']['dominantStrategy'] = 'none'

    const maxCount = Math.max(tryCatchCount, throwCount, errorReturnCount, explicitErrorCount)

    if (maxCount === 0) {
      dominantStrategy = 'none'
    } else if (tryCatchCount === maxCount) {
      dominantStrategy = 'try_catch'
    } else if (throwCount === maxCount) {
      dominantStrategy = 'throw'
    } else if (errorReturnCount === maxCount) {
      dominantStrategy = 'return_error'
    }

    return {
      tryCatchCount,
      throwCount,
      errorReturnCount,
      explicitErrorCount,
      dominantStrategy
    }
  }

  /**
   * Detect test patterns
   */
  private detectTestPatterns(content: string, filePath: string): ASTAnalysisResult['testPatterns'] {
    const isTestFile = filePath.includes('.test.') ||
                     filePath.includes('.spec.') ||
                     filePath.includes('__tests__') ||
                     filePath.includes('/test/') ||
                     filePath.includes('/tests/')

    if (!isTestFile) {
      return {
        testCount: 0,
        assertionCount: 0,
        mockCount: 0,
        describeBlocks: 0,
        avgAssertionsPerTest: 0,
        hasMocks: false
      }
    }

    const lines = content.split('\n')

    const testCount = lines.filter(l =>
      l.match(/\b(test|it)\s*\(/) || l.match(/\bdescribe\s*\(/)
    ).length

    const assertionCount = lines.filter(l =>
      l.match(/\b(expect|assert)\s*\(/) ||
      l.match(/\b(toEqual|toBe|toStrictEqual|toEqual)\s*\(/)
    ).length

    const mockCount = lines.filter(l =>
      l.match(/\bmock\(/) ||
      l.match(/jest\.mock\(/) ||
      l.match(/\bjest\.fn\(\)/)
    ).length

    const describeBlocks = lines.filter(l =>
      l.match(/\bdescribe\s*\(/)
    ).length

    const avgAssertionsPerTest = testCount > 0
      ? assertionCount / testCount
      : 0

    const hasMocks = mockCount > 0

    return {
      testCount,
      assertionCount,
      mockCount,
      describeBlocks,
      avgAssertionsPerTest: Math.round(avgAssertionsPerTest * 10) / 10,
      hasMocks
    }
  }

  /**
   * Detect code complexity metrics
   */
  private detectComplexity(lines: string[]): ASTAnalysisResult['complexity'] {
    let maxNestingDepth = 0
    let currentDepth = 0
    let cyclomaticComplexity = 1 // Base complexity

    for (const line of lines) {
      const trimmed = line.trim()

      // Count decision points for cyclomatic complexity
      if (trimmed.match(/\b(if|else if|for|while|case|catch)\s*\(/)) {
        cyclomaticComplexity++
      }

      if (trimmed.includes('?') && trimmed.includes(':')) {
        // Ternary operator
        cyclomaticComplexity++
      }

      // Track nesting depth
      const openBraces = (trimmed.match(/{/g) || []).length
      const closeBraces = (trimmed.match(/}/g) || []).length
      const openParens = (trimmed.match(/\(/g) || []).length
      const closeParens = (trimmed.match(/\)/g) || []).length

      currentDepth += openBraces + openParens - closeBraces - closeParens
      maxNestingDepth = Math.max(maxNestingDepth, currentDepth)
    }

    const avgNestingDepth = maxNestingDepth > 0 ? maxNestingDepth / 2 : 0

    return {
      avgNestingDepth: Math.round(avgNestingDepth),
      maxNestingDepth,
      cyclomaticComplexity
    }
  }

  /**
   * Aggregate multiple analysis results
   */
  private aggregateResults(results: Partial<ASTAnalysisResult>[]): ASTAnalysisResult {
    const totalCount = results.length

    // Helper to average numeric arrays
    const average = (values: (number | undefined)[]): number => {
      const valid = values.filter((v): v is number => typeof v === 'number')
      return valid.length > 0
        ? valid.reduce((a, b) => a + b, 0) / valid.length
        : 0
    }

    // Helper to sum numeric arrays
    const sum = (values: (number | undefined)[]): number => {
      const valid = values.filter((v): v is number => typeof v === 'number')
      return valid.reduce((a, b) => a + b, 0)
    }

    // Aggregate function lengths
    const functionLengths = results.map(r => r.functionLength).filter(Boolean) as Array<{
      average: number
      median: number
      max: number
      distribution: { short: number; medium: number; long: number }
    }>

    const avgFunctionLength = average(functionLengths.map(f => f.average))
    const maxFunctionLength = Math.max(...functionLengths.map(f => f.max), 0)

    const totalShort = sum(functionLengths.map(f => f.distribution.short))
    const totalMedium = sum(functionLengths.map(f => f.distribution.medium))
    const totalLong = sum(functionLengths.map(f => f.distribution.long))

    // Aggregate functional style
    const functionalStyles = results.map(r => r.functionalStyle).filter(Boolean) as Array<{
      mapUsage: number
      filterUsage: number
      reduceUsage: number
      loopUsage: number
      functionalPreference: number
    }>

    const totalMap = sum(functionalStyles.map(f => f.mapUsage))
    const totalFilter = sum(functionalStyles.map(f => f.filterUsage))
    const totalReduce = sum(functionalStyles.map(f => f.reduceUsage))
    const totalLoops = sum(functionalStyles.map(f => f.loopUsage))
    const avgFunctionalPreference = average(functionalStyles.map(f => f.functionalPreference))

    // Aggregate naming patterns
    const namingPatterns = results.map(r => r.namingPatterns).filter(Boolean) as Array<{
      variables: { camelCase: number; pascalCase: number; other: number }
      functions: { camelCase: number; pascalCase: number; other: number }
      classes: { pascalCase: number; other: number }
      avgVariableLength: number
    }>

    const avgVariableLength = average(namingPatterns.map(n => n.avgVariableLength))

    // Aggregate error patterns
    const errorPatterns = results.map(r => r.errorPatterns).filter(Boolean) as Array<{
      tryCatchCount: number
      throwCount: number
      errorReturnCount: number
      explicitErrorCount: number
      dominantStrategy: 'try_catch' | 'throw' | 'return_error' | 'none'
    }>

    const totalTryCatch = sum(errorPatterns.map(e => e.tryCatchCount))
    const totalThrow = sum(errorPatterns.map(e => e.throwCount))
    const totalErrorReturn = sum(errorPatterns.map(e => e.errorReturnCount))

    let dominantStrategy: ASTAnalysisResult['errorPatterns']['dominantStrategy'] = 'none'
    const maxErrorCount = Math.max(totalTryCatch, totalThrow, totalErrorReturn)

    if (maxErrorCount === totalTryCatch) {
      dominantStrategy = 'try_catch'
    } else if (maxErrorCount === totalThrow) {
      dominantStrategy = 'throw'
    } else if (maxErrorCount === totalErrorReturn) {
      dominantStrategy = 'return_error'
    }

    // Aggregate test patterns
    const testPatterns = results.map(r => r.testPatterns).filter(Boolean) as Array<{
      testCount: number
      assertionCount: number
      mockCount: number
      describeBlocks: number
      avgAssertionsPerTest: number
      hasMocks: boolean
    }>

    const totalTests = sum(testPatterns.map(t => t.testCount))
    const totalAssertions = sum(testPatterns.map(t => t.assertionCount))
    const totalMocks = sum(testPatterns.map(t => t.mockCount))
    const avgAssertionsPerTest = average(testPatterns.map(t => t.avgAssertionsPerTest))
    const hasAnyMocks = testPatterns.some(t => t.hasMocks)

    // Aggregate complexity
    const complexities = results.map(r => r.complexity).filter(Boolean) as Array<{
      avgNestingDepth: number
      maxNestingDepth: number
      cyclomaticComplexity: number
    }>

    const avgNestingDepth = average(complexities.map(c => c.avgNestingDepth))
    const maxNestingDepth = Math.max(...complexities.map(c => c.maxNestingDepth), 0)
    const avgCyclomaticComplexity = average(complexities.map(c => c.cyclomaticComplexity))

    return {
      functionLength: {
        average: Math.round(avgFunctionLength),
        median: 0, // Would need raw data to calculate
        max: maxFunctionLength,
        distribution: {
          short: totalShort,
          medium: totalMedium,
          long: totalLong
        }
      },
      functionalStyle: {
        mapUsage: totalMap,
        filterUsage: totalFilter,
        reduceUsage: totalReduce,
        loopUsage: totalLoops,
        functionalPreference: Math.round(avgFunctionalPreference * 100) / 100
      },
      namingPatterns: {
        variables: { camelCase: 0, pascalCase: 0, other: 0 },
        functions: { camelCase: 0, pascalCase: 0, other: 0 },
        classes: { pascalCase: 0, other: 0 },
        avgVariableLength: Math.round(avgVariableLength * 10) / 10
      },
      errorPatterns: {
        tryCatchCount: totalTryCatch,
        throwCount: totalThrow,
        errorReturnCount: totalErrorReturn,
        explicitErrorCount: 0,
        dominantStrategy
      },
      testPatterns: {
        testCount: totalTests,
        assertionCount: totalAssertions,
        mockCount: totalMocks,
        describeBlocks: 0,
        avgAssertionsPerTest: Math.round(avgAssertionsPerTest * 10) / 10,
        hasMocks: hasAnyMocks
      },
      complexity: {
        avgNestingDepth: Math.round(avgNestingDepth),
        maxNestingDepth,
        cyclomaticComplexity: Math.round(avgCyclomaticComplexity)
      }
    }
  }
}

/**
 * Convenience function to analyze code samples using AST
 */
export function analyzeCodeAST(samples: CodeSample[]): {
  result: ASTAnalysisResult
  metrics: ASTCodeMetrics
} {
  const analyzer = new ASTAnalyzer(samples)
  return analyzer.analyze()
}
