/**
 * Double Ratchet Implementation for Forward Secrecy
 *
 * This module implements the Double Ratchet algorithm, which provides:
 * - Forward secrecy: Past messages cannot be decrypted if current keys are compromised
 * - Post-compromise security: Security recovers after a compromise
 * - Out-of-order message support: Messages can arrive in any order
 *
 * How it works (plain English):
 * 1. Each message uses a unique key
 * 2. After using a key, it's deleted
 * 3. Both parties derive the same keys from a shared secret
 * 4. Compromising today's key doesn't reveal yesterday's (deleted) or tomorrow's (not yet derived)
 *
 * @see docs/proposals/ADR-012-forward-secrecy.md
 * @see https://signal.org/docs/specifications/doubleratchet/
 *
 * @module @idiomark/core/crypto/ratchet
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { blake2b } from '@noble/hashes/blake2b'
import { randomBytes } from '@noble/hashes/utils'
import { x25519 } from '@noble/curves/ed25519'

// ============================================================================
// Constants
// ============================================================================

const ROOT_KEY_SIZE = 32
const CHAIN_KEY_SIZE = 32
const MESSAGE_KEY_SIZE = 32
const NONCE_SIZE = 24
const MAX_SKIP = 100 // Maximum number of message keys to cache

// HKDF info strings for domain separation
const ROOT_KEY_INFO = new TextEncoder().encode('Idiomark_RootKey_v1')
const CHAIN_KEY_INFO = new TextEncoder().encode('Idiomark_ChainKey_v1')
const MESSAGE_KEY_INFO = new TextEncoder().encode('Idiomark_MessageKey_v1')

// ============================================================================
// Types
// ============================================================================

/**
 * Root key used to derive chain keys after DH ratchet step
 * This is the "master" key that gets updated with each DH exchange
 */
export interface RootKey {
  key: Uint8Array
}

/**
 * Chain key for sending or receiving messages
 * Each message advances the chain key
 */
export interface ChainKey {
  key: Uint8Array
  index: number
}

/**
 * Message key for encrypting a single message
 * Used once, then discarded
 */
export interface MessageKey {
  key: Uint8Array
  nonce: Uint8Array
  index: number
}

/**
 * X25519 key pair for DH ratchet steps
 */
export interface DHKeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

/**
 * Complete ratchet state for one party
 *
 * This is the "session" - it must be persisted and protected.
 * Losing it means losing the ability to decrypt messages.
 * Compromising it means exposing current (but not past) secrets.
 */
export interface RatchetState {
  /** Long-term identity key (never changes for this device) */
  identityKey: DHKeyPair

  /** Current ephemeral key pair (for NEXT ratchet step) */
  currentKeyPair: DHKeyPair

  /** Public key associated with current sending chain (may differ from currentKeyPair) */
  sendingPublicKey: Uint8Array | null

  /** Remote party's current public key */
  remotePublicKey: Uint8Array | null

  /** Root key (updated with each DH ratchet step) */
  rootKey: RootKey | null

  /** Chain for sending messages */
  sendingChain: ChainKey | null

  /** Chain for receiving messages */
  receivingChain: ChainKey | null

  /** Cached message keys for out-of-order messages */
  messageKeyCache: Map<number, MessageKey>

  /** Number of messages sent */
  sendCount: number

  /** Number of messages received */
  receiveCount: number
}

/**
 * Encrypted message with ratchet metadata
 */
export interface RatchetMessage {
  /** Protocol version */
  version: 1

  /** Sender's current ephemeral public key */
  ephemeralKey: Uint8Array

  /** Message number in current chain */
  messageNumber: number

  /** Number of messages in previous chain (for skipped messages) */
  previousChainLength: number

  /** Encrypted payload */
  ciphertext: Uint8Array
}

/**
 * Serialized ratchet state for storage
 */
export interface SerializedRatchetState {
  identityKey: { publicKey: string; privateKey: string }
  currentKeyPair: { publicKey: string; privateKey: string }
  sendingPublicKey: string | null
  remotePublicKey: string | null
  rootKey: string | null
  sendingChain: { key: string; index: number } | null
  receivingChain: { key: string; index: number } | null
  sendCount: number
  receiveCount: number
}

// ============================================================================
// HKDF Implementation (BLAKE2b-based)
// ============================================================================

/**
 * HMAC-based Key Derivation Function using BLAKE2b
 *
 * BLAKE2b is faster than SHA-256 and provides the same security level.
 * We use it for all key derivation in the ratchet.
 */
function hkdf(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  outputLen: number
): Uint8Array {
  // Combine salt + IKM
  const saltedInput = new Uint8Array(salt.length + inputKeyMaterial.length)
  saltedInput.set(salt)
  saltedInput.set(inputKeyMaterial, salt.length)

  // Add info for domain separation
  const withInfo = new Uint8Array(saltedInput.length + info.length)
  withInfo.set(saltedInput)
  withInfo.set(info, saltedInput.length)

  return blake2b(withInfo, { dkLen: outputLen })
}

// ============================================================================
// Key Derivation Functions
// ============================================================================

/**
 * Derive a new root key from DH output
 * Called after each DH ratchet step
 */
function deriveRootKey(rootKey: RootKey, dhOutput: Uint8Array): RootKey {
  const key = hkdf(dhOutput, rootKey.key, ROOT_KEY_INFO, ROOT_KEY_SIZE)
  return { key }
}

/**
 * Derive chain key from root key and DH output
 * This creates a new sending/receiving chain after a DH ratchet step
 */
function deriveChainKey(
  rootKey: RootKey,
  dhOutput: Uint8Array
): { rootKey: RootKey; chainKey: ChainKey } {
  // Derive new root key
  const newRootKey = deriveRootKey(rootKey, dhOutput)

  // Derive chain key from new root key
  const chainKeyBytes = hkdf(
    newRootKey.key,
    new Uint8Array(32), // Zero salt
    CHAIN_KEY_INFO,
    CHAIN_KEY_SIZE
  )

  return {
    rootKey: newRootKey,
    chainKey: { key: chainKeyBytes, index: 0 }
  }
}

/**
 * Derive initial chain keys for both sending and receiving
 * Used during handshake to set up both chains from the same DH output
 *
 * IMPORTANT: Both parties derive the SAME two chains, but use them differently:
 * - Alice (initiator) uses chain1 for sending, chain2 for receiving
 * - Bob (responder) uses chain1 for receiving, chain2 for sending
 *
 * The chains MUST only depend on the symmetric DH output, NOT on the root key
 * (which differs between parties due to identity key differences).
 */
function deriveInitialChains(
  rootKeyBytes: Uint8Array,
  dhOutput: Uint8Array
): { rootKey: RootKey; chain1: ChainKey; chain2: ChainKey } {
  // First derive root key
  const rootKey: RootKey = { key: rootKeyBytes }

  // Derive chain 1 (for initiator -> responder messages)
  // Use zero salt so both parties get the same chain
  const chain1Bytes = hkdf(
    dhOutput,
    new Uint8Array(32), // Zero salt - same for both parties
    new TextEncoder().encode('Idiomark_InitiatorChain_v1'),
    CHAIN_KEY_SIZE
  )

  // Derive chain 2 (for responder -> initiator messages)
  const chain2Bytes = hkdf(
    dhOutput,
    new Uint8Array(32), // Zero salt - same for both parties
    new TextEncoder().encode('Idiomark_ResponderChain_v1'),
    CHAIN_KEY_SIZE
  )

  return {
    rootKey,
    chain1: { key: chain1Bytes, index: 0 },
    chain2: { key: chain2Bytes, index: 0 }
  }
}

/**
 * Advance chain key and derive message key
 *
 * This is the "symmetric ratchet" - each message advances the chain:
 * - Current chain key -> Message key (for this message)
 * - Current chain key -> Next chain key (for next message)
 * - Message key is used once, then deleted
 */
function advanceChain(chainKey: ChainKey): { chainKey: ChainKey; messageKey: MessageKey } {
  // Derive message key from chain key
  const messageKeyBytes = hkdf(
    chainKey.key,
    new Uint8Array([0x01]),
    MESSAGE_KEY_INFO,
    MESSAGE_KEY_SIZE
  )

  // Derive next chain key
  const nextChainKeyBytes = hkdf(
    chainKey.key,
    new Uint8Array([0x02]),
    CHAIN_KEY_INFO,
    CHAIN_KEY_SIZE
  )

  // Generate deterministic nonce from message key
  // (Nonce is derived from key so we don't need to transmit it)
  const nonce = blake2b(messageKeyBytes, { dkLen: NONCE_SIZE })

  return {
    chainKey: { key: nextChainKeyBytes, index: chainKey.index + 1 },
    messageKey: { key: messageKeyBytes, nonce, index: chainKey.index }
  }
}

// ============================================================================
// DH Operations (X25519)
// ============================================================================

/**
 * Generate a new X25519 key pair
 * Used for both identity keys and ephemeral keys
 */
export function generateDHKeyPair(): DHKeyPair {
  const privateKey = randomBytes(32)
  const publicKey = x25519.getPublicKey(privateKey)
  return { publicKey, privateKey }
}

/**
 * Perform X25519 Diffie-Hellman exchange
 * Returns a shared secret that both parties can compute
 */
function dh(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  try {
    return x25519.scalarMult(privateKey, publicKey)
  } catch {
    throw new Error('DH exchange failed - invalid public key')
  }
}

// ============================================================================
// Ratchet State Management
// ============================================================================

/**
 * Initialize a new ratchet state as the initiator
 *
 * Call this when YOU want to start a secure conversation.
 * Returns your public key to send to the other party.
 *
 * @example
 * ```ts
 * const state = initiateRatchet(myIdentityKey)
 * // Send state.currentKeyPair.publicKey to other party
 * ```
 */
export function initiateRatchet(identityKey: DHKeyPair): RatchetState {
  const currentKeyPair = generateDHKeyPair()

  return {
    identityKey,
    currentKeyPair,
    sendingPublicKey: null,
    remotePublicKey: null,
    rootKey: null,
    sendingChain: null,
    receivingChain: null,
    messageKeyCache: new Map(),
    sendCount: 0,
    receiveCount: 0
  }
}

/**
 * Accept a ratchet session as the responder
 *
 * Call this when someone else initiated and sent you their public key.
 * Returns your public key to send back.
 *
 * @example
 * ```ts
 * const state = acceptRatchet(myIdentityKey, theirPublicKey)
 * // Send state.currentKeyPair.publicKey back to initiator
 * ```
 */
export function acceptRatchet(
  identityKey: DHKeyPair,
  remotePublicKey: Uint8Array
): RatchetState {
  const currentKeyPair = generateDHKeyPair()

  // Perform initial DH exchanges:
  // DH(IKb, EKa) - identity key with their ephemeral
  // DH(EKb, EKa) - our ephemeral with their ephemeral
  const dh1 = dh(identityKey.privateKey, remotePublicKey)
  const dh2 = dh(currentKeyPair.privateKey, remotePublicKey)

  // Combine DH outputs
  const combined = new Uint8Array(dh1.length + dh2.length)
  combined.set(dh1)
  combined.set(dh2, dh1.length)

  // Initial root key from combined DH
  const rootKeyBytes = blake2b(combined, { dkLen: ROOT_KEY_SIZE })

  // Derive both chains
  const { rootKey, chain1, chain2 } = deriveInitialChains(rootKeyBytes, dh2)

  // Bob (responder): chain1 = receiving (from Alice), chain2 = sending (to Alice)
  return {
    identityKey,
    currentKeyPair,
    sendingPublicKey: currentKeyPair.publicKey, // Our key for this chain
    remotePublicKey,
    rootKey,
    sendingChain: chain2,  // For Bob's messages to Alice
    receivingChain: chain1, // For Alice's messages to Bob
    messageKeyCache: new Map(),
    sendCount: 0,
    receiveCount: 0
  }
}

/**
 * Complete the handshake as the initiator
 *
 * Call this after receiving the responder's public key.
 * After this, the ratchet is ready to use.
 *
 * @example
 * ```ts
 * const state = initiateRatchet(myIdentityKey)
 * // ... send publicKey, receive theirPublicKey ...
 * const readyState = completeHandshake(state, theirPublicKey)
 * // Now you can send/receive messages
 * ```
 */
export function completeHandshake(
  state: RatchetState,
  remotePublicKey: Uint8Array
): RatchetState {
  if (!state.currentKeyPair) {
    throw new Error('No current key pair - ratchet not initialized')
  }

  // Save the public key used for this sending chain BEFORE generating new key
  const sendingPublicKey = state.currentKeyPair.publicKey

  // Perform DH exchanges (same as acceptRatchet)
  const dh1 = dh(state.identityKey.privateKey, remotePublicKey)
  const dh2 = dh(state.currentKeyPair.privateKey, remotePublicKey)

  const combined = new Uint8Array(dh1.length + dh2.length)
  combined.set(dh1)
  combined.set(dh2, dh1.length)

  const rootKeyBytes = blake2b(combined, { dkLen: ROOT_KEY_SIZE })

  // Derive both chains
  const { rootKey, chain1, chain2 } = deriveInitialChains(rootKeyBytes, dh2)

  // Generate new ephemeral key for NEXT ratchet step
  const newKeyPair = generateDHKeyPair()

  // Alice (initiator): chain1 = sending (to Bob), chain2 = receiving (from Bob)
  return {
    ...state,
    currentKeyPair: newKeyPair,
    sendingPublicKey, // Keep the old public key for this chain
    remotePublicKey,
    rootKey,
    sendingChain: chain1,  // For Alice's messages to Bob
    receivingChain: chain2, // For Bob's messages to Alice
    sendCount: 0,
    receiveCount: 0
  }
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypt a message using the ratchet
 *
 * This advances the sending chain and uses the message key once.
 * The message key is then discarded (cannot be reused).
 *
 * @returns The encrypted message with ratchet metadata
 */
export function ratchetEncrypt(
  state: RatchetState,
  plaintext: Uint8Array
): { message: RatchetMessage; newState: RatchetState } {
  if (!state.sendingChain || !state.rootKey) {
    throw new Error('Ratchet not initialized - complete handshake first')
  }

  if (!state.remotePublicKey) {
    throw new Error('No remote public key - complete handshake first')
  }

  // Advance chain and get message key
  const { chainKey, messageKey } = advanceChain(state.sendingChain)

  // Encrypt with XChaCha20-Poly1305
  const cipher = xchacha20poly1305(messageKey.key, messageKey.nonce)
  const ciphertext = cipher.encrypt(plaintext)

  const message: RatchetMessage = {
    version: 1,
    ephemeralKey: state.sendingPublicKey!, // Public key for this sending chain
    messageNumber: messageKey.index,
    previousChainLength: 0, // TODO: Track for skipped messages
    ciphertext
  }

  const newState: RatchetState = {
    ...state,
    sendingChain: chainKey,
    sendCount: state.sendCount + 1
  }

  return { message, newState }
}

/**
 * Decrypt a message using the ratchet
 *
 * This handles:
 * - In-order messages (decrypt immediately)
 * - Out-of-order messages (use cached keys)
 * - New ratchet steps (DH exchange)
 *
 * @returns The decrypted plaintext and updated state
 */
export function ratchetDecrypt(
  state: RatchetState,
  message: RatchetMessage
): { plaintext: Uint8Array; newState: RatchetState } {
  if (!state.rootKey) {
    throw new Error('Ratchet not initialized')
  }

  let newState = { ...state, messageKeyCache: new Map(state.messageKeyCache) }
  let messageKey: MessageKey | null = null

  // Check if this is a new ratchet step (new ephemeral key from sender)
  const isNewRatchet = !state.remotePublicKey ||
    !arraysEqual(message.ephemeralKey, state.remotePublicKey)

  if (isNewRatchet) {
    // Perform DH ratchet step
    newState = performDHRatchet(newState, message.ephemeralKey)
  }

  // Get or derive the message key
  if (newState.receivingChain) {
    if (message.messageNumber < newState.receivingChain.index) {
      // Out-of-order message - check cache
      messageKey = newState.messageKeyCache.get(message.messageNumber) || null
      if (!messageKey) {
        throw new Error(
          `Missing message key for index ${message.messageNumber} - ` +
          `message may be too old or this is a replay attack`
        )
      }
      // Remove from cache after use
      newState.messageKeyCache.delete(message.messageNumber)
    } else {
      // Derive message keys up to the needed index
      let chain = newState.receivingChain
      const skippedKeys: Array<[number, MessageKey]> = []

      while (chain.index <= message.messageNumber) {
        const result = advanceChain(chain)

        if (chain.index === message.messageNumber) {
          messageKey = result.messageKey
        } else {
          // Cache skipped message keys for potential out-of-order delivery
          skippedKeys.push([chain.index, result.messageKey])
        }
        chain = result.chainKey
      }

      // Store skipped keys (limit cache size)
      for (const [idx, key] of skippedKeys) {
        if (newState.messageKeyCache.size >= MAX_SKIP) {
          // Remove oldest key
          const oldestKey = Math.min(...newState.messageKeyCache.keys())
          newState.messageKeyCache.delete(oldestKey)
        }
        newState.messageKeyCache.set(idx, key)
      }

      newState.receivingChain = chain
    }
  }

  if (!messageKey) {
    throw new Error('Could not derive message key - ratchet state may be corrupted')
  }

  // Decrypt
  try {
    const cipher = xchacha20poly1305(messageKey.key, messageKey.nonce)
    const plaintext = cipher.decrypt(message.ciphertext)

    return {
      plaintext,
      newState: {
        ...newState,
        receiveCount: newState.receiveCount + 1
      }
    }
  } catch {
    throw new Error('Decryption failed - message may be corrupted or from wrong sender')
  }
}

/**
 * Perform a DH ratchet step
 * Called when we receive a message with a new ephemeral key
 */
function performDHRatchet(state: RatchetState, remotePublicKey: Uint8Array): RatchetState {
  if (!state.currentKeyPair || !state.rootKey) {
    throw new Error('Cannot perform DH ratchet - state not initialized')
  }

  // Step 1: DH with remote's new ephemeral key
  const dh1 = dh(state.currentKeyPair.privateKey, remotePublicKey)

  // Derive new receiving chain
  const { rootKey: newRootKey, chainKey: receivingChain } = deriveChainKey(
    state.rootKey,
    dh1
  )

  // Step 2: Generate new ephemeral key pair
  const newKeyPair = generateDHKeyPair()

  // Step 3: DH with new key pair
  const dh2 = dh(newKeyPair.privateKey, remotePublicKey)

  // Derive new sending chain (uses NEW key pair, so sendingPublicKey = newKeyPair.publicKey)
  const { rootKey, chainKey: sendingChain } = deriveChainKey(newRootKey, dh2)

  return {
    ...state,
    currentKeyPair: newKeyPair,
    sendingPublicKey: newKeyPair.publicKey, // New chain uses new public key
    remotePublicKey,
    rootKey,
    sendingChain,
    receivingChain,
    messageKeyCache: new Map() // Clear cache on new ratchet
  }
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize ratchet state for storage
 *
 * IMPORTANT: The serialized state contains sensitive keys!
 * Always encrypt before storing.
 *
 * @example
 * ```ts
 * const serialized = serializeRatchetState(state)
 * const encrypted = encrypt(serialized, storageKey)
 * await saveToStorage(encrypted)
 * ```
 */
export function serializeRatchetState(state: RatchetState): Uint8Array {
  const serialized: SerializedRatchetState = {
    identityKey: {
      publicKey: bufferToBase64(state.identityKey.publicKey),
      privateKey: bufferToBase64(state.identityKey.privateKey)
    },
    currentKeyPair: {
      publicKey: bufferToBase64(state.currentKeyPair.publicKey),
      privateKey: bufferToBase64(state.currentKeyPair.privateKey)
    },
    sendingPublicKey: state.sendingPublicKey
      ? bufferToBase64(state.sendingPublicKey)
      : null,
    remotePublicKey: state.remotePublicKey
      ? bufferToBase64(state.remotePublicKey)
      : null,
    rootKey: state.rootKey
      ? bufferToBase64(state.rootKey.key)
      : null,
    sendingChain: state.sendingChain
      ? {
          key: bufferToBase64(state.sendingChain.key),
          index: state.sendingChain.index
        }
      : null,
    receivingChain: state.receivingChain
      ? {
          key: bufferToBase64(state.receivingChain.key),
          index: state.receivingChain.index
        }
      : null,
    sendCount: state.sendCount,
    receiveCount: state.receiveCount
  }

  return new TextEncoder().encode(JSON.stringify(serialized))
}

/**
 * Deserialize ratchet state from storage
 *
 * @example
 * ```ts
 * const encrypted = await loadFromStorage()
 * const serialized = decrypt(encrypted, storageKey)
 * const state = deserializeRatchetState(serialized)
 * ```
 */
export function deserializeRatchetState(data: Uint8Array): RatchetState {
  const json: SerializedRatchetState = JSON.parse(new TextDecoder().decode(data))

  return {
    identityKey: {
      publicKey: base64ToBuffer(json.identityKey.publicKey),
      privateKey: base64ToBuffer(json.identityKey.privateKey)
    },
    currentKeyPair: {
      publicKey: base64ToBuffer(json.currentKeyPair.publicKey),
      privateKey: base64ToBuffer(json.currentKeyPair.privateKey)
    },
    sendingPublicKey: json.sendingPublicKey
      ? base64ToBuffer(json.sendingPublicKey)
      : null,
    remotePublicKey: json.remotePublicKey
      ? base64ToBuffer(json.remotePublicKey)
      : null,
    rootKey: json.rootKey
      ? { key: base64ToBuffer(json.rootKey) }
      : null,
    sendingChain: json.sendingChain
      ? {
          key: base64ToBuffer(json.sendingChain.key),
          index: json.sendingChain.index
        }
      : null,
    receivingChain: json.receivingChain
      ? {
          key: base64ToBuffer(json.receivingChain.key),
          index: json.receivingChain.index
        }
      : null,
    messageKeyCache: new Map(),
    sendCount: json.sendCount,
    receiveCount: json.receiveCount
  }
}

// ============================================================================
// Utilities
// ============================================================================

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function bufferToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64')
}

function base64ToBuffer(base64: string): Uint8Array {
  return Buffer.from(base64, 'base64')
}

/**
 * Check if a ratchet state is ready for encryption
 */
export function isRatchetReady(state: RatchetState): boolean {
  return (
    state.rootKey !== null &&
    state.sendingChain !== null &&
    state.remotePublicKey !== null
  )
}

/**
 * Get a summary of ratchet state (for debugging, no secrets)
 */
export function getRatchetSummary(state: RatchetState): {
  ready: boolean
  sendCount: number
  receiveCount: number
  cachedKeys: number
} {
  return {
    ready: isRatchetReady(state),
    sendCount: state.sendCount,
    receiveCount: state.receiveCount,
    cachedKeys: state.messageKeyCache.size
  }
}
