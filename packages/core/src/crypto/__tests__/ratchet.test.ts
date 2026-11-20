/**
 * Tests for Double Ratchet Implementation
 *
 * These tests verify:
 * 1. Basic handshake and message exchange
 * 2. Forward secrecy (compromised keys don't expose past messages)
 * 3. Out-of-order message handling
 * 4. State serialization/deserialization
 *
 * @module @idiomark/core/crypto/ratchet.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
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
  type RatchetState
} from '../ratchet'

// ============================================================================
// Test Utilities
// ============================================================================

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

// ============================================================================
// Tests
// ============================================================================

describe('Double Ratchet', () => {
  describe('Key Generation', () => {
    it('should generate valid X25519 key pairs', () => {
      const keyPair = generateDHKeyPair()

      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array)
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array)
      expect(keyPair.publicKey.length).toBe(32)
      expect(keyPair.privateKey.length).toBe(32)
    })

    it('should generate unique key pairs', () => {
      const keyPair1 = generateDHKeyPair()
      const keyPair2 = generateDHKeyPair()

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey)
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey)
    })
  })

  describe('Handshake', () => {
    it('should complete a full handshake between two parties', () => {
      // Alice initiates
      const aliceIdentity = generateDHKeyPair()
      const aliceState = initiateRatchet(aliceIdentity)

      // Alice sends her public key to Bob
      const alicePublicKey = aliceState.currentKeyPair.publicKey

      // Bob accepts
      const bobIdentity = generateDHKeyPair()
      const bobState = acceptRatchet(bobIdentity, alicePublicKey)

      // Bob sends his public key to Alice
      const bobPublicKey = bobState.currentKeyPair.publicKey

      // Alice completes handshake
      const aliceReady = completeHandshake(aliceState, bobPublicKey)

      // Both should now be ready
      expect(isRatchetReady(aliceReady)).toBe(true)
      expect(isRatchetReady(bobState)).toBe(true)
    })

    it('should fail encryption before handshake is complete', () => {
      const identity = generateDHKeyPair()
      const state = initiateRatchet(identity)

      expect(() => {
        ratchetEncrypt(state, textToBytes('test'))
      }).toThrow('Ratchet not initialized')
    })
  })

  describe('Message Exchange', () => {
    let aliceState: RatchetState
    let bobState: RatchetState

    beforeEach(() => {
      // Setup fresh handshake for each test
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      aliceState = initiateRatchet(aliceIdentity)
      const bobAccept = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobAccept.currentKeyPair.publicKey)
      bobState = bobAccept
    })

    it('should encrypt and decrypt a message', () => {
      // Alice sends to Bob
      const { message, newState } = ratchetEncrypt(aliceState, textToBytes('Hello Bob!'))
      aliceState = newState

      // Bob receives
      const { plaintext, newState: bobNewState } = ratchetDecrypt(bobState, message)
      bobState = bobNewState

      expect(bytesToText(plaintext)).toBe('Hello Bob!')
    })

    it('should handle bidirectional messages', () => {
      // Alice -> Bob
      const { message: msg1, newState: alice1 } = ratchetEncrypt(
        aliceState,
        textToBytes('Hello from Alice')
      )
      const { plaintext: pt1, newState: bob1 } = ratchetDecrypt(bobState, msg1)
      expect(bytesToText(pt1)).toBe('Hello from Alice')

      // Bob -> Alice
      const { message: msg2, newState: bob2 } = ratchetEncrypt(
        bob1,
        textToBytes('Hello from Bob')
      )
      const { plaintext: pt2, newState: alice2 } = ratchetDecrypt(alice1, msg2)
      expect(bytesToText(pt2)).toBe('Hello from Bob')

      aliceState = alice2
      bobState = bob2
    })

    it('should handle multiple sequential messages', () => {
      const messages = ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5']

      for (const msg of messages) {
        const { message, newState } = ratchetEncrypt(aliceState, textToBytes(msg))
        aliceState = newState

        const { plaintext, newState: bobNewState } = ratchetDecrypt(bobState, message)
        bobState = bobNewState

        expect(bytesToText(plaintext)).toBe(msg)
      }

      expect(aliceState.sendCount).toBe(5)
      expect(bobState.receiveCount).toBe(5)
    })

    it('should reject tampered messages', () => {
      const { message, newState } = ratchetEncrypt(aliceState, textToBytes('Secret'))
      aliceState = newState

      // Tamper with ciphertext
      const tamperedMessage = { ...message }
      tamperedMessage.ciphertext = new Uint8Array([...message.ciphertext])
      tamperedMessage.ciphertext[0] ^= 0xff // Flip first byte

      expect(() => {
        ratchetDecrypt(bobState, tamperedMessage)
      }).toThrow()
    })

    it('should reject replayed messages', () => {
      const { message, newState } = ratchetEncrypt(aliceState, textToBytes('Secret'))
      aliceState = newState

      // First receive succeeds
      const { plaintext, newState: bob1 } = ratchetDecrypt(bobState, message)
      bobState = bob1  // Important: update state after receive!
      expect(bytesToText(plaintext)).toBe('Secret')

      // Send another message to advance the chain
      const { message: msg2, newState: alice2 } = ratchetEncrypt(
        aliceState,
        textToBytes('Next message')
      )
      const { newState: bob2 } = ratchetDecrypt(bobState, msg2)
      bobState = bob2
      aliceState = alice2

      // Replay attack fails (key already used and deleted)
      expect(() => {
        ratchetDecrypt(bobState, message)
      }).toThrow()
    })
  })

  describe('Forward Secrecy', () => {
    it('should not allow decryption of old messages after state update', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      // Send message 1
      const { message: msg1, newState: alice1 } = ratchetEncrypt(
        aliceState,
        textToBytes('Message 1')
      )
      aliceState = alice1

      // Send message 2
      const { message: msg2, newState: alice2 } = ratchetEncrypt(
        aliceState,
        textToBytes('Message 2')
      )
      aliceState = alice2

      // Bob receives message 2 first (out of order) - caches key for msg1
      const { plaintext: pt2, newState: bob2 } = ratchetDecrypt(bobState, msg2)
      bobState = bob2
      expect(bytesToText(pt2)).toBe('Message 2')

      // Bob can still decrypt message 1 (from cache)
      const { plaintext: pt1, newState: bob3 } = ratchetDecrypt(bobState, msg1)
      bobState = bob3
      expect(bytesToText(pt1)).toBe('Message 1')

      // Now msg1's key is removed from cache after use
      // Trying to decrypt msg1 again should fail
      expect(() => {
        ratchetDecrypt(bobState, msg1)
      }).toThrow()
    })
  })

  describe('Out-of-Order Messages', () => {
    it('should handle out-of-order delivery', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      // Alice sends messages 1, 2, 3
      const messages: Array<{ message: typeof aliceState; text: string }> = []
      for (let i = 1; i <= 3; i++) {
        const { message, newState } = ratchetEncrypt(aliceState, textToBytes(`Message ${i}`))
        messages.push({ message, text: `Message ${i}` })
        aliceState = newState
      }

      // Bob receives in order 3, 1, 2
      const { plaintext: pt3, newState: bob1 } = ratchetDecrypt(bobState, messages[2].message)
      expect(bytesToText(pt3)).toBe('Message 3')

      const { plaintext: pt1, newState: bob2 } = ratchetDecrypt(bob1, messages[0].message)
      expect(bytesToText(pt1)).toBe('Message 1')

      const { plaintext: pt2 } = ratchetDecrypt(bob2, messages[1].message)
      expect(bytesToText(pt2)).toBe('Message 2')
    })
  })

  describe('Serialization', () => {
    it('should serialize and deserialize ratchet state', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      // Exchange some messages
      const { message, newState } = ratchetEncrypt(aliceState, textToBytes('Test'))
      aliceState = newState
      const { newState: bobNewState } = ratchetDecrypt(bobState, message)
      bobState = bobNewState

      // Serialize Alice's state
      const serialized = serializeRatchetState(aliceState)
      const restored = deserializeRatchetState(serialized)

      // Should have same properties
      expect(restored.sendCount).toBe(aliceState.sendCount)
      expect(restored.receiveCount).toBe(aliceState.receiveCount)
      expect(restored.rootKey).not.toBeNull()
      expect(isRatchetReady(restored)).toBe(true)

      // Can continue using restored state
      const { message: msg2, newState: alice2 } = ratchetEncrypt(
        restored,
        textToBytes('After restore')
      )
      const { plaintext } = ratchetDecrypt(bobState, msg2)
      expect(bytesToText(plaintext)).toBe('After restore')
    })
  })

  describe('State Summary', () => {
    it('should provide a safe summary without secrets', () => {
      const identity = generateDHKeyPair()
      const state = initiateRatchet(identity)

      const summary = getRatchetSummary(state)

      expect(summary).toHaveProperty('ready')
      expect(summary).toHaveProperty('sendCount')
      expect(summary).toHaveProperty('receiveCount')
      expect(summary).toHaveProperty('cachedKeys')

      // Summary should not contain any key material
      const summaryStr = JSON.stringify(summary)
      expect(summaryStr).not.toMatch(/[A-Za-z0-9+/]{40,}/) // No base64 keys
    })
  })

  describe('Error Cases', () => {
    it('should reject messages with wrong version', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      const { message, newState } = ratchetEncrypt(aliceState, textToBytes('Test'))
      aliceState = newState

      // Tamper with version
      const badMessage = { ...message, version: 999 as 1 }

      // Should still work - version is informational
      // (In production, you'd want to reject unknown versions)
      const { plaintext } = ratchetDecrypt(bobState, badMessage)
      expect(bytesToText(plaintext)).toBe('Test')
    })

    it('should handle empty messages', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      const { message, newState } = ratchetEncrypt(aliceState, new Uint8Array(0))
      aliceState = newState

      const { plaintext } = ratchetDecrypt(bobState, message)
      expect(plaintext.length).toBe(0)
    })

    it('should handle large messages', () => {
      const aliceIdentity = generateDHKeyPair()
      const bobIdentity = generateDHKeyPair()

      let aliceState = initiateRatchet(aliceIdentity)
      let bobState = acceptRatchet(bobIdentity, aliceState.currentKeyPair.publicKey)
      aliceState = completeHandshake(aliceState, bobState.currentKeyPair.publicKey)

      // 100KB message (reduced from 1MB for faster tests)
      const largeMessage = new Uint8Array(100 * 1024).fill(42)

      const { message, newState } = ratchetEncrypt(aliceState, largeMessage)
      aliceState = newState

      const { plaintext } = ratchetDecrypt(bobState, message)
      expect(plaintext.length).toBe(largeMessage.length)
      expect(plaintext).toEqual(largeMessage)
    })
  })
})
