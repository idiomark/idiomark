/**
 * Adapter Validator
 *
 * Validates that an adapter implements the BaseAdapter interface correctly
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field?: string
  message: string
  code: string
}

export async function validateAdapter(
  adapterPath: string,
  strict: boolean = false
): Promise<ValidationResult> {
  const errors: ValidationError[] = []

  try {
    // 1. Check directory structure
    await validateDirectoryStructure(adapterPath, errors)

    // 2. Check package.json
    await validatePackageJson(adapterPath, errors)

    // 3. Check TypeScript configuration
    await validateTsConfig(adapterPath, errors)

    // 4. Check required files exist
    await validateRequiredFiles(adapterPath, errors)

    // 5. Check source code structure
    await validateSourceCode(adapterPath, errors)

    // 6. Check README completeness
    await validateReadme(adapterPath, errors)

    // 7. Try to build the adapter
    if (strict) {
      await validateBuild(adapterPath, errors)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  } catch (error) {
    return {
      valid: false,
      errors: [{
        message: `Validation error: ${(error as Error).message}`,
        code: 'VALIDATION_ERROR'
      }]
    }
  }
}

async function validateDirectoryStructure(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const requiredDirs = ['src']

  for (const dir of requiredDirs) {
    const dirPath = path.join(adapterPath, dir)
    try {
      const stat = await fs.stat(dirPath)
      if (!stat.isDirectory()) {
        errors.push({
          field: dir,
          message: `${dir} exists but is not a directory`,
          code: 'NOT_A_DIRECTORY'
        })
      }
    } catch {
      errors.push({
        field: dir,
        message: `Missing required directory: ${dir}`,
        code: 'MISSING_DIRECTORY'
      })
    }
  }
}

async function validatePackageJson(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const packageJsonPath = path.join(adapterPath, 'package.json')

  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'main', 'types']
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        errors.push({
          field: `package.json:${field}`,
          message: `Missing required field: ${field}`,
          code: 'MISSING_PACKAGE_FIELD'
        })
      }
    }

    // Check that name starts with @idiomark/adapter-
    if (packageJson.name && !packageJson.name.startsWith('@idiomark/adapter-')) {
      errors.push({
        field: 'package.json:name',
        message: 'Package name must start with @idiomark/adapter-',
        code: 'INVALID_PACKAGE_NAME'
      })
    }

    // Check idiomark metadata
    if (!packageJson.idiomark) {
      errors.push({
        field: 'package.json:idiomark',
        message: 'Missing idiomark metadata in package.json',
        code: 'MISSING_Idiomark_METADATA'
      })
    } else {
      if (!packageJson.idiomark.type) {
        errors.push({
          field: 'package.json:idiomark.type',
          message: 'Missing idiomark.type (should be rest, graphql, scrape, rss, email, or forum)',
          code: 'MISSING_ADAPTER_TYPE'
        })
      }

      const validTypes = ['rest', 'graphql', 'scrape', 'rss', 'email', 'forum']
      if (packageJson.idiomark.type && !validTypes.includes(packageJson.idiomark.type)) {
        errors.push({
          field: 'package.json:idiomark.type',
          message: `Invalid adapter type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_ADAPTER_TYPE'
        })
      }

      const validAuth = ['oauth2', 'bearer', 'apikey', 'none']
      if (packageJson.idiomark.auth && !validAuth.includes(packageJson.idiomark.auth)) {
        errors.push({
          field: 'package.json:idiomark.auth',
          message: `Invalid auth type. Must be one of: ${validAuth.join(', ')}`,
          code: 'INVALID_AUTH_TYPE'
        })
      }
    }

    // Check dependencies
    if (!packageJson.dependencies || !packageJson.dependencies['@idiomark/core']) {
      errors.push({
        field: 'package.json:dependencies',
        message: 'Missing @idiomark/core dependency',
        code: 'MISSING_CORE_DEPENDENCY'
      })
    }
  } catch (error) {
    errors.push({
      field: 'package.json',
      message: `Invalid package.json: ${(error as Error).message}`,
      code: 'INVALID_PACKAGE_JSON'
    })
  }
}

async function validateTsConfig(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const tsconfigPath = path.join(adapterPath, 'tsconfig.json')

  try {
    const content = await fs.readFile(tsconfigPath, 'utf-8')
    const tsconfig = JSON.parse(content)

    // Check compiler options
    if (!tsconfig.compilerOptions) {
      errors.push({
        field: 'tsconfig.json:compilerOptions',
        message: 'Missing compilerOptions',
        code: 'MISSING_COMPILER_OPTIONS'
      })
    } else {
      const requiredOptions = ['declaration', 'outDir', 'rootDir']
      for (const opt of requiredOptions) {
        if (!tsconfig.compilerOptions[opt]) {
          errors.push({
            field: `tsconfig.json:compilerOptions.${opt}`,
            message: `Missing required compiler option: ${opt}`,
            code: 'MISSING_COMPILER_OPTION'
          })
        }
      }
    }

    // Check that src is included
    if (!tsconfig.include || !tsconfig.include.includes('src/**/*')) {
      errors.push({
        field: 'tsconfig.json:include',
        message: 'tsconfig should include "src/**/*"',
        code: 'MISSING_INCLUDE_PATTERN'
      })
    }
  } catch (error) {
    errors.push({
      field: 'tsconfig.json',
      message: `Invalid tsconfig.json: ${(error as Error).message}`,
      code: 'INVALID_TSCONFIG'
    })
  }
}

async function validateRequiredFiles(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const requiredFiles = [
    'src/index.ts',
    'tsup.config.ts'
  ]

  for (const file of requiredFiles) {
    const filePath = path.join(adapterPath, file)
    try {
      await fs.access(filePath)
    } catch {
      errors.push({
        field: file,
        message: `Missing required file: ${file}`,
        code: 'MISSING_FILE'
      })
    }
  }
}

async function validateSourceCode(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const indexTsPath = path.join(adapterPath, 'src', 'index.ts')

  try {
    const content = await fs.readFile(indexTsPath, 'utf-8')

    // Check for class implementing PlatformAdapter
    if (!content.includes('implements PlatformAdapter')) {
      errors.push({
        field: 'src/index.ts',
        message: 'Adapter class must implement PlatformAdapter interface',
        code: 'MISSING_INTERFACE_IMPLEMENTATION'
      })
    }

    // Check for required methods
    const requiredMethods = [
      'readonly name',
      'async authenticate',
      'async fetchData',
      'normalize'
    ]

    for (const method of requiredMethods) {
      if (!content.includes(method)) {
        errors.push({
          field: 'src/index.ts',
          message: `Missing required method: ${method}`,
          code: 'MISSING_METHOD'
        })
      }
    }

    // Check for proper exports
    if (!content.includes('export class')) {
      errors.push({
        field: 'src/index.ts',
        message: 'Adapter class must be exported',
        code: 'MISSING_EXPORT'
      })
    }

    // Check for @idiomark/core import
    if (!content.includes("'@idiomark/core'") && !content.includes('"@idiomark/core"')) {
      errors.push({
        field: 'src/index.ts',
        message: 'Must import types from @idiomark/core',
        code: 'MISSING_IMPORT'
      })
    }
  } catch (error) {
    errors.push({
      field: 'src/index.ts',
      message: `Cannot read source file: ${(error as Error).message}`,
      code: 'CANNOT_READ_SOURCE'
    })
  }
}

async function validateReadme(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  const readmePath = path.join(adapterPath, 'README.md')

  try {
    const content = await fs.readFile(readmePath, 'utf-8')

    // Check for required sections
    const requiredSections = [
      '## Installation',
      '## Usage',
      '## Features'
    ]

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        errors.push({
          field: 'README.md',
          message: `Missing section: ${section}`,
          code: 'MISSING_README_SECTION',
          severity: 'warning'
        } as ValidationError)
      }
    }

    // Check for code examples
    if (!content.includes('```')) {
      errors.push({
        field: 'README.md',
        message: 'README should include code examples',
        code: 'MISSING_CODE_EXAMPLES',
        severity: 'warning'
      } as ValidationError)
    }
  } catch (error) {
    // README is optional, so just warn
    errors.push({
      field: 'README.md',
      message: 'README.md not found (recommended)',
      code: 'MISSING_README',
      severity: 'warning'
    } as ValidationError)
  }
}

async function validateBuild(
  adapterPath: string,
  errors: ValidationError[]
): Promise<void> {
  try {
    // Check if node_modules exists
    const nodeModulesPath = path.join(adapterPath, 'node_modules')
    try {
      await fs.access(nodeModulesPath)
    } catch {
      errors.push({
        field: 'build',
        message: 'Dependencies not installed. Run `npm install` first.',
        code: 'MISSING_DEPENDENCIES'
      })
      return
    }

    // Try to build
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: adapterPath,
      timeout: 60000
    })

    if (stderr && !stderr.includes('tsup')) {
      errors.push({
        field: 'build',
        message: `Build warnings: ${stderr}`,
        code: 'BUILD_WARNING',
        severity: 'warning'
      } as ValidationError)
    }
  } catch (error) {
    errors.push({
      field: 'build',
      message: `Build failed: ${(error as Error).message}`,
      code: 'BUILD_FAILED'
    })
  }
}
