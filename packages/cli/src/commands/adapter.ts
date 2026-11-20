#!/usr/bin/env node

/**
 * Adapter Commands for Idiomark CLI
 *
 * Provides commands for creating, validating, testing, and managing adapters
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

// Import generators
import { generateRestAdapter } from '../generators/rest-generator'
import { generateGraphqlAdapter } from '../generators/graphql-generator'
import { generateScrapeAdapter } from '../generators/scrape-generator'
import { generateRssAdapter } from '../generators/rss-generator'
import { generateEmailAdapter } from '../generators/email-generator'
import { generateForumAdapter } from '../generators/forum-generator'

// Import validators
import { validateAdapter } from '../validators/adapter-validator'

// Import test runner
import { testAdapter } from '../utils/test-runner'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Find the monorepo root directory by traversing up from the current file location.
 * The CLI is bundled to packages/cli/dist/index.mjs, so we need to go up 3 levels
 * to reach the monorepo root: dist -> cli -> packages -> root
 */
function findMonorepoRoot(): string {
  // From packages/cli/dist/index.mjs -> monorepo root
  // Go up 3 levels: dist -> cli -> packages -> root
  return path.resolve(__dirname, '..', '..', '..')
}

/**
 * Get the path to the adapters directory in the monorepo
 */
function getAdaptersPath(): string {
  return path.join(findMonorepoRoot(), 'packages', 'adapters')
}

// Types
interface CreateOptions {
  template: 'rest' | 'graphql' | 'scrape' | 'rss' | 'email' | 'forum'
  auth: 'oauth2' | 'bearer' | 'apikey' | 'none'
  baseUrl: string
  docs: string
  output: string
  description: string
  interactive: boolean
}

interface AdapterInfo {
  name: string
  template: string
  auth: string
  baseUrl?: string
  docs?: string
  description?: string
  status: 'working' | 'experimental' | 'deprecated'
  rateLimit?: {
    requests: number
    window: string
  }
}

// ============================================
// Create Command
// ============================================

export async function createAdapter(name: string, options: Partial<CreateOptions>): Promise<void> {
  const spinner = ora('Creating adapter...').start()

  try {
    let finalOptions: CreateOptions

    if (options.interactive) {
      // Interactive mode
      spinner.stop()
      const answers = await promptForAdapterDetails(name)
      finalOptions = {
        template: answers.template,
        auth: answers.auth,
        baseUrl: answers.baseUrl,
        docs: answers.docs,
        output: answers.output,
        description: answers.description,
        interactive: true
      }
      spinner.start()
    } else {
      // Non-interactive mode - use defaults for missing options
      finalOptions = {
        template: options.template || 'rest',
        auth: options.auth || 'none',
        baseUrl: options.baseUrl || '',
        docs: options.docs || '',
        output: options.output || path.join(process.cwd(), 'packages', 'adapters', name),
        description: options.description || `${name} adapter for Idiomark Protocol`,
        interactive: false
      }
    }

    // Validate adapter name
    if (!/^[a-z0-9-]+$/.test(name)) {
      spinner.fail('Invalid adapter name')
      console.error(chalk.red('Adapter name must contain only lowercase letters, numbers, and hyphens'))
      process.exit(1)
    }

    // Create output directory
    const outputPath = path.resolve(finalOptions.output)
    await fs.mkdir(outputPath, { recursive: true })
    await fs.mkdir(path.join(outputPath, 'src'), { recursive: true })

    spinner.text = 'Generating adapter files...'

    // Generate files based on template
    const generators = {
      rest: generateRestAdapter,
      graphql: generateGraphqlAdapter,
      scrape: generateScrapeAdapter,
      rss: generateRssAdapter,
      email: generateEmailAdapter,
      forum: generateForumAdapter
    }

    const generator = generators[finalOptions.template]
    const files = await generator(name, finalOptions)

    // Write files
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(outputPath, filePath)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, content, 'utf-8')
    }

    spinner.succeed('Adapter created successfully!')

    console.log(chalk.green('\nAdapter created at:'), chalk.cyan(outputPath))
    console.log(chalk.gray('\nNext steps:'))
    console.log(`  1. cd ${path.relative(process.cwd(), outputPath)}`)
    console.log('  2. npm install')
    console.log('  3. Implement the adapter methods in src/index.ts')
    console.log('  4. npm run build')
    console.log(`  5. idiomark adapter validate ${name}`)

  } catch (error) {
    spinner.fail('Failed to create adapter')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

async function promptForAdapterDetails(name: string): Promise<CreateOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Select adapter template:',
      choices: [
        { name: 'REST API', value: 'rest' },
        { name: 'GraphQL API', value: 'graphql' },
        { name: 'Web Scraper', value: 'scrape' },
        { name: 'RSS/Atom Feed', value: 'rss' },
        { name: 'Email/Newsletter', value: 'email' },
        { name: 'Forum/Community', value: 'forum' }
      ]
    },
    {
      type: 'list',
      name: 'auth',
      message: 'Select authentication type:',
      choices: [
        { name: 'None (Public API)', value: 'none' },
        { name: 'API Key', value: 'apikey' },
        { name: 'Bearer Token', value: 'bearer' },
        { name: 'OAuth2', value: 'oauth2' }
      ]
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Enter API base URL (if applicable):',
      default: '',
      when: (answers) => ['rest', 'graphql'].includes(answers.template)
    },
    {
      type: 'input',
      name: 'docs',
      message: 'Enter API documentation URL:',
      default: '',
      validate: (input) => input === '' || /^https?:\/\//.test(input) || 'Please enter a valid URL'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter adapter description:',
      default: `${name} adapter for Idiomark Protocol`
    },
    {
      type: 'input',
      name: 'output',
      message: 'Enter output directory:',
      default: path.join(process.cwd(), 'packages', 'adapters', name)
    }
  ])

  return answers as CreateOptions
}

// ============================================
// Validate Command
// ============================================

export async function validateAdapterCmd(name: string, options: { strict?: boolean }): Promise<void> {
  const spinner = ora('Validating adapter...').start()

  try {
    // Find adapter directory
    const adapterPath = await findAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Adapter not found')
      console.error(chalk.red(`Adapter "${name}" not found in packages/adapters/`))
      process.exit(1)
    }

    const result = await validateAdapter(adapterPath, options.strict || false)

    if (result.valid) {
      spinner.succeed('Adapter is valid!')
      console.log(chalk.green('\nValidation results:'))
      console.log(`  Interface: ${chalk.green('✓')} Implements BaseAdapter correctly`)
      console.log(`  Types: ${chalk.green('✓')} TypeScript types are valid`)
      console.log(`  Exports: ${chalk.green('✓')} Required functions exported`)
      console.log(`  README: ${chalk.green('✓')} Documentation is complete`)
      console.log(`  Build: ${chalk.green('✓')} Builds successfully`)
    } else {
      spinner.fail('Adapter validation failed')
      console.error(chalk.red('\nValidation errors:'))
      for (const error of result.errors) {
        console.error(`  ${chalk.red('✗')} ${error.message}`)
        if (error.field) {
          console.error(`    Field: ${error.field}`)
        }
      }
      process.exit(1)
    }
  } catch (error) {
    spinner.fail('Validation failed')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

// ============================================
// Test Command
// ============================================

export async function testAdapterCmd(name: string, options: {
  mock?: boolean
  live?: boolean
  username?: string
}): Promise<void> {
  const spinner = ora('Testing adapter...').start()

  try {
    // Find adapter directory
    const adapterPath = await findAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Adapter not found')
      console.error(chalk.red(`Adapter "${name}" not found in packages/adapters/`))
      process.exit(1)
    }

    const testMode = options.live ? 'live' : 'mock'
    const result = await testAdapter(adapterPath, {
      mode: testMode,
      username: options.username
    })

    spinner.succeed('Tests completed!')

    console.log(chalk.green('\nTest results:'))
    console.log(`  Mode: ${chalk.cyan(result.mode)}`)
    console.log(`  Tests run: ${chalk.cyan(result.testsRun)}`)
    console.log(`  Passed: ${chalk.green(result.passed)}`)
    console.log(`  Failed: ${result.failed > 0 ? chalk.red(result.failed) : chalk.green(result.failed)}`)
    console.log(`  Duration: ${chalk.cyan(`${result.duration}ms`)}`)

    if (result.errors.length > 0) {
      console.error(chalk.red('\nErrors:'))
      for (const error of result.errors) {
        console.error(`  ${chalk.red('✗')} ${error}`)
      }
    }

    if (options.live && result.failed === 0) {
      console.log(chalk.green('\nLive API tests passed!'))
    }

  } catch (error) {
    spinner.fail('Test failed')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

// ============================================
// List Command
// ============================================

export async function listAdapters(): Promise<void> {
  const spinner = ora('Scanning for adapters...').start()

  try {
    const adaptersPath = getAdaptersPath()
    const adapters: AdapterInfo[] = []

    // Check if adapters directory exists
    try {
      await fs.access(adaptersPath)
    } catch {
      spinner.fail('Adapters directory not found')
      console.error(chalk.red(`Expected adapters at: ${adaptersPath}`))
      console.error(chalk.gray('Make sure you are running the CLI from within the idiomark-protocol monorepo'))
      process.exit(1)
    }

    const entries = await fs.readdir(adaptersPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const info = await getAdapterInfo(path.join(adaptersPath, entry.name))
        if (info) {
          adapters.push(info)
        }
      }
    }

    spinner.stop()

    if (adapters.length === 0) {
      console.log(chalk.yellow('No adapters found'))
      console.log(chalk.gray(`Create one with: idiomark adapter create <name>`))
      return
    }

    console.log(chalk.bold('\nInstalled Adapters:\n'))

    // Group by status
    const working = adapters.filter(a => a.status === 'working')
    const experimental = adapters.filter(a => a.status === 'experimental')
    const deprecated = adapters.filter(a => a.status === 'deprecated')

    if (working.length > 0) {
      console.log(chalk.green('Working:'))
      for (const adapter of working) {
        printAdapterInfo(adapter)
      }
    }

    if (experimental.length > 0) {
      console.log(chalk.yellow('\nExperimental:'))
      for (const adapter of experimental) {
        printAdapterInfo(adapter)
      }
    }

    if (deprecated.length > 0) {
      console.log(chalk.red('\nDeprecated:'))
      for (const adapter of deprecated) {
        printAdapterInfo(adapter)
      }
    }

  } catch (error) {
    spinner.fail('Failed to list adapters')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

function printAdapterInfo(info: AdapterInfo): void {
  const statusIcon = info.status === 'working' ? chalk.green('✓') : info.status === 'experimental' ? chalk.yellow('⚠') : chalk.red('✗')
  console.log(`  ${statusIcon} ${chalk.bold(info.name)} (${chalk.gray(info.template)})`)

  if (info.description) {
    console.log(`    ${chalk.gray(info.description)}`)
  }

  const details: string[] = []
  if (info.baseUrl) details.push(chalk.cyan(`API: ${info.baseUrl}`))
  if (info.rateLimit) details.push(chalk.yellow(`Rate: ${info.rateLimit.requests}/${info.rateLimit.window}`))

  if (details.length > 0) {
    console.log(`    ${details.join(' | ')}`)
  }
  console.log()
}

// ============================================
// Info Command
// ============================================

export async function infoAdapter(name: string): Promise<void> {
  const spinner = ora(`Loading adapter info...`).start()

  try {
    const adapterPath = await findAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Adapter not found')
      console.error(chalk.red(`Adapter "${name}" not found in packages/adapters/`))
      process.exit(1)
    }

    const info = await getDetailedAdapterInfo(adapterPath)
    spinner.stop()

    console.log(chalk.bold(`\n${info.name}`))
    console.log(chalk.gray('='.repeat(info.name.length)))
    console.log()

    if (info.description) {
      console.log(`${chalk.bold('Description:')} ${info.description}`)
      console.log()
    }

    console.log(`${chalk.bold('Type:')} ${info.template}`)
    console.log(`${chalk.bold('Auth:')} ${info.auth}`)
    console.log(`${chalk.bold('Status:')} ${statusColor(info.status)}`)

    if (info.baseUrl) {
      console.log(`${chalk.bold('Base URL:')} ${chalk.cyan(info.baseUrl)}`)
    }

    if (info.docs) {
      console.log(`${chalk.bold('Docs:')} ${chalk.cyan(info.docs)}`)
    }

    if (info.rateLimit) {
      console.log(`${chalk.bold('Rate Limit:')} ${info.rateLimit.requests} requests per ${info.rateLimit.window}`)
    }

    if (info.exampleUsage) {
      console.log(chalk.bold('\nExample Usage:'))
      console.log(chalk.gray(info.exampleUsage))
    }

    if (info.setupInstructions) {
      console.log(chalk.bold('\nSetup Instructions:'))
      for (const step of info.setupInstructions) {
        console.log(`  ${chalk.gray('•')} ${step}`)
      }
    }

  } catch (error) {
    spinner.fail('Failed to load adapter info')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'working': return chalk.green('Working')
    case 'experimental': return chalk.yellow('Experimental')
    case 'deprecated': return chalk.red('Deprecated')
    default: return status
  }
}

// ============================================
// Helper Functions
// ============================================

async function findAdapterPath(name: string): Promise<string | null> {
  const possiblePaths = [
    // First try relative to monorepo root
    path.join(findMonorepoRoot(), 'packages', 'adapters', name),
    // Then try relative to current working directory (for local development)
    path.join(process.cwd(), 'packages', 'adapters', name),
    // Also check if CWD is inside an adapter directory
    path.join(process.cwd(), name),
  ]

  for (const p of possiblePaths) {
    try {
      const stat = await fs.stat(p)
      if (stat.isDirectory()) {
        return p
      }
    } catch {
      // Continue
    }
  }

  return null
}

async function getAdapterInfo(adapterPath: string): Promise<AdapterInfo | null> {
  try {
    const packageJsonPath = path.join(adapterPath, 'package.json')
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))

    const name = packageJson.name?.replace('@idiomark/adapter-', '') || path.basename(adapterPath)

    // Try to read README for description
    let description = packageJson.description
    const readmePath = path.join(adapterPath, 'README.md')
    try {
      const readme = await fs.readFile(readmePath, 'utf-8')
      const match = readme.match(/^#\s+[^\n]+\n+(.+)$/m)
      if (match) {
        description = match[1]
      }
    } catch {
      // No README
    }

    return {
      name,
      template: packageJson.idiomark?.template || 'unknown',
      auth: packageJson.idiomark?.auth || 'none',
      baseUrl: packageJson.idiomark?.baseUrl,
      docs: packageJson.idiomark?.docs,
      description,
      status: packageJson.idiomark?.status || 'experimental'
    }
  } catch {
    return null
  }
}

async function getDetailedAdapterInfo(adapterPath: string): Promise<AdapterInfo & {
  exampleUsage?: string
  setupInstructions?: string[]
}> {
  const basicInfo = await getAdapterInfo(adapterPath)
  if (!basicInfo) {
    throw new Error('Could not read adapter info')
  }

  const readmePath = path.join(adapterPath, 'README.md')
  let exampleUsage: string | undefined
  let setupInstructions: string[] | undefined

  try {
    const readme = await fs.readFile(readmePath, 'utf-8')

    // Extract example usage
    const usageMatch = readme.match(/## Usage\s+```(?:ts|javascript)\n([\s\S]+?)```/)
    if (usageMatch) {
      exampleUsage = usageMatch[1].trim()
    }

    // Extract setup instructions
    const setupMatch = readme.match(/## Setup\s+([\s\S]+?)(?=\n##|\n*$)/)
    if (setupMatch) {
      const steps = setupMatch[1]
        .split(/\n\d+\.\s*/)
        .filter(s => s.trim())
        .map(s => s.trim())
      setupInstructions = steps
    }
  } catch {
    // No README
  }

  return {
    ...basicInfo,
    exampleUsage,
    setupInstructions
  }
}

// ============================================
// Command Registration
// ============================================

export function registerAdapterCommands(program: Command): void {
  const adapterCmd = program.command('adapter').description('Adapter management commands')

  // Create command
  adapterCmd
    .command('create <name>')
    .description('Create a new adapter')
    .option('-t, --template <type>', 'Adapter template (rest, graphql, scrape, rss, email, forum)')
    .option('-a, --auth <type>', 'Auth type (oauth2, bearer, apikey, none)')
    .option('-b, --base-url <url>', 'API base URL')
    .option('-d, --docs <url>', 'API documentation URL')
    .option('-o, --output <path>', 'Output directory')
    .option('-D, --description <text>', 'Adapter description')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .action(createAdapter)

  // Validate command
  adapterCmd
    .command('validate <name>')
    .description('Validate an adapter')
    .option('-s, --strict', 'Strict validation mode')
    .action(validateAdapterCmd)

  // Test command
  adapterCmd
    .command('test <name>')
    .description('Test an adapter')
    .option('-m, --mock', 'Use mock data (default)')
    .option('-l, --live', 'Make real API calls')
    .option('-u, --username <user>', 'Test with specific user')
    .action(testAdapterCmd)

  // List command
  adapterCmd
    .command('list')
    .description('List all installed adapters')
    .action(listAdapters)

  // Info command
  adapterCmd
    .command('info <name>')
    .description('Show detailed information about an adapter')
    .action(infoAdapter)
}
