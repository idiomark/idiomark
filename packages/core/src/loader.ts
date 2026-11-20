/**
 * Idiomark File Loader
 *
 * Utility for loading and reading Idiomark files from disk
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import type { IdiomarkFile } from './types'
import { schema } from './schema'

export interface LoadOptions {
  /** Validate the file against schema after loading */
  validate?: boolean
  /** Throw error if file not found (otherwise return null) */
  throwOnNotFound?: boolean
}

export interface LoadResult {
  file: IdiomarkFile
  path: string
  validated: boolean
}

/**
 * Load a Idiomark file from disk
 */
export async function loadIdiomarkFile(
  path: string,
  options: LoadOptions = {}
): Promise<LoadResult | null> {
  const { validate = true, throwOnNotFound = false } = options

  try {
    const content = await fs.readFile(path, 'utf-8')
    const data = JSON.parse(content)

    // Validate against schema if requested
    if (validate) {
      try {
        schema.parse(data)
      } catch (error: any) {
        throw new Error(
          `Idiomark file validation failed: ${error.errors?.map((e: any) => e.message).join(', ') || error.message}`
        )
      }
    }

    return {
      file: data as IdiomarkFile,
      path,
      validated: validate
    }
  } catch (error: any) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (throwOnNotFound) {
        throw new Error(`Idiomark file not found: ${path}`)
      }
      return null
    }
    throw error
  }
}

/**
 * Load a Idiomark file by ID from a directory
 * Searches for files matching {id}.idiomark.json or {id}.idiomark
 */
export async function loadIdiomarkById(
  directory: string,
  id: string,
  options: LoadOptions = {}
): Promise<LoadResult | null> {
  const possibleNames = [
    `${id}.idiomark.json`,
    `${id}.idiomark`,
    `${id}.json`
  ]

  for (const name of possibleNames) {
    const path = join(directory, name)
    const result = await loadIdiomarkFile(path, { ...options, throwOnNotFound: false })
    if (result) {
      return result
    }
  }

  if (options.throwOnNotFound) {
    throw new Error(`Idiomark file with id "${id}" not found in directory: ${directory}`)
  }
  return null
}

/**
 * List all Idiomark files in a directory
 */
export async function listIdiomarkFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory)
    return files.filter(f =>
      f.endsWith('.idiomark.json') ||
      f.endsWith('.idiomark')
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Load all Idiomark files from a directory
 */
export async function loadAllIdiomarkFiles(
  directory: string,
  options: LoadOptions = {}
): Promise<LoadResult[]> {
  const files = await listIdiomarkFiles(directory)
  const results: LoadResult[] = []

  for (const file of files) {
    const path = join(directory, file)
    const result = await loadIdiomarkFile(path, { ...options, throwOnNotFound: false })
    if (result) {
      results.push(result)
    }
  }

  return results
}

/**
 * Write a Idiomark file to disk
 */
export async function writeIdiomarkFile(
  path: string,
  file: IdiomarkFile,
  options: { format?: boolean } = {}
): Promise<void> {
  const { format = true } = options
  const content = format
    ? JSON.stringify(file, null, 2)
    : JSON.stringify(file)

  // Ensure directory exists (cross-platform)
  const { dir } = require('path').parse(path)
  await fs.mkdir(dir, { recursive: true })

  await fs.writeFile(path, content, 'utf-8')
}

/**
 * Delete a Idiomark file from disk
 */
export async function deleteIdiomarkFile(path: string): Promise<boolean> {
  try {
    await fs.unlink(path)
    return true
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}
