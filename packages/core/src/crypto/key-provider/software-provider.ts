/**
 * Software Key Provider
 *
 * Default implementation that stores keys in memory using software-based
 * cryptographic operations. This matches the current Idiomark Protocol behavior.
 *
 * Keys are stored in a Map and can be exported (extractable: true).
 * For production HSM-backed security, use one of the HSM providers.
 *
 * @module @idiomark/core/crypto/key-provider/software-provider
 */

import { randomBytes } from '@noble/hashes/utils'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { ed25519 } from '@noble/curves/ed25519'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'
// @ts-ignore - noble/ciphers uses .js extension
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import type {
  KeyProvider,
  KeyReference,
  KeyAlgorithm,
  KeyUsage,
  KeyInfo,
  SignResult,
  EncryptResult,
  DeriveResult,
  ProviderType
} from './types.js'

// ============================================================================
// Internal Key Storage
// ============================================================================

interface StoredKey {
  privateKey: Uint8Array
  publicKey: Uint8Array
  algorithm: KeyAlgorithm
  usage: KeyUsage[]
  createdAt: Date
}

// ============================================================================
// Software Key Provider Implementation
// ============================================================================

/**
 * Software-based key provider
 *
 * Keys are stored in memory and all cryptographic operations are performed
 * in software using the noble cryptography libraries.
 *
 * @example
 * ```ts
 * const provider = new SoftwareKeyProvider()
 *
 * // Generate a signing key
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 *
 * // Sign data
 * const data = new TextEncoder().encode('Hello, world!')
 * const result = await provider.sign(keyRef, data)
 *
 * // Verify signature
 * const valid = await provider.verify(keyRef, result.signature, data)
 * console.log('Signature valid:', valid)
 * ```
 */
export class SoftwareKeyProvider implements KeyProvider {
  readonly name: ProviderType = 'software'

  /**
   * In-memory key storage
   * In production, consider encrypting keys at rest with a master key
   */
  private keys = new Map<string, StoredKey>()

  // ==========================================================================
  // Key Lifecycle
  // ==========================================================================

  async generateKey(algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference> {
    const keyId = this.generateKeyId()
    let privateKey: Uint8Array
    let publicKey: Uint8Array

    switch (algorithm) {
      case 'ed25519':
        privateKey = randomBytes(32)
        publicKey = ed25519.getPublicKey(privateKey)
        break

      case 'secp256k1':
        privateKey = randomBytes(32)
        publicKey = secp256k1.getPublicKey(privateKey, true) // Compressed
        break

      case 'x25519':
        privateKey = randomBytes(32)
        publicKey = x25519.getPublicKey(privateKey)
        break

      case 'aes-256-gcm':
        // For AES, we use XChaCha20-Poly1305 which has a 32-byte key
        privateKey = randomBytes(32)
        publicKey = new Uint8Array(0) // Symmetric, no public key
        break

      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    const createdAt = new Date()

    // Store the key
    this.keys.set(keyId, {
      privateKey,
      publicKey,
      algorithm,
      usage,
      createdAt
    })

    return {
      id: keyId,
      algorithm,
      provider: 'software',
      extractable: true,
      createdAt,
      hsmBacked: false,
      publicKeyHex: publicKey.length > 0 ? bytesToHex(publicKey) : undefined
    }
  }

  async importKey(
    key: Uint8Array,
    algorithm: KeyAlgorithm,
    usage: KeyUsage[]
  ): Promise<KeyReference> {
    const keyId = this.generateKeyId()
    let publicKey: Uint8Array

    switch (algorithm) {
      case 'ed25519':
        if (key.length !== 32) throw new Error('Ed25519 private key must be 32 bytes')
        publicKey = ed25519.getPublicKey(key)
        break

      case 'secp256k1':
        if (key.length !== 32) throw new Error('secp256k1 private key must be 32 bytes')
        publicKey = secp256k1.getPublicKey(key, true)
        break

      case 'x25519':
        if (key.length !== 32) throw new Error('X25519 private key must be 32 bytes')
        publicKey = x25519.getPublicKey(key)
        break

      case 'aes-256-gcm':
        if (key.length !== 32) throw new Error('AES-256 key must be 32 bytes')
        publicKey = new Uint8Array(0)
        break

      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    const createdAt = new Date()

    this.keys.set(keyId, {
      privateKey: key,
      publicKey,
      algorithm,
      usage,
      createdAt
    })

    return {
      id: keyId,
      algorithm,
      provider: 'software',
      extractable: true,
      createdAt,
      hsmBacked: false,
      publicKeyHex: publicKey.length > 0 ? bytesToHex(publicKey) : undefined
    }
  }

  async deleteKey(keyRef: KeyReference): Promise<void> {
    this.keys.delete(keyRef.id)
  }

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  async sign(keyRef: KeyReference, data: Uint8Array): Promise<SignResult> {
    const key = this.getKey(keyRef)

    if (!key.usage.includes('sign')) {
      throw new Error('Key does not support signing')
    }

    let signature: Uint8Array

    switch (key.algorithm) {
      case 'ed25519':
        signature = ed25519.sign(data, key.privateKey)
        break

      case 'secp256k1':
        // Hash the message first for secp256k1
        const messageHash = sha256(data)
        signature = secp256k1.sign(messageHash, key.privateKey).toCompactRawBytes()
        break

      default:
        throw new Error(`Signing not supported for algorithm: ${key.algorithm}`)
    }

    return {
      signature,
      algorithm: key.algorithm,
      keyReference: keyRef,
      timestamp: new Date()
    }
  }

  async verify(
    keyRef: KeyReference,
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    const key = this.getKey(keyRef)

    if (!key.usage.includes('verify')) {
      throw new Error('Key does not support verification')
    }

    try {
      switch (key.algorithm) {
        case 'ed25519':
          return ed25519.verify(signature, data, key.publicKey)

        case 'secp256k1':
          const messageHash = sha256(data)
          return secp256k1.verify(signature, messageHash, key.publicKey)

        default:
          throw new Error(`Verification not supported for algorithm: ${key.algorithm}`)
      }
    } catch {
      return false
    }
  }

  async encrypt(keyRef: KeyReference, plaintext: Uint8Array): Promise<EncryptResult> {
    const key = this.getKey(keyRef)

    if (!key.usage.includes('encrypt')) {
      throw new Error('Key does not support encryption')
    }

    switch (key.algorithm) {
      case 'aes-256-gcm':
        // Use XChaCha20-Poly1305 (nonce is embedded)
        const nonce = randomBytes(24)
        const cipher = xchacha20poly1305(key.privateKey, nonce)
        const ciphertext = cipher.encrypt(plaintext)

        return {
          ciphertext,
          iv: nonce,
          keyReference: keyRef
        }

      default:
        throw new Error(`Encryption not supported for algorithm: ${key.algorithm}`)
    }
  }

  async decrypt(
    keyRef: KeyReference,
    ciphertext: Uint8Array,
    iv?: Uint8Array,
    _tag?: Uint8Array
  ): Promise<Uint8Array> {
    const key = this.getKey(keyRef)

    if (!key.usage.includes('decrypt')) {
      throw new Error('Key does not support decryption')
    }

    switch (key.algorithm) {
      case 'aes-256-gcm':
        if (!iv) throw new Error('IV required for AES-GCM decryption')
        const cipher = xchacha20poly1305(key.privateKey, iv)
        return cipher.decrypt(ciphertext)

      default:
        throw new Error(`Decryption not supported for algorithm: ${key.algorithm}`)
    }
  }

  async deriveKey(keyRef: KeyReference, peerPublicKey: Uint8Array): Promise<DeriveResult> {
    const key = this.getKey(keyRef)

    if (!key.usage.includes('deriveKey')) {
      throw new Error('Key does not support key derivation')
    }

    switch (key.algorithm) {
      case 'x25519':
        const sharedSecret = x25519.scalarMult(key.privateKey, peerPublicKey)

        // Derive a key from the shared secret using SHA-256
        const derivedKey = sha256(sharedSecret)

        // Store the derived key
        const derivedKeyId = this.generateKeyId()
        this.keys.set(derivedKeyId, {
          privateKey: derivedKey,
          publicKey: new Uint8Array(0),
          algorithm: 'aes-256-gcm',
          usage: ['encrypt', 'decrypt'],
          createdAt: new Date()
        })

        return {
          keyReference: {
            id: derivedKeyId,
            algorithm: 'aes-256-gcm',
            provider: 'software',
            extractable: true,
            createdAt: new Date(),
            hsmBacked: false
          },
          sharedSecret // Software provider can expose the shared secret
        }

      default:
        throw new Error(`Key derivation not supported for algorithm: ${key.algorithm}`)
    }
  }

  // ==========================================================================
  // Provider Capabilities
  // ==========================================================================

  isHSMBacked(): boolean {
    return false
  }

  supportsAlgorithm(algorithm: KeyAlgorithm): boolean {
    return ['ed25519', 'secp256k1', 'x25519', 'aes-256-gcm'].includes(algorithm)
  }

  supportsKeyImport(): boolean {
    return true
  }

  async getKeyInfo(keyRef: KeyReference): Promise<KeyInfo> {
    const key = this.getKey(keyRef)

    return {
      id: keyRef.id,
      algorithm: key.algorithm,
      provider: 'software',
      hsmBacked: false,
      extractable: true,
      createdAt: key.createdAt,
      usage: key.usage,
      publicKeyHex: key.publicKey.length > 0 ? bytesToHex(key.publicKey) : undefined
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Export a key's private key material
   * Only available for software provider (HSM keys cannot be exported)
   */
  async exportKey(keyRef: KeyReference): Promise<Uint8Array> {
    const key = this.getKey(keyRef)
    if (!keyRef.extractable) {
      throw new Error('Key is not extractable')
    }
    return key.privateKey
  }

  /**
   * Get a key by reference
   * @throws If key not found
   */
  private getKey(keyRef: KeyReference): StoredKey {
    const key = this.keys.get(keyRef.id)
    if (!key) {
      throw new Error(`Key not found: ${keyRef.id}`)
    }
    return key
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    const bytes = randomBytes(16)
    return bytesToHex(bytes)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a software key provider with optional initial keys
 */
export function createSoftwareProvider(): SoftwareKeyProvider {
  return new SoftwareKeyProvider()
}
