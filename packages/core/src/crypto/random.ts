/**
 * Random Generation Utilities
 *
 * Provides secure random token and nonce generation using noble-hashes.
 *
 * @module @idiomark/core/crypto/random
 */

import { randomBytes, bytesToHex } from '@noble/hashes/utils'

/**
 * Generate a random hex-encoded token
 *
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateToken(bytes: number = 32): string {
  const randomBytesArray = randomBytes(bytes)
  return bytesToHex(randomBytesArray)
}

/**
 * Generate a random nonce as Uint8Array
 * XChaCha20-Poly1305 uses 24-byte nonces by default.
 *
 * @param size - Nonce size in bytes (default: 24)
 * @returns Random nonce as Uint8Array
 */
export function generateNonce(size: number = 24): Uint8Array {
  return randomBytes(size)
}

/**
 * Generate a random nonce as hex string
 *
 * @param size - Nonce size in bytes (default: 24)
 * @returns Hex-encoded random nonce
 */
export function generateNonceBytes(size: number = 24): string {
  const nonce = randomBytes(size)
  return bytesToHex(nonce)
}

// Re-export randomBytes for direct use
export { randomBytes }
