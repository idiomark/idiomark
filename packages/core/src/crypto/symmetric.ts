/**
 * Symmetric Encryption Utilities
 *
 * Uses XChaCha20-Poly1305 with managedNonce for authenticated encryption.
 * This provides both confidentiality and integrity guarantees.
 *
 * @module @idiomark/core/crypto/symmetric
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { managedNonce } from '@noble/ciphers/utils.js'
import { randomBytes } from '@noble/hashes/utils'
import * as base from '@scure/base'

// XChaCha20-Poly1305 key size is 32 bytes
const KEY_SIZE = 32

/**
 * Generate a random encryption key
 * @returns Hex-encoded 32-byte key
 */
export function generateKey(): string {
  const keyBytes = randomBytes(KEY_SIZE)
  return base.base16.encode(keyBytes).toLowerCase()
}

/**
 * Encrypt data using symmetric encryption (XChaCha20-Poly1305)
 * @param data - JSON-serializable data to encrypt
 * @param key - Encryption key (hex string)
 * @returns Base64-encoded encrypted data (with embedded nonce)
 */
export function encrypt(data: unknown, key: string): string {
  const plaintext = JSON.stringify(data)
  const keyBytes = base.base16.decode(key.toUpperCase())
  const plaintextBytes = new TextEncoder().encode(plaintext)

  // managedNonce automatically handles nonce generation and embedding
  const cipher = managedNonce(xchacha20poly1305)(keyBytes)
  const encrypted = cipher.encrypt(plaintextBytes)

  return base.base64.encode(encrypted)
}

/**
 * Decrypt data using symmetric encryption (XChaCha20-Poly1305)
 * @param ciphertext - Base64-encoded encrypted data (with embedded nonce)
 * @param key - Encryption key (hex string)
 * @returns Decrypted JSON object
 */
export function decrypt(ciphertext: string, key: string): unknown {
  const combined = base.base64.decode(ciphertext)
  const keyBytes = base.base16.decode(key.toUpperCase())

  // managedNonce automatically extracts and uses the embedded nonce
  const cipher = managedNonce(xchacha20poly1305)(keyBytes)
  const decrypted = cipher.decrypt(combined)

  const plaintext = new TextDecoder().decode(decrypted)
  return JSON.parse(plaintext)
}

/**
 * Encrypt data with an explicit nonce (for deterministic encryption scenarios)
 * @param data - JSON-serializable data to encrypt
 * @param key - Encryption key (hex string)
 * @param nonce - 24-byte nonce (Uint8Array)
 * @returns Base64-encoded encrypted data
 */
export function encryptWithNonce(
  data: unknown,
  key: string,
  nonce: Uint8Array
): string {
  const plaintext = JSON.stringify(data)
  const keyBytes = base.base16.decode(key.toUpperCase())
  const plaintextBytes = new TextEncoder().encode(plaintext)

  const cipher = xchacha20poly1305(keyBytes, nonce)
  const encrypted = cipher.encrypt(plaintextBytes)

  // Prepend nonce to ciphertext for storage
  const combined = new Uint8Array(nonce.length + encrypted.length)
  combined.set(nonce)
  combined.set(encrypted, nonce.length)

  return base.base64.encode(combined)
}

/**
 * Decrypt data that was encrypted with an explicit nonce
 * @param ciphertext - Base64-encoded encrypted data (nonce prepended)
 * @param key - Encryption key (hex string)
 * @returns Decrypted JSON object
 */
export function decryptWithNonce(ciphertext: string, key: string): unknown {
  const combined = base.base64.decode(ciphertext)
  const keyBytes = base.base16.decode(key.toUpperCase())

  // XChaCha20 uses 24-byte nonces
  const nonceSize = 24
  const nonce = combined.slice(0, nonceSize)
  const encrypted = combined.slice(nonceSize)

  const cipher = xchacha20poly1305(keyBytes, nonce)
  const decrypted = cipher.decrypt(encrypted)

  const plaintext = new TextDecoder().decode(decrypted)
  return JSON.parse(plaintext)
}
