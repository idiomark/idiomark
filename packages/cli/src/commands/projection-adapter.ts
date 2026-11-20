#!/usr/bin/env node

/**
 * Projection Adapter Commands for Idiomark CLI
 *
 * Provides commands for creating, validating, testing, and managing projection adapters
 * Projection adapters apply Idiomark personalities TO external systems
 *
 * Enhanced with dry-run, force, custom templates, improved validation,
 * testing enhancements, filtering, JSON output, and more.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import type { ExecException } from 'child_process'

// Import generators
import { generateMCPAdapter } from '../generators/projection/mcp-generator'
import { generateUCPAdapter } from '../generators/projection/ucp-generator'
import { generateHTTPAdapter } from '../generators/projection/http-generator'
import { generateGamingAdapter } from '../generators/projection/gaming-generator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================
// Types
// ============================================================

interface ProjectionCreateOptions {
  type: 'mcp' | 'ucp' | 'http' | 'gaming' | 'custom'
  transport?: 'stdio' | 'http'
  port?: number
  output: string
  description: string
  interactive: boolean
  dryRun?: boolean
  force?: boolean
  minimal?: boolean
  template?: string
  addTools?: boolean
  addResources?: boolean
}

interface ProjectionAdapterInfo {
  name: string
  type: string
  transport?: string
  port?: number
  description?: string
  status: 'working' | 'experimental' | 'deprecated'
  lastUpdated?: string
  dependencies?: string[]
  version?: string
}

interface ValidationResult {
  name: string
  passed: boolean
  message?: string
  details?: string
}

// ============================================================
// Create Command
// ============================================================

export async function createProjectionAdapter(name: string, options: Partial<ProjectionCreateOptions>): Promise<void> {
  const spinner = ora('Creating projection adapter...').start()

  try {
    let finalOptions: ProjectionCreateOptions

    if (options.interactive) {
      spinner.stop()
      const answers = await promptForProjectionDetails(name)
      finalOptions = {
        ...answers,
        dryRun: options.dryRun,
        force: options.force,
        minimal: options.minimal,
        template: options.template
      }
      spinner.start()
    } else {
      finalOptions = {
        type: options.type || 'http',
        transport: options.transport || 'stdio',
        port: options.port,
        output: options.output || path.join(process.cwd(), 'packages', 'projectors', name),
        description: options.description || `${name} projection adapter for Idiomark Protocol`,
        interactive: false,
        dryRun: options.dryRun || false,
        force: options.force || false,
        minimal: options.minimal || false,
        template: options.template
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

    // Check if directory exists
    const dirExists = await checkDirectoryExists(outputPath)
    if (dirExists && !finalOptions.force) {
      spinner.fail('Directory already exists')
      console.error(chalk.red(`Directory ${outputPath} already exists.`))
      console.error(chalk.gray('Use --force to overwrite or choose a different output path.'))
      process.exit(1)
    }

    if (finalOptions.dryRun) {
      spinner.info('Dry run mode - no files will be written')
      const generator = await getGenerator(finalOptions.type, finalOptions.template)
      const files = await generator(name, finalOptions)
      spinner.stop()

      console.log(chalk.bold('\nFiles that would be created:'))
      for (const [filePath, content] of Object.entries(files)) {
        console.log(`  ${chalk.cyan('create')} ${path.join(outputPath, filePath)}`)
      }
      console.log(chalk.gray(`\nTotal: ${Object.keys(files).length} files`))
      return
    }

    await fs.mkdir(outputPath, { recursive: true })
    await fs.mkdir(path.join(outputPath, 'src'), { recursive: true })

    spinner.text = 'Generating projection adapter files...'

    // Generate files based on type
    const generator = getGenerator(finalOptions.type, finalOptions.template)
    const files = await generator(name, finalOptions)

    // Write files (skip in minimal mode)
    const filesToWrite = finalOptions.minimal
      ? Object.fromEntries(Object.entries(files).filter(([key]) =>
          !['README.md', 'docs'].some(doc => key.startsWith(doc)))
        )
      : files

    for (const [filePath, content] of Object.entries(filesToWrite)) {
      const fullPath = path.join(outputPath, filePath)
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, content, 'utf-8')
    }

    spinner.succeed('Projection adapter created successfully!')

    console.log(chalk.green('\nProjection adapter created at:'), chalk.cyan(outputPath))
    console.log(chalk.gray('\nNext steps:'))
    console.log(`  1. cd ${path.relative(process.cwd(), outputPath)}`)
    console.log('  2. npm install')
    console.log('  3. Implement the adapter methods in src/index.ts')
    console.log('  4. npm run build')
    console.log(`  5. idiomark projection-adapter validate ${name}`)

  } catch (error) {
    spinner.fail('Failed to create projection adapter')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

async function promptForProjectionDetails(name: string): Promise<ProjectionCreateOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Select projection adapter type:',
      choices: [
        { name: 'MCP Server (Model Context Protocol - for Claude Desktop)', value: 'mcp' },
        { name: 'UCP Adapter (Universal Commerce Protocol)', value: 'ucp' },
        { name: 'HTTP Server (simple REST API)', value: 'http' },
        { name: 'Gaming Adapter (Minecraft, Roblox, VR)', value: 'gaming' },
        { name: 'Custom Generator (provide template path)', value: 'custom' }
      ]
    },
    {
      type: 'list',
      name: 'transport',
      message: 'Select transport type:',
      choices: [
        { name: 'Stdio (for Claude Desktop integration)', value: 'stdio' },
        { name: 'HTTP (standalone server)', value: 'http' }
      ],
      when: (answers) => answers.type === 'mcp',
      default: 'stdio'
    },
    {
      type: 'number',
      name: 'port',
      message: 'Enter port number:',
      default: 3000,
      when: (answers) => ['http', 'mcp'].includes(answers.type)
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter adapter description:',
      default: `${name} projection adapter for Idiomark Protocol`
    },
    {
      type: 'input',
      name: 'output',
      message: 'Enter output directory:',
      default: path.join(process.cwd(), 'packages', 'projection-adapters', name)
    },
    {
      type: 'confirm',
      name: 'minimal',
      message: 'Skip README and documentation files?',
      default: false
    },
    {
      type: 'confirm',
      name: 'dryRun',
      message: 'Dry run (preview without writing files)?',
      default: false
    }
  ])

  return answers as ProjectionCreateOptions
}

async function getGenerator(type: string, customPath?: string) {
  if (customPath) {
    const customModule = await import(customPath)
    if (customModule.generate) {
      return customModule.generate.bind(customModule)
    }
    return () => Promise.resolve({})
  }

  const generators: Record<string, (name: string, options: ProjectionCreateOptions) => Promise<Record<string, string>>> = {
    mcp: generateMCPAdapter,
    ucp: generateUCPAdapter,
    http: generateHTTPAdapter,
    gaming: generateGamingAdapter
  }

  return generators[type] || generators.http
}

async function checkDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath)
    const stat = await fs.stat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

// ============================================================
// Validate Command
// ============================================================

export async function validateProjectionAdapterCmd(
  name: string,
  options: {
    strict?: boolean
    fix?: boolean
    compile?: boolean
  }
): Promise<void> {
  const spinner = ora('Validating projection adapter...').start()

  try {
    const adapterPath = await findProjectionAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Projection adapter not found')
      console.error(chalk.red(`Projection adapter "${name}" not found in packages/projectors/`))
      process.exit(1)
    }

    const results: ValidationResult[] = []

    // Basic file existence checks
    spinner.text = 'Checking file structure...'
    const fileChecks = [
      { name: 'src/index.ts exists', check: checkFileExists(adapterPath, 'src/index.ts'), required: true },
      { name: 'package.json exists', check: checkFileExists(adapterPath, 'package.json'), required: true },
      { name: 'tsconfig.json exists', check: checkFileExists(adapterPath, 'tsconfig.json'), required: true },
      { name: 'README.md exists', check: checkFileExists(adapterPath, 'README.md'), required: false },
      { name: 'tsup.config.ts exists', check: checkFileExists(adapterPath, 'tsup.config.ts'), required: true }
    ]

    for (const check of fileChecks) {
      const result: ValidationResult = {
        name: check.name,
        passed: await check.check,
        message: check.pass ? 'File exists' : 'File missing'
      }
      results.push(result)
    }

    // TypeScript compilation check
    if (options.compile !== false) {
      spinner.text = 'Compiling TypeScript...'
      const compileResult = await compileTypeScript(adapterPath)
      results.push({
        name: 'TypeScript compilation',
        passed: compileResult.success,
        message: compileResult.success ? 'No type errors' : compileResult.error
      })
    }

    // Import resolution check
    spinner.text = 'Checking imports...'
    const importResult = await checkImports(adapterPath)
    results.push({
      name: 'Import resolution',
      passed: importResult.success,
      message: importResult.success ? 'All imports resolvable' : importResult.error
    })

    // Idiomark schema validation
    spinner.text = 'Validating Idiomark schema...'
    const schemaResult = await validateIdiomarkSchema(adapterPath)
    results.push({
      name: 'Idiomark schema validation',
      passed: schemaResult.success,
      message: schemaResult.success ? 'Valid Idiomark schema' : schemaResult.error
    })

    spinner.stop()

    console.log(chalk.bold('\nValidation Results:'))
    console.log(chalk.gray('='.repeat(50)))

    for (const result of results) {
      const icon = result.passed ? chalk.green('✓') : chalk.red('✗')
      const required = fileChecks.find(c => c.name === result.name)?.required
      const requiredMark = required ? '' : chalk.yellow(' (optional)')
      console.log(`  ${icon} ${result.name}${requiredMark}`)
      if (result.message) {
        console.log(`    ${result.message}`)
      }
    }

    const requiredPassed = results
      .filter(r => fileChecks.find(c => c.name === r.name)?.required)
      .every(r => r.passed)

    if (requiredPassed) {
      console.log(chalk.green('\n✓ Projection adapter is valid!'))
    } else {
      console.log(chalk.red('\n✗ Projection adapter has issues. Please fix the errors above.'))
      if (options.fix) {
        console.log(chalk.gray('\nRun with --fix to attempt automatic fixes.'))
      }
      process.exit(1)
    }

  } catch (error) {
    spinner.fail('Validation failed')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

async function compileTypeScript(adapterPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = exec('npx tsc --noEmit', { cwd: adapterPath }, (err) => {
      if (err) {
        resolve({ success: false, error: err.message })
      } else {
        resolve({ success: true })
      }
    })
  })
}

async function checkImports(adapterPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const indexPath = path.join(adapterPath, 'src', 'index.ts')
    const content = await fs.readFile(indexPath, 'utf-8')

    // Check for @idiomark imports
    const imports = content.match(/from ['"](@idiomark\/[^'"]+)['"]/g) || []

    for (const imp of imports) {
      const packageName = imp[1]

      // Check if package is listed in dependencies
      const pkgJsonPath = path.join(adapterPath, 'package.json')
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'))
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }

      if (!deps[packageName.replace('@idiomark/', '')]) {
        return { success: false, error: `Missing dependency: ${packageName}` }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function validateIdiomarkSchema(adapterPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pkgJsonPath = path.join(adapterPath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'))

    // Check for required Idiomark fields in idiomark metadata
    const idiomarkMeta = pkgJson.idiomark || {}

    const requiredFields = ['type']
    const missing = requiredFields.filter(f => !idiomarkMeta[f])

    if (missing.length > 0) {
      return { success: false, error: `Missing required Idiomark fields: ${missing.join(', ')}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

// ============================================================
// Test Command
// ============================================================

export async function testProjectionAdapterCmd(name: string, options: {
  port?: number
  coverage?: boolean
  integration?: boolean
  personality?: string
  watch?: boolean
}): Promise<void> {
  const spinner = ora('Testing projection adapter...').start()

  try {
    const adapterPath = await findProjectionAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Projection adapter not found')
      console.error(chalk.red(`Projection adapter "${name}" not found`))
      process.exit(1)
    }

    const results: { name: string; passed: boolean; output?: string }[] = []

    // Build check
    spinner.text = 'Building adapter...'
    const buildResult = await runBuild(adapterPath)
    results.push({ name: 'Build', passed: buildResult.success, output: buildResult.output })

    // TypeScript check
    if (!buildResult.success) {
      spinner.text = 'Running TypeScript check...'
      const tsResult = await compileTypeScript(adapterPath)
      results.push({ name: 'TypeScript', passed: tsResult.success, output: tsResult.error })
    }

    // Unit tests
    if (options.coverage || options.integration) {
      spinner.text = 'Running tests...'
      const testResult = await runTests(adapterPath, options.coverage)
      results.push({ name: 'Tests', passed: testResult.success, output: testResult.output })
    }

    // Integration test with personality
    if (options.integration) {
      spinner.text = 'Running integration tests...'
      const intResult = await runIntegrationTest(adapterPath, options.personality)
      results.push({ name: 'Integration', passed: intResult.success, output: intResult.output })
    }

    spinner.stop()

    console.log(chalk.bold('\nTest Results:'))
    console.log(chalk.gray('='.repeat(40)))

    for (const result of results) {
      const icon = result.passed ? chalk.green('✓') : chalk.red('✗')
      const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED')
      console.log(`  ${icon} ${result.name}: ${status}`)
      if (result.output) {
        console.log(`    ${chalk.gray(result.output)}`)
      }
    }

    const allPassed = results.every(r => r.passed)

    if (allPassed) {
      console.log(chalk.green('\n✓ All tests passed!'))
    } else {
      console.log(chalk.red('\n✗ Some tests failed.'))
      process.exit(1)
    }

    console.log(chalk.gray('\nTo run the adapter:'))
    console.log(`  cd ${path.relative(process.cwd(), adapterPath)}`)
    console.log(`  npm run start${options.port ? ` -- --port ${options.port}` : ''}`)

  } catch (error) {
    spinner.fail('Test failed')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

async function runBuild(adapterPath: string): Promise<{ success: boolean; output: string }> {
  return new Promise<{ success: boolean; output: string }>((resolve) => {
    const proc = exec('npm run build', { cwd: adapterPath }, (err: ExecException, stdout) => {
      if (err) {
        resolve({ success: false, output: err.message || 'Build failed' })
      } else {
        resolve({ success: true, output: stdout || 'Build successful' })
      }
    })
  })
}

async function runTests(adapterPath: string, withCoverage?: boolean): Promise<{ success: boolean; output: string }> {
  const cmd = withCoverage ? 'npm run test -- --coverage' : 'npm run test'

  return new Promise<{ success: boolean; output: string }>((resolve) => {
    exec(cmd, { cwd: adapterPath }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, output: err.message || 'Tests failed' })
      } else {
        resolve({ success: true, output: stdout || 'No tests found' })
      }
    })
  })
}

async function runIntegrationTest(adapterPath: string, personalityPath?: string): Promise<{ success: boolean; output: string }> {
  const testPersonality = personalityPath || path.join(adapterPath, 'test', 'fixtures', 'personality.idiomark')

  return new Promise<{ success: boolean; output: string }>((resolve) => {
    const cmd = `node dist/index.js ${testPersonality}`
    exec(cmd, { cwd: adapterPath, timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, output: err.message || 'Integration test failed' })
      } else {
        resolve({ success: true, output: stdout || 'Integration test passed' })
      }
    })
  })
}

// ============================================================
// List Command
// ============================================================

export async function listProjectionAdapters(options: {
  filter?: string
  status?: string
  search?: string
  json?: boolean
  table?: boolean
}): Promise<void> {
  const spinner = ora('Scanning for projection adapters...').start()

  try {
    const adaptersPath = path.join(process.cwd(), 'packages', 'projectors')
    const adapters: ProjectionAdapterInfo[] = []

    // Check if directory exists
    try {
      await fs.access(adaptersPath)
    } catch {
      spinner.fail('Projectors directory not found')
      console.error(chalk.red('Create packages/projectors/ directory first'))
      process.exit(1)
    }

    const entries = await fs.readdir(adaptersPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const info = await getProjectionAdapterInfo(path.join(adaptersPath, entry.name))
        if (info) {
          adapters.push(info)
        }
      }
    }

    // Apply filters
    let filtered = adapters
    if (options.filter) {
      filtered = filtered.filter(a => a.type === options.filter)
    }
    if (options.status) {
      filtered = filtered.filter(a => a.status === options.status)
    }
    if (options.search) {
      const searchLower = options.search.toLowerCase()
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description?.toLowerCase().includes(searchLower)
      )
    }

    spinner.stop()

    if (filtered.length === 0) {
      console.log(chalk.yellow('No projection adapters found matching criteria'))
      console.log(chalk.gray(`Create one with: idiomark projection-adapter create <name>`))
      return
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(filtered, null, 2))
      return
    }

    // Table output
    console.log(chalk.bold('\nInstalled Projection Adapters:\n'))

    // Group by status
    const working = filtered.filter(a => a.status === 'working')
    const experimental = filtered.filter(a => a.status === 'experimental')
    const deprecated = filtered.filter(a => a.status === 'deprecated')

    if (working.length > 0) {
      console.log(chalk.green('Working:'))
      for (const adapter of working) {
        printProjectionAdapterInfo(adapter, options.table)
      }
    }

    if (experimental.length > 0) {
      console.log(chalk.yellow('\nExperimental:'))
      for (const adapter of experimental) {
        printProjectionAdapterInfo(adapter, options.table)
      }
    }

    if (deprecated.length > 0) {
      console.log(chalk.red('\nDeprecated:'))
      for (const adapter of deprecated) {
        printProjectionAdapterInfo(adapter, options.table)
      }
    }

    console.log(chalk.gray(`\nTotal: ${filtered.length} adapter${filtered.length !== 1 ? 's' : ''}`))

  } catch (error) {
    spinner.fail('Failed to list projection adapters')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

function printProjectionAdapterInfo(info: ProjectionAdapterInfo, asTable?: boolean): void {
  const statusIcon = info.status === 'working' ? chalk.green('✓') : info.status === 'experimental' ? chalk.yellow('⚠') : chalk.red('✗')

  if (asTable) {
    // Table format
    console.log(
      `  ${statusIcon} ${chalk.bold(info.name.padEnd(20))} ` +
      `${chalk.gray(info.type.padEnd(10))} ` +
      `${chalk.cyan((info.port || '-').toString().padEnd(6))} ` +
      `${info.version ? chalk.gray('v' + info.version).padEnd(8) : ''.padEnd(8)} ` +
      `${statusColor(info.status).padEnd(13)}`
    )

    if (info.description) {
      console.log(`  ${chalk.gray('│')}  ${chalk.gray(info.description.substring(0, 60))}`)
    }

    const deps = info.dependencies || []
    if (deps.length > 0) {
      console.log(`  ${chalk.gray('│')}  ${chalk.cyan(deps.slice(0, 3).join(', '))}${deps.length > 3 ? '...' : ''}`)
    }
  } else {
    // Original format
    console.log(`  ${statusIcon} ${chalk.bold(info.name)} (${chalk.gray(info.type)})`)

    if (info.description) {
      console.log(`    ${chalk.gray(info.description)}`)
    }

    const details: string[] = []
    if (info.transport) details.push(chalk.cyan(`Transport: ${info.transport}`))
    if (info.port) details.push(chalk.cyan(`Port: ${info.port}`))
    if (info.version) details.push(chalk.cyan(`Version: ${info.version}`))
    if (info.lastUpdated) details.push(chalk.cyan(`Updated: ${info.lastUpdated}`))

    if (details.length > 0) {
      console.log(`    ${details.join(' | ')}`)
    }
    console.log()
  }
}

// ============================================================
// Info Command
// ============================================================

export async function infoProjectionAdapter(name: string, options: { json?: boolean }): Promise<void> {
  const spinner = ora(`Loading projection adapter info...`).start()

  try {
    const adapterPath = await findProjectionAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Projection adapter not found')
      console.error(chalk.red(`Projection adapter "${name}" not found`))
      process.exit(1)
    }

    const info = await getProjectionAdapterInfo(adapterPath)
    spinner.stop()

    if (!info) {
      console.error(chalk.red('Could not read adapter info'))
      process.exit(1)
    }

    if (options.json) {
      console.log(JSON.stringify(info, null, 2))
      return
    }

    console.log(chalk.bold(`\n${info.name}`))
    console.log(chalk.gray('='.repeat(info.name.length)))
    console.log()

    if (info.description) {
      console.log(`${chalk.bold('Description:')} ${info.description}`)
      console.log()
    }

    console.log(`${chalk.bold('Type:')} ${info.type}`)
    console.log(`${chalk.bold('Status:')} ${statusColor(info.status)}`)

    if (info.transport) {
      console.log(`${chalk.bold('Transport:')} ${chalk.cyan(info.transport)}`)
    }

    if (info.port) {
      console.log(`${chalk.bold('Port:')} ${chalk.cyan(info.port.toString())}`)
    }

    if (info.version) {
      console.log(`${chalk.bold('Version:')} ${chalk.cyan(info.version)}`)
    }

    if (info.lastUpdated) {
      console.log(`${chalk.bold('Last Updated:')} ${chalk.cyan(info.lastUpdated)}`)
    }

    const deps = info.dependencies || []
    if (deps.length > 0) {
      console.log(`${chalk.bold('Dependencies:')}`)
      for (const dep of deps) {
        console.log(`  - ${chalk.cyan(dep)}`)
      }
    }

  } catch (error) {
    spinner.fail('Failed to load adapter info')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

// ============================================================
// Partial Generation (Add tools/resources)
// ============================================================

export async function addProjectionComponent(
  name: string,
  component: 'tools' | 'resources',
  options: {
    type?: 'mcp' | 'ucp' | 'http' | 'gaming'
    template?: string
  }
): Promise<void> {
  const spinner = ora(`Adding ${component} to ${name}...`).start()

  try {
    const adapterPath = await findProjectionAdapterPath(name)
    if (!adapterPath) {
      spinner.fail('Projection adapter not found')
      console.error(chalk.red(`Projection adapter "${name}" not found`))
      process.exit(1)
    }

    const indexPath = path.join(adapterPath, 'src', 'index.ts')
    const content = await fs.readFile(indexPath, 'utf-8')

    // Check if tools/resources already exist
    const toolsImport = content.match(/import.*tools.*from.*['"](.+)['"]/)
    const resourcesImport = content.match(/import.*resources.*from.*['"](.+)['"]/)

    if (component === 'tools' && toolsImport) {
      spinner.warn('Tools already imported in this adapter')
      console.log(chalk.gray('Add tools manually in src/tools.ts'))
      return
    }

    if (component === 'resources' && resourcesImport) {
      spinner.warn('Resources already imported in this adapter')
      console.log(chalk.gray('Add resources manually in src/resources.ts'))
      return
    }

    // Add the import and export
    const newImport = component === 'tools'
      ? `import { getCustomTools } from './tools'\n`
      : `import { getCustomResources } from './resources'\n`

    const existingImports = content.match(/^import[^;]+/gm) || []
    const insertPos = existingImports.length > 0
      ? content.lastIndexOf(existingImports[existingImports.length - 1]) + existingImports[existingImports.length - 1].length
      : content.indexOf('class')

    const updatedContent =
      content.slice(0, insertPos) +
      newImport +
      content.slice(insertPos)

    // Add export call after imports
    const exportCall = component === 'tools'
      ? '  server.registerTools?.(getCustomTools(personality))\n'
      : '  server.registerResources?.(getCustomResources(personality))\n'

    const classMatch = updatedContent.match(/class\s+\w+\s+extends\s+\w+/)
    if (classMatch) {
      const classEnd = updatedContent.indexOf('{', classMatch.index)
      const finalContent =
        updatedContent.slice(0, classEnd + 1) +
        exportCall +
        updatedContent.slice(classEnd + 1)

      await fs.writeFile(indexPath, finalContent, 'utf-8')
      spinner.succeed(`Added ${component} to ${name}`)
    }

  } catch (error) {
    spinner.fail(`Failed to add ${component}`)
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

// ============================================================
// Helper Functions
// ============================================================

async function findProjectionAdapterPath(name: string): Promise<string | null> {
  const possiblePaths = [
    path.join(process.cwd(), 'packages', 'projectors', name),
    path.join(process.cwd(), '..', 'projectors', name),
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

async function getProjectionAdapterInfo(adapterPath: string): Promise<ProjectionAdapterInfo | null> {
  try {
    const packageJsonPath = path.join(adapterPath, 'package.json')
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))

    const name = packageJson.name?.replace('@idiomark/projection-adapter-', '') || path.basename(adapterPath)

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

    // Get last updated time
    let lastUpdated: string | undefined
    try {
      const stat = await fs.stat(indexPath = path.join(adapterPath, 'src', 'index.ts'))
      lastUpdated = stat.mtime.toISOString().split('T')[0]
    } catch {
      // ignore
    }

    // Get dependencies
    const deps: string[] = []
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    for (const [name, version] of Object.entries(allDeps)) {
      if (name.startsWith('@idiomark/')) {
        deps.push(`${name.replace('@idiomark/', '')}@${version}`)
      }
    }

    return {
      name,
      type: packageJson.idiomark?.type || 'unknown',
      transport: packageJson.idiomark?.transport,
      port: packageJson.idiomark?.port,
      description,
      status: packageJson.idiomark?.status || 'experimental',
      version: packageJson.version,
      lastUpdated,
      dependencies: deps.length > 0 ? deps : undefined
    }
  } catch {
    return null
  }
}

async function checkFileExists(adapterPath: string, file: string): Promise<boolean> {
  try {
    await fs.access(path.join(adapterPath, file))
    return true
  } catch {
    return false
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

// ============================================================
// Command Registration
// ============================================================

export function registerProjectionAdapterCommands(program: Command): void {
  const projectionCmd = program.command('projection-adapter')
    .description('Projection adapter management commands')

  // Create command
  const createCmd = projectionCmd
    .command('create <name>')
    .description('Create a new projection adapter')
    .option('-t, --type <type>', 'Adapter type (mcp, ucp, http, gaming, custom)')
    .option('--transport <stdio|http>', 'Transport type (for MCP)')
    .option('-p, --port <number>', 'Port number for HTTP-based adapters')
    .option('-o, --output <path>', 'Output directory')
    .option('-D, --description <text>', 'Adapter description')
    .option('-i, --interactive', 'Interactive mode with prompts')
    .option('--dry-run', 'Preview files without writing')
    .option('-f, --force', 'Overwrite existing directory')
    .option('--minimal', 'Skip README and documentation files')
    .option('--template <path>', 'Use custom generator template')
    .action(createProjectionAdapter)

  // Validate command
  projectionCmd
    .command('validate <name>')
    .description('Validate a projection adapter')
    .option('-s, --strict', 'Strict validation mode')
    .option('--fix', 'Attempt automatic fixes')
    .option('--no-compile', 'Skip TypeScript compilation check')
    .action(validateProjectionAdapterCmd)

  // Test command
  projectionCmd
    .command('test <name>')
    .description('Test a projection adapter')
    .option('-p, --port <number>', 'Port to test server on')
    .option('-c, --coverage', 'Run tests with coverage')
    .option('-I, --integration', 'Run integration tests')
    .option('--personality <path>', 'Personality file for integration tests')
    .option('-w, --watch', 'Watch mode for tests')
    .action(testProjectionAdapterCmd)

  // List command
  projectionCmd
    .command('list')
    .description('List all installed projection adapters')
    .option('--type <type>', 'Filter by adapter type')
    .option('--status <status>', 'Filter by status (working, experimental, deprecated)')
    .option('-S, --search <query>', 'Search by name or description')
    .option('-j, --json', 'JSON output format')
    .option('-T, --table', 'Table output format (default)')
    .action((options) => listProjectionAdapters(options))

  // Add component commands
  projectionCmd
    .command('add-tools <name>')
    .description('Add tools export to existing adapter')
    .option('-t, --type <type>', 'Adapter type for tool generation')
    .action((options, name) => addProjectionComponent(name, 'tools', options))

  projectionCmd
    .command('add-resources <name>')
    .description('Add resources export to existing adapter')
    .option('-t, --type <type>', 'Adapter type for resource generation')
    .action((options, name) => addProjectionComponent(name, 'resources', options))

  // Info command
  projectionCmd
    .command('info <name>')
    .description('Show detailed information about a projection adapter')
    .option('-j, --json', 'JSON output format')
    .action((options, name) => infoProjectionAdapter(name, options))
}
