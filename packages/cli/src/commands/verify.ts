/**
 * Verify Command - Package Integrity Verification
 *
 * Verifies that installed Idiomark packages match the officially published
 * cryptographic fingerprints. This ensures supply chain security by
 * confirming no tampering occurred between publication and installation.
 *
 * ## How It Works
 *
 * 1. Fetches the official build manifest from GitHub releases
 * 2. Hashes all files in the local package's dist directory
 * 3. Compares local hashes against official fingerprints
 * 4. Reports any mismatches (potential tampering)
 *
 * ## Usage
 *
 * ```bash
 * # Verify a specific package
 * idiomark verify @idiomark/core
 *
 * # Verify with verbose output
 * idiomark verify @idiomark/core --verbose
 *
 * # Verify using local manifest (for development)
 * idiomark verify @idiomark/core --local
 * ```
 *
 * ## Exit Codes
 *
 * - 0: Verification successful
 * - 1: Verification failed or error occurred
 *
 * ## What Gets Verified
 *
 * - All .mjs files (compiled JavaScript)
 * - All .d.ts files (TypeScript declarations)
 *
 * ## Security Considerations
 *
 * - Manifest is fetched over HTTPS from GitHub
 * - Uses SHA-256 for all file fingerprints
 * - Any mismatch is treated as a security failure
 *
 * @see docs/proposals/ADR-011-reproducible-builds.md
 * @see docs-site/docs/privacy-features.md
 *
 * @module @idiomark/cli/commands/verify
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { createHash } from 'crypto'
import { readdir, stat, readFile } from 'fs/promises'
import { join, relative } from 'path'

// ============================================================================
// Types
// ============================================================================

/**
 * Official build manifest structure
 *
 * Published to GitHub releases as build-manifest.json
 */
interface BuildManifest {
  /** Manifest format version */
  version: string
  /** When manifest was generated */
  timestamp: string
  /** Git commit the build was created from */
  commit: string
  /** Package fingerprints */
  packages: Record<string, {
    /** Package version */
    version: string
    /** File path -> SHA-256 hash */
    files: Record<string, string>
  }>
}

/**
 * Result of verifying a single package
 */
interface VerifyResult {
  /** Package name (e.g., @idiomark/core) */
  packageName: string
  /** Package version */
  version: string
  /** Whether verification passed */
  verified: boolean
  /** Number of files checked */
  filesChecked: number
  /** List of mismatched files (empty if verified) */
  mismatches: string[]
  /** Error message if verification couldn't complete */
  error?: string
}

// ============================================================================
// Hashing
// ============================================================================

async function hashFile(filepath: string): Promise<string> {
  const content = await readFile(filepath)
  return createHash('sha256').update(content).digest('hex')
}

async function hashDirectory(dirPath: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.d.ts'))) {
        const relativePath = relative(dirPath, fullPath).replace(/\\/g, '/')
        hashes[relativePath] = await hashFile(fullPath)
      }
    }
  }

  await walk(dir)
  return hashes
}

// ============================================================================
// Manifest Fetching
// ============================================================================

async function fetchPublishedManifest(): Promise<BuildManifest | null> {
  const manifestUrl = 'https://github.com/idiomark-protocol/idiomark/releases/latest/download/build-manifest.json'

  try {
    const response = await fetch(manifestUrl)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch {
    return null
  }
}

function getLocalManifest(): BuildManifest | null {
  // In a real implementation, this would read from local node_modules
  // For now, return null to indicate we need to verify against remote
  return null
}

// ============================================================================
// Verification
// ============================================================================

async function verifyPackage(
  packageName: string,
  localPath: string,
  officialManifest: BuildManifest
): Promise<VerifyResult> {
  const pkgManifest = officialManifest.packages[packageName]

  if (!pkgManifest) {
    return {
      packageName,
      version: 'unknown',
      verified: false,
      filesChecked: 0,
      mismatches: [],
      error: `Package ${packageName} not found in manifest`
    }
  }

  try {
    const distPath = join(localPath, 'dist')

    // Check if dist exists
    try {
      await stat(distPath)
    } catch {
      return {
        packageName,
        version: pkgManifest.version,
        verified: false,
        filesChecked: 0,
        mismatches: [],
        error: 'Package not installed or not built'
      }
    }

    // Hash local files
    const localHashes = await hashDirectory(distPath)
    const mismatches: string[] = []

    for (const [file, officialHash] of Object.entries(pkgManifest.files)) {
      const localHash = localHashes[file]

      if (!localHash) {
        mismatches.push(`${file} (missing)`)
      } else if (localHash !== officialHash) {
        mismatches.push(`${file} (hash mismatch)`)
      }
    }

    return {
      packageName,
      version: pkgManifest.version,
      verified: mismatches.length === 0,
      filesChecked: Object.keys(pkgManifest.files).length,
      mismatches
    }
  } catch (err) {
    return {
      packageName,
      version: pkgManifest.version,
      verified: false,
      filesChecked: 0,
      mismatches: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

// ============================================================================
// Command
// ============================================================================

export const verifyCommand = new Command('verify')
  .description('Verify installed packages match published fingerprints')
  .argument('[package]', 'Package to verify (e.g., @idiomark/core)', '@idiomark/core')
  .option('-l, --local', 'Use local manifest instead of fetching from GitHub')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (packageName: string, options: { local?: boolean; verbose?: boolean }) => {
    console.log()
    console.log(chalk.cyan('🔍 Verifying package integrity...'))
    console.log(chalk.gray(`   Package: ${packageName}`))
    console.log()

    // Fetch official manifest
    let manifest: BuildManifest | null = null

    if (options.local) {
      manifest = getLocalManifest()
      if (!manifest) {
        console.log(chalk.yellow('⚠️  No local manifest found'))
        console.log(chalk.gray('   Run this command from the monorepo root after building'))
        process.exit(1)
      }
    } else {
      console.log(chalk.gray('   Fetching published manifest...'))
      manifest = await fetchPublishedManifest()

      if (!manifest) {
        console.log(chalk.yellow('⚠️  Could not fetch published manifest'))
        console.log(chalk.gray('   This might be a network issue or no release exists yet'))
        console.log()
        console.log(chalk.gray('   Try: pnpm build && node scripts/verify-build.mjs'))
        process.exit(1)
      }
    }

    // Determine local path
    const shortName = packageName.replace('@idiomark/', '')
    const localPath = join(process.cwd(), 'packages', shortName)

    // Verify
    const result = await verifyPackage(packageName, localPath, manifest)

    // Output
    if (result.error) {
      console.log(chalk.red(`❌ ${packageName}`))
      console.log(chalk.gray(`   ${result.error}`))
      process.exit(1)
    }

    if (result.verified) {
      console.log(chalk.green(`✅ ${packageName} v${result.version} verified`))
      console.log(chalk.gray(`   ${result.filesChecked} files match published fingerprints`))

      if (options.verbose) {
        console.log()
        console.log(chalk.gray('   Files verified:'))
        const pkgManifest = manifest.packages[packageName]
        for (const file of Object.keys(pkgManifest.files).slice(0, 5)) {
          console.log(chalk.gray(`   ✓ ${file}`))
        }
        if (Object.keys(pkgManifest.files).length > 5) {
          console.log(chalk.gray(`   ... and ${Object.keys(pkgManifest.files).length - 5} more`))
        }
      }
    } else {
      console.log(chalk.red(`❌ ${packageName} v${result.version} FAILED`))
      console.log()
      console.log(chalk.yellow('   Mismatched files:'))
      for (const mismatch of result.mismatches) {
        console.log(chalk.red(`   ✗ ${mismatch}`))
      }
      console.log()
      console.log(chalk.yellow('⚠️  Package may have been tampered with!'))
      console.log(chalk.gray('   Do not use this package. Reinstall from official sources.'))
      process.exit(1)
    }

    console.log()
  })

// Also export as function for programmatic use
export async function verify(packageName: string): Promise<VerifyResult> {
  const manifest = await fetchPublishedManifest()
  if (!manifest) {
    return {
      packageName,
      version: 'unknown',
      verified: false,
      filesChecked: 0,
      mismatches: [],
      error: 'Could not fetch manifest'
    }
  }

  const shortName = packageName.replace('@idiomark/', '')
  const localPath = join(process.cwd(), 'packages', shortName)

  return verifyPackage(packageName, localPath, manifest)
}
