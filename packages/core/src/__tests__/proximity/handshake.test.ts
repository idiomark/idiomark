import { describe, it, expect } from 'vitest';
import {
  ProximityHandshake,
  ProximityDetector,
  HandshakeChallenge,
  HandshakeResponse,
  HandshakeVerifier,
  type DetectionMethod,
  type HandshakeState
} from '../../proximity/handshake';

describe('Proximity Handshake Protocol', () => {
  describe('ProximityDetector', () => {
    it('should detect NFC proximity', () => {
      const detector = new ProximityDetector();

      const detection = detector.detect({
        method: 'nfc',
        signal_strength: 0.9,
        device_id: 'phone-001'
      });

      expect(detection.method).toBe('nfc');
      expect(detection.proximity_cm).toBeLessThan(10);
      expect(detection.confidence).toBeGreaterThan(0.8);
    });

    it('should detect BLE proximity', () => {
      const detector = new ProximityDetector();

      const detection = detector.detect({
        method: 'ble',
        signal_strength: 0.7,
        device_id: 'watch-001'
      });

      expect(detection.method).toBe('ble');
      expect(detection.confidence).toBeGreaterThan(0.5);
    });

    it('should detect QR code scan', () => {
      const detector = new ProximityDetector();

      const detection = detector.detect({
        method: 'qr_code',
        scanned_data: 'idiomark:user:123',
        device_id: 'phone-001'
      });

      expect(detection.method).toBe('qr_code');
      expect(detection.confidence).toBeGreaterThan(0.9);
    });

    it('should estimate distance from signal strength', () => {
      const detector = new ProximityDetector();

      const nearDetection = detector.detect({
        method: 'ble',
        signal_strength: 0.9,
        device_id: 'test'
      });

      const farDetection = detector.detect({
        method: 'ble',
        signal_strength: 0.3,
        device_id: 'test'
      });

      expect(nearDetection.proximity_cm).toBeLessThan(farDetection.proximity_cm);
    });
  });

  describe('HandshakeChallenge', () => {
    it('should generate a challenge from robot', () => {
      const challenge = new HandshakeChallenge();

      const robotChallenge = challenge.generate({
        robot_id: 'robot-001',
        requested_sections: [13, 14],
        purpose: 'restaurant_service',
        nonce: 'random-nonce-123'
      });

      expect(robotChallenge.robot_id).toBe('robot-001');
      expect(robotChallenge.requested_sections).toContain(13);
      expect(robotChallenge.nonce).toBeDefined();
      expect(robotChallenge.expires_at).toBeDefined();
    });

    it('should include unique nonce for replay protection', () => {
      const challenge = new HandshakeChallenge();

      const c1 = challenge.generate({
        robot_id: 'robot-001',
        requested_sections: [13],
        purpose: 'test'
      });

      const c2 = challenge.generate({
        robot_id: 'robot-001',
        requested_sections: [13],
        purpose: 'test'
      });

      expect(c1.nonce).not.toBe(c2.nonce);
    });

    it('should set expiration time', () => {
      const challenge = new HandshakeChallenge();

      const c = challenge.generate({
        robot_id: 'robot-001',
        requested_sections: [13],
        purpose: 'test'
      });

      const expiresAt = new Date(c.expires_at);
      const now = new Date();

      // Should expire within 5 minutes (default TTL)
      const diffMs = expiresAt.getTime() - now.getTime();
      expect(diffMs).toBeGreaterThan(0);
      expect(diffMs).toBeLessThanOrEqual(5 * 60 * 1000);
    });
  });

  describe('HandshakeResponse', () => {
    it('should create response with valid token', () => {
      const response = new HandshakeResponse();

      const humanResponse = response.create({
        human_idiomark_id: 'human-001',
        challenge_nonce: 'nonce-123',
        consent_token: 'token-abc',
        idiomark_data_hash: 'hash-xyz'
      });

      expect(humanResponse.consent_token).toBe('token-abc');
      expect(humanResponse.idiomark_data_hash).toBe('hash-xyz');
      expect(humanResponse.challenge_nonce).toBe('nonce-123');
    });

    it('should sign response', () => {
      const response = new HandshakeResponse();

      const humanResponse = response.create({
        human_idiomark_id: 'human-001',
        challenge_nonce: 'nonce-123',
        consent_token: 'token-abc',
        idiomark_data_hash: 'hash-xyz'
      });

      expect(humanResponse.signature).toBeDefined();
    });
  });

  describe('HandshakeVerifier', () => {
    it('should verify valid handshake', async () => {
      const verifier = new HandshakeVerifier();
      const responseCreator = new HandshakeResponse();

      // Create proper signed response
      const humanResponse = responseCreator.create({
        human_idiomark_id: 'human-001',
        challenge_nonce: 'nonce-123',
        consent_token: 'valid-token',
        idiomark_data_hash: 'hash-xyz'
      });

      const result = await verifier.verify({
        challenge: {
          robot_id: 'robot-001',
          requested_sections: [13],
          purpose: 'restaurant_service',
          nonce: 'nonce-123',
          expires_at: new Date(Date.now() + 60000).toISOString()
        },
        response: humanResponse
      });

      expect(result.signature_valid).toBe(true);
      expect(result.sections_authorized).toBe(true);
      expect(result.token_not_expired).toBe(true);
    });

    it('should reject expired challenge', async () => {
      const verifier = new HandshakeVerifier();

      const result = await verifier.verify({
        challenge: {
          robot_id: 'robot-001',
          requested_sections: [13],
          purpose: 'test',
          nonce: 'nonce-123',
          expires_at: new Date(Date.now() - 1000).toISOString() // Expired
        },
        response: {
          consent_token: 'token',
          idiomark_data_hash: 'hash',
          challenge_nonce: 'nonce-123',
          signature: 'sig'
        }
      });

      expect(result.token_not_expired).toBe(false);
    });

    it('should reject mismatched nonce', async () => {
      const verifier = new HandshakeVerifier();

      const result = await verifier.verify({
        challenge: {
          robot_id: 'robot-001',
          requested_sections: [13],
          purpose: 'test',
          nonce: 'nonce-123',
          expires_at: new Date(Date.now() + 60000).toISOString()
        },
        response: {
          consent_token: 'token',
          idiomark_data_hash: 'hash',
          challenge_nonce: 'wrong-nonce',
          signature: 'sig'
        }
      });

      expect(result.nonce_match).toBe(false);
    });
  });

  describe('Complete Handshake Flow', () => {
    it('should complete full handshake flow', async () => {
      // 1. Robot detects human
      const detector = new ProximityDetector();
      const detection = detector.detect({
        method: 'nfc',
        signal_strength: 0.9,
        device_id: 'phone-001'
      });

      expect(detection.confidence).toBeGreaterThan(0.8);

      // 2. Robot generates challenge
      const challenge = new HandshakeChallenge();
      const robotChallenge = challenge.generate({
        robot_id: 'robot-001',
        requested_sections: [13],
        purpose: 'restaurant_service'
      });

      expect(robotChallenge.nonce).toBeDefined();

      // 3. Human responds with token
      const response = new HandshakeResponse();
      const humanResponse = response.create({
        human_idiomark_id: 'human-001',
        challenge_nonce: robotChallenge.nonce,
        consent_token: 'token-abc',
        idiomark_data_hash: 'hash-xyz'
      });

      expect(humanResponse.signature).toBeDefined();

      // 4. Robot verifies
      const verifier = new HandshakeVerifier();
      const verification = await verifier.verify({
        challenge: robotChallenge,
        response: humanResponse
      });

      expect(verification.signature_valid).toBe(true);
      expect(verification.nonce_match).toBe(true);
    });
  });

  describe('Security', () => {
    it('should prevent replay attacks', async () => {
      const verifier = new HandshakeVerifier();
      const responseCreator = new HandshakeResponse();

      const challenge = {
        robot_id: 'robot-001',
        requested_sections: [13],
        purpose: 'test',
        nonce: 'used-nonce',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        generated_at: new Date().toISOString()
      };

      // Create proper signed response
      const response = responseCreator.create({
        human_idiomark_id: 'human-001',
        challenge_nonce: 'used-nonce',
        consent_token: 'token',
        idiomark_data_hash: 'hash'
      });

      // First use - should succeed
      const result1 = await verifier.verify({ challenge, response });
      expect(result1.valid).toBe(true);

      // Replay attempt - should fail
      const result2 = await verifier.verify({ challenge, response });
      expect(result2.replay_detected).toBe(true);
    });

    it('should validate section permissions', async () => {
      const verifier = new HandshakeVerifier();

      // Token only grants section 13, robot requests 13 + 14
      const result = await verifier.verify({
        challenge: {
          robot_id: 'robot-001',
          requested_sections: [13, 14],
          purpose: 'test',
          nonce: 'nonce-456',
          expires_at: new Date(Date.now() + 60000).toISOString()
        },
        response: {
          consent_token: 'limited-token',
          idiomark_data_hash: 'hash',
          challenge_nonce: 'nonce-456',
          signature: 'sig',
          granted_sections: [13] // Only granted section 13
        }
      });

      expect(result.sections_authorized).toBe(false);
      expect(result.denied_sections).toContain(14);
    });
  });
});
