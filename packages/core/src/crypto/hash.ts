/**
 * Hashing Utilities
 *
 * Provides BLAKE2b and SHA-256 hashing functions using noble-hashes.
 *
 * BLAKE2b is preferred for:
 * - Fast, secure hashing
 * - Token verification
 * - Content addressing
 *
 * SHA-256 is used for:
 * - Standard compatibility
 * - Key derivation
 * - Message hashing
 *
 * @module @idiomark/core/crypto/hash
 */

import { blake2b } from '@noble/hashes/blake2b'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

/**
 * Hash data using BLAKE2b
 * BLAKE2b is faster than SHA-256 and provides the same security level.
 *
 * @param data - String data to hash
 * @param outputLen - Output length in bytes (default: 32)
 * @returns Hex-encoded hash
 */
export function hashBlake2b(data: string, outputLen: number = 32): string {
  const bytes = new TextEncoder().encode(data)
  const hash = blake2b(bytes, { dkLen: outputLen })
  return bytesToHex(hash)
}

/**
 * Hash data using SHA-256
 * Standard hash function for compatibility and key derivation.
 *
 * @param data - String data to hash
 * @returns Hex-encoded 32-byte hash
 */
export function hashSha256(data: string): string {
  const bytes = new TextEncoder().encode(data)
  const hash = sha256(bytes)
  return bytesToHex(hash)
}

/**
 * Hash a token for verification (e.g., for share tokens)
 * Uses BLAKE2b for fast, secure hashing.
 *
 * @param token - Token string to hash
 * @returns Hex-encoded 32-byte hash
 */
export function hashToken(token: string): string {
  const bytes = new TextEncoder().encode(token)
  const hash = blake2b(bytes, { dkLen: 32 })
  return bytesToHex(hash)
}

/**
 * Hash a message (alias for SHA-256)
 * Used for creating consistent message hashes.
 *
 * @param message - Message string to hash
 * @returns Hex-encoded 32-byte hash
 */
export function hashMessage(message: string): string {
  return hashSha256(message)
}
