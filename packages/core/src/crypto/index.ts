/**
 * Idiomark Core - Centralized Crypto Module
 *
 * Unified cryptographic operations using noble libraries:
 * - @noble/ciphers for symmetric encryption (XChaCha20-Poly1305)
 * - @noble/hashes for hashing (BLAKE2b, SHA-256)
 * - Random token/nonce generation
 * - Post-quantum crypto types for future implementation
 *
 * @module @idiomark/core/crypto
 */

// Symmetric encryption (XChaCha20-Poly1305)
export {
  encrypt,
  decrypt,
  generateKey,
  encryptWithNonce,
  decryptWithNonce
} from './symmetric'

// Hashing utilities
export {
  hashBlake2b,
  hashSha256,
  hashToken,
  hashMessage
} from './hash'

// Random generation
export {
  generateToken,
  generateNonce,
  generateNonceBytes,
  randomBytes
} from './random'

// Post-quantum crypto types and placeholders
export type {
  PostQuantumAlgorithm,
  PostQuantumKeyPair,
  EncapsulatedSecret
} from './post-quantum'

export {
  isPostQuantumSupported,
  getSupportedAlgorithms
} from './post-quantum'

// Forward secrecy (Double Ratchet)
export {
  generateDHKeyPair,
  initiateRatchet,
  acceptRatchet,
  completeHandshake,
  ratchetEncrypt,
  ratchetDecrypt,
  serializeRatchetState,
  deserializeRatchetState,
  isRatchetReady,
  getRatchetSummary,
  type RatchetState,
  type RatchetMessage,
  type DHKeyPair,
  type RootKey,
  type ChainKey,
  type MessageKey
} from './ratchet'

// Key Provider (HSM Abstraction Layer)
export * from './key-provider'
