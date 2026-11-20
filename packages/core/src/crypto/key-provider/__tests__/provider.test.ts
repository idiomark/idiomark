/**
 * Key Provider Tests
 *
 * Unit tests for the key provider abstraction layer.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SoftwareKeyProvider } from '../software-provider.js'
import { createKeyProvider, createKeyProviderSync } from '../provider-factory.js'
import type { KeyAlgorithm, KeyUsage } from '../types.js'

// ============================================================================
// Software Provider Tests
// ============================================================================

describe('SoftwareKeyProvider', () => {
  let provider: SoftwareKeyProvider

  beforeEach(() => {
    provider = new SoftwareKeyProvider()
  })

  describe('generateKey', () => {
    it('should generate ed25519 key pair', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])

      expect(keyRef.algorithm).toBe('ed25519')
      expect(keyRef.provider).toBe('software')
      expect(keyRef.hsmBacked).toBe(false)
      expect(keyRef.extractable).toBe(true)
      expect(keyRef.publicKeyHex).toBeDefined()
      expect(keyRef.id).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should generate secp256k1 key pair', async () => {
      const keyRef = await provider.generateKey('secp256k1', ['sign', 'verify'])

      expect(keyRef.algorithm).toBe('secp256k1')
      expect(keyRef.publicKeyHex).toBeDefined()
    })

    it('should generate x25519 key pair', async () => {
      const keyRef = await provider.generateKey('x25519', ['deriveKey'])

      expect(keyRef.algorithm).toBe('x25519')
    })

    it('should generate aes-256-gcm key', async () => {
      const keyRef = await provider.generateKey('aes-256-gcm', ['encrypt', 'decrypt'])

      expect(keyRef.algorithm).toBe('aes-256-gcm')
      // AES keys don't have public keys
      expect(keyRef.publicKeyHex).toBeUndefined()
    })

    it('should throw for unsupported algorithm', async () => {
      await expect(
        provider.generateKey('rsa' as KeyAlgorithm, ['sign'])
      ).rejects.toThrow('Unsupported algorithm')
    })
  })

  describe('importKey', () => {
    it('should import ed25519 key', async () => {
      // Generate a key first
      const originalKey = await provider.generateKey('ed25519', ['sign', 'verify'])
      const privateKey = await provider.exportKey(originalKey)

      // Create new provider and import
      const newProvider = new SoftwareKeyProvider()
      const importedKey = await newProvider.importKey(privateKey, 'ed25519', ['sign', 'verify'])

      expect(importedKey.algorithm).toBe('ed25519')
      expect(importedKey.publicKeyHex).toBe(originalKey.publicKeyHex)
    })

    it('should reject invalid key length', async () => {
      await expect(
        provider.importKey(new Uint8Array(16), 'ed25519', ['sign'])
      ).rejects.toThrow('must be 32 bytes')
    })
  })

  describe('sign and verify', () => {
    it('should sign and verify with ed25519', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
      const data = new TextEncoder().encode('Hello, world!')

      const signResult = await provider.sign(keyRef, data)

      expect(signResult.signature).toBeInstanceOf(Uint8Array)
      expect(signResult.signature.length).toBe(64) // Ed25519 signatures are 64 bytes
      expect(signResult.algorithm).toBe('ed25519')

      const isValid = await provider.verify(keyRef, signResult.signature, data)
      expect(isValid).toBe(true)
    })

    it('should sign and verify with secp256k1', async () => {
      const keyRef = await provider.generateKey('secp256k1', ['sign', 'verify'])
      const data = new TextEncoder().encode('Test message')

      const signResult = await provider.sign(keyRef, data)
      const isValid = await provider.verify(keyRef, signResult.signature, data)

      expect(isValid).toBe(true)
    })

    it('should reject signing with non-signing key', async () => {
      const keyRef = await provider.generateKey('ed25519', ['verify'])
      const data = new TextEncoder().encode('Test')

      await expect(provider.sign(keyRef, data)).rejects.toThrow('does not support signing')
    })

    it('should reject verify with wrong signature', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
      const data = new TextEncoder().encode('Hello')
      const wrongSignature = new Uint8Array(64)

      const isValid = await provider.verify(keyRef, wrongSignature, data)
      expect(isValid).toBe(false)
    })
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt with aes-256-gcm', async () => {
      const keyRef = await provider.generateKey('aes-256-gcm', ['encrypt', 'decrypt'])
      const plaintext = new TextEncoder().encode('Secret message')

      const encryptResult = await provider.encrypt(keyRef, plaintext)

      expect(encryptResult.ciphertext).toBeInstanceOf(Uint8Array)
      expect(encryptResult.iv).toBeDefined()

      const decrypted = await provider.decrypt(
        keyRef,
        encryptResult.ciphertext,
        encryptResult.iv
      )

      expect(decrypted).toEqual(plaintext)
    })

    it('should reject encryption with non-encryption key', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign'])
      const data = new TextEncoder().encode('Test')

      await expect(provider.encrypt(keyRef, data)).rejects.toThrow('does not support encryption')
    })
  })

  describe('deriveKey', () => {
    it('should derive shared secret with x25519', async () => {
      const aliceKey = await provider.generateKey('x25519', ['deriveKey'])
      const bobKey = await provider.generateKey('x25519', ['deriveKey'])

      // Alice derives key with Bob's public key
      const bobPublicKey = hexToBytes(bobKey.publicKeyHex!)
      const aliceResult = await provider.deriveKey(aliceKey, bobPublicKey)

      // Bob derives key with Alice's public key
      const alicePublicKey = hexToBytes(aliceKey.publicKeyHex!)
      const bobResult = await provider.deriveKey(bobKey, alicePublicKey)

      // Both should have the same shared secret
      expect(aliceResult.sharedSecret).toEqual(bobResult.sharedSecret)
    })
  })

  describe('deleteKey', () => {
    it('should delete key', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign'])
      await provider.deleteKey(keyRef)

      // Trying to use the key should fail
      const data = new TextEncoder().encode('Test')
      await expect(provider.sign(keyRef, data)).rejects.toThrow('Key not found')
    })
  })

  describe('getKeyInfo', () => {
    it('should return key info', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
      const info = await provider.getKeyInfo(keyRef)

      expect(info.id).toBe(keyRef.id)
      expect(info.algorithm).toBe('ed25519')
      expect(info.provider).toBe('software')
      expect(info.hsmBacked).toBe(false)
      expect(info.usage).toContain('sign')
      expect(info.usage).toContain('verify')
    })
  })

  describe('capabilities', () => {
    it('should report correct capabilities', () => {
      expect(provider.isHSMBacked()).toBe(false)
      expect(provider.supportsKeyImport()).toBe(true)
      expect(provider.supportsAlgorithm('ed25519')).toBe(true)
      expect(provider.supportsAlgorithm('secp256k1')).toBe(true)
      expect(provider.supportsAlgorithm('x25519')).toBe(true)
      expect(provider.supportsAlgorithm('aes-256-gcm')).toBe(true)
    })
  })

  describe('exportKey', () => {
    it('should export private key', async () => {
      const keyRef = await provider.generateKey('ed25519', ['sign'])
      const privateKey = await provider.exportKey(keyRef)

      expect(privateKey).toBeInstanceOf(Uint8Array)
      expect(privateKey.length).toBe(32)
    })
  })
})

// ============================================================================
// Provider Factory Tests
// ============================================================================

describe('Provider Factory', () => {
  describe('createKeyProviderSync', () => {
    it('should create software provider', () => {
      const provider = createKeyProviderSync()
      expect(provider.name).toBe('software')
    })

    it('should throw for non-software provider', () => {
      const originalEnv = process.env.Idiomark_KEY_PROVIDER
      process.env.Idiomark_KEY_PROVIDER = 'aws-kms'

      expect(() => createKeyProviderSync()).toThrow('requires async initialization')

      process.env.Idiomark_KEY_PROVIDER = originalEnv
    })
  })

  describe('createKeyProvider', () => {
    it('should create software provider by default', async () => {
      const provider = await createKeyProvider()
      expect(provider.name).toBe('software')
    })

    it('should create software provider with explicit config', async () => {
      const provider = await createKeyProvider({ type: 'software' })
      expect(provider.name).toBe('software')
    })

    it('should fall back to software for unknown provider', async () => {
      const provider = await createKeyProvider({ type: 'unknown' as any })
      expect(provider.name).toBe('software')
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
