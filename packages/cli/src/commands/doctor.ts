import * as fs from 'fs/promises'
import * as path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { IdiomarkValidator } from '@idiomark/core'

interface DoctorResult {
  status: 'error' | 'warning' | 'pass'
  message: string
  category: string
}

interface HealthCheckResult {
  overall: 'FAILED' | 'NEEDS ATTENTION' | 'HEALTHY'
  checks: DoctorResult[]
}

export async function doctor(filePath: string): Promise<void> {
  const spinner = ora('Running Idiomark health check...').start()

  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8')
    const idiomarkFile = JSON.parse(content)
    const checks: DoctorResult[] = []

    // 1. Schema validity
    spinner.text = 'Checking schema validity...'
    const validator = new IdiomarkValidator({ strict: false })
    const validation = await validator.validate(idiomarkFile)

    if (!validation.valid) {
      checks.push({
        status: 'error',
        message: `Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        category: 'Schema'
      })
    } else {
      checks.push({
        status: 'pass',
        message: 'Idiomark file conforms to schema',
        category: 'Schema'
      })
    }

    // 2. Required fields
    spinner.text = 'Checking required fields...'
    const requiredFields = ['id', 'idiomark', 'created', 'metadata', 'personality']
    const missingFields = requiredFields.filter(field => !(field in idiomarkFile))

    if (missingFields.length > 0) {
      checks.push({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        category: 'Structure'
      })
    } else {
      checks.push({
        status: 'pass',
        message: 'All required fields present',
        category: 'Structure'
      })
    }

    // 3. Confidence levels
    spinner.text = 'Analyzing confidence levels...'
    // Check both direct confidence and nested in tone.primary.confidence
    let confidence = idiomarkFile.personality?.confidence
    if (typeof confidence !== 'number') {
      confidence = idiomarkFile.personality?.voice?.tone?.confidence
    }
    if (typeof confidence === 'number') {
      if (confidence < 0.4) {
        checks.push({
          status: 'warning',
          message: `Low confidence score (${confidence.toFixed(2)}). Consider more training data.`,
          category: 'Confidence'
        })
      } else if (confidence >= 0.7) {
        checks.push({
          status: 'pass',
          message: `High confidence score (${confidence.toFixed(2)}) - excellent reliability`,
          category: 'Confidence'
        })
      } else {
        checks.push({
          status: 'pass',
          message: `Moderate confidence score (${confidence.toFixed(2)})`,
          category: 'Confidence'
        })
      }
    } else {
      checks.push({
        status: 'warning',
        message: 'No confidence score found',
        category: 'Confidence'
      })
    }

    // 4. Data sources
    spinner.text = 'Checking data source diversity...'
    const sources = idiomarkFile.metadata?.sources || idiomarkFile.metadata?.entity?.sources || []
    // Handle both array of strings and array of objects with type property
    const sourceCount = sources.length > 0
      ? new Set(sources.map((s: any) => typeof s === 'string' ? s : s?.type || 'unknown')).size
      : 0

    if (sourceCount < 2) {
      checks.push({
        status: 'warning',
        message: `Only ${sourceCount} data source(s). Multiple sources improve reliability.`,
        category: 'Data Sources'
      })
    } else {
      checks.push({
        status: 'pass',
        message: `${sourceCount} distinct data source(s) - good diversity`,
        category: 'Data Sources'
      })
    }

    // 5. Sample size
    spinner.text = 'Analyzing sample size...'
    // Check both old structure (sources with sampleSize) and new structure (extraction.sample_size)
    let totalSamples = 0
    if (typeof idiomarkFile.metadata?.extraction?.sample_size === 'number') {
      totalSamples = idiomarkFile.metadata.extraction.sample_size
    } else {
      totalSamples = sources.reduce((sum: number, s: any) => sum + (s?.sampleSize || 0), 0)
    }

    if (totalSamples < 500) {
      checks.push({
        status: 'warning',
        message: `Small sample size (${totalSamples}). Aim for 500+ samples for better accuracy.`,
        category: 'Sample Size'
      })
    } else {
      checks.push({
        status: 'pass',
        message: `Healthy sample size (${totalSamples} samples)`,
        category: 'Sample Size'
      })
    }

    spinner.stop()

    // Determine overall status
    const errors = checks.filter(c => c.status === 'error').length
    const warnings = checks.filter(c => c.status === 'warning').length

    let overall: 'FAILED' | 'NEEDS ATTENTION' | 'HEALTHY'
    if (errors > 0) {
      overall = 'FAILED'
    } else if (warnings > 0) {
      overall = 'NEEDS ATTENTION'
    } else {
      overall = 'HEALTHY'
    }

    const result: HealthCheckResult = { overall, checks }

    // Display results
    console.log('')
    console.log(chalk.bold('Idiomark Health Check Report'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log('')

    // Overall verdict
    if (overall === 'HEALTHY') {
      console.log(chalk.green.bold('✓ Overall Status: HEALTHY'))
    } else if (overall === 'NEEDS ATTENTION') {
      console.log(chalk.yellow.bold('⚠ Overall Status: NEEDS ATTENTION'))
    } else {
      console.log(chalk.red.bold('✗ Overall Status: FAILED'))
    }

    console.log('')

    // Individual checks
    for (const check of checks) {
      const icon = check.status === 'error' ? chalk.red('✗') :
                   check.status === 'warning' ? chalk.yellow('⚠') :
                   chalk.green('✓')
      const category = chalk.gray(`[${check.category}]`)
      console.log(`${icon} ${category} ${check.message}`)
    }

    console.log('')
    console.log(chalk.gray(`File: ${path.resolve(filePath)}`))
    console.log('')

    // Exit with appropriate code
    process.exit(overall === 'FAILED' ? 1 : 0)

  } catch (error) {
    spinner.fail('Health check failed')
    if (error instanceof Error && error.message.includes('ENOENT')) {
      console.error(chalk.red(`Error: File not found: ${filePath}`))
    } else {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
    process.exit(1)
  }
}
