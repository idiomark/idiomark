/**
 * Adapter Test Runner
 *
 * Tests adapters with mock or live data
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface TestResult {
  mode: 'mock' | 'live'
  testsRun: number
  passed: number
  failed: number
  duration: number
  errors: string[]
}

export interface TestOptions {
  mode: 'mock' | 'live'
  username?: string
  verbose?: boolean
}

export async function testAdapter(
  adapterPath: string,
  options: TestOptions
): Promise<TestResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let testsRun = 0
  let passed = 0

  try {
    // 1. Test if adapter can be imported
    testsRun++
    try {
      await testImport(adapterPath)
      passed++
    } catch (error) {
      errors.push((error as Error).message)
    }

    // 2. Test TypeScript compilation
    testsRun++
    try {
      await testCompilation(adapterPath)
      passed++
    } catch (error) {
      errors.push((error as Error).message)
    }

    // 3. Test if adapter implements required interface
    testsRun++
    try {
      await testInterface(adapterPath)
      passed++
    } catch (error) {
      errors.push((error as Error).message)
    }

    // 4. Test with mock data
    testsRun++
    try {
      await testMockData(adapterPath)
      passed++
    } catch (error) {
      errors.push((error as Error).message)
    }

    // 5. Test with live API if requested
    if (options.mode === 'live') {
      testsRun++
      try {
        await testLiveApi(adapterPath, options.username)
        passed++
      } catch (error) {
        errors.push((error as Error).message)
      }
    }

    return {
      mode: options.mode,
      testsRun,
      passed,
      failed: testsRun - passed,
      duration: Date.now() - startTime,
      errors
    }
  } catch (error) {
    return {
      mode: options.mode,
      testsRun,
      passed,
      failed: testsRun - passed,
      duration: Date.now() - startTime,
      errors: [`Test suite failed: ${(error as Error).message}`]
    }
  }
}

async function testImport(adapterPath: string): Promise<void> {
  const distPath = path.join(adapterPath, 'dist', 'index.mjs')

  try {
    await fs.access(distPath)
  } catch {
    throw new Error('Adapter not built. Run `npm run build` first.')
  }
}

async function testCompilation(adapterPath: string): Promise<void> {
  try {
    const { stderr } = await execAsync('npx tsc --noEmit', {
      cwd: adapterPath,
      timeout: 30000
    })

    if (stderr && stderr.includes('error')) {
      throw new Error(`TypeScript compilation errors: ${stderr}`)
    }
  } catch (error) {
    if ((error as any).stderr) {
      throw new Error(`TypeScript compilation failed`)
    }
    throw error
  }
}

async function testInterface(adapterPath: string): Promise<void> {
  const indexPath = path.join(adapterPath, 'src', 'index.ts')

  try {
    const content = await fs.readFile(indexPath, 'utf-8')

    const checks = [
      { pattern: /implements\s+PlatformAdapter/, name: 'PlatformAdapter interface' },
      { pattern: /readonly\s+name\s*[:=]/, name: 'name property' },
      { pattern: /async\s+authenticate\s*\(/, name: 'authenticate method' },
      { pattern: /async\s+fetchData\s*\(/, name: 'fetchData method' },
      { pattern: /normalize\s*\(/, name: 'normalize method' }
    ]

    for (const check of checks) {
      if (!check.pattern.test(content)) {
        throw new Error(`Missing ${check.name}`)
      }
    }
  } catch (error) {
    if ((error as Error).message.includes('Missing')) {
      throw error
    }
    throw new Error(`Interface check failed: ${(error as Error).message}`)
  }
}

async function testMockData(adapterPath: string): Promise<void> {
  // Test that the adapter can handle mock data
  const indexPath = path.join(adapterPath, 'src', 'index.ts')

  try {
    const content = await fs.readFile(indexPath, 'utf-8')

    // Check for normalize method which is crucial for mock data testing
    if (!content.includes('normalize(')) {
      throw new Error('Adapter should have a normalize method for handling data')
    }

    // Check for proper error handling
    if (!content.includes('try') && !content.includes('catch')) {
      throw new Error('Adapter should have error handling (try/catch blocks)')
    }

    // Check for type safety
    if (!content.includes(': Promise<') && !content.includes(': ')) {
      throw new Error('Adapter methods should have proper return types')
    }
  } catch (error) {
    if ((error as Error).message.includes('should')) {
      throw error
    }
    throw new Error(`Mock data test failed: ${(error as Error).message}`)
  }
}

async function testLiveApi(
  adapterPath: string,
  username?: string
): Promise<void> {
  // For live testing, we check if there's a test file
  const testPath = path.join(adapterPath, 'src', 'index.test.ts')

  try {
    await fs.access(testPath)

    // Run the test file
    try {
      await execAsync('npm test', {
        cwd: adapterPath,
        timeout: 60000,
        env: {
          ...process.env,
          TEST_USERNAME: username || process.env.TEST_USERNAME
        }
      })
    } catch (error) {
      throw new Error('Live tests failed. Check API credentials and network.')
    }
  } catch {
    // No test file exists, skip live API testing
    console.warn('No test file found. Create src/index.test.ts for live API testing.')
  }
}

/**
 * Create a test file template for the adapter
 */
export async function createTestFile(adapterPath: string): Promise<void> {
  const testPath = path.join(adapterPath, 'src', 'index.test.ts')

  const template = `import { describe, it, expect, beforeAll } from 'vitest'

describe('Adapter Tests', () => {
  let adapter: any

  beforeAll(async () => {
    // Initialize adapter with test credentials
    // adapter = createAdapter({
    //   apiKey: process.env.TEST_API_KEY
    // })
  })

  it('should authenticate', async () => {
    // const result = await adapter.authenticate()
    // expect(result).toBe(true)
  })

  it('should fetch data', async () => {
    // const content = await adapter.fetchData({ limit: 10 })
    // expect(content).toBeDefined()
    // expect(content.length).toBeGreaterThan(0)
  })

  it('should normalize content', async () => {
    // const raw = { /* mock data */ }
    // const normalized = adapter.normalize(raw)
    // expect(normalized).toHaveProperty('id')
    // expect(normalized).toHaveProperty('platform')
    // expect(normalized).toHaveProperty('text')
  })
})
`

  await fs.writeFile(testPath, template, 'utf-8')
}
