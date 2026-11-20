/**
 * Proximity Handshake Protocol
 *
 * Enables robots to detect, challenge, and verify humans in physical proximity.
 * Supports NFC, BLE, and QR code detection methods.
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Detection methods
 */
export type DetectionMethod = 'nfc' | 'ble' | 'qr_code' | 'face_recognition';

/**
 * Detection input
 */
export interface DetectionInput {
  method: DetectionMethod;
  signal_strength?: number;
  device_id?: string;
  scanned_data?: string;
}

/**
 * Detection result
 */
export interface DetectionResult {
  method: DetectionMethod;
  proximity_cm: number;
  confidence: number;
  device_id?: string;
  timestamp: string;
}

/**
 * Challenge generation input
 */
export interface ChallengeInput {
  robot_id: string;
  requested_sections: number[];
  purpose: string;
  nonce?: string;
  ttl_seconds?: number;
}

/**
 * Robot challenge
 */
export interface RobotChallenge {
  robot_id: string;
  requested_sections: number[];
  purpose: string;
  nonce: string;
  expires_at: string;
  generated_at: string;
}

/**
 * Response creation input
 */
export interface ResponseInput {
  human_idiomark_id: string;
  challenge_nonce: string;
  consent_token: string;
  idiomark_data_hash: string;
  granted_sections?: number[];
}

/**
 * Human response
 */
export interface HumanResponse {
  human_idiomark_id: string;
  consent_token: string;
  idiomark_data_hash: string;
  challenge_nonce: string;
  granted_sections?: number[];
  signature: string;
  timestamp: string;
}

/**
 * Verification input
 */
export interface VerificationInput {
  challenge: RobotChallenge;
  response: HumanResponse;
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  signature_valid: boolean;
  sections_authorized: boolean;
  token_not_expired: boolean;
  nonce_match: boolean;
  replay_detected?: boolean;
  denied_sections?: number[];
  granted_sections?: number[];
}

/**
 * Handshake state
 */
export type HandshakeState = 'idle' | 'detecting' | 'challenging' | 'responding' | 'verifying' | 'complete' | 'failed';

// ============================================================================
// PROXIMITY DETECTOR
// ============================================================================

/**
 * Detects human proximity via various methods
 */
export class ProximityDetector {
  /**
   * Detect human proximity
   */
  detect(input: DetectionInput): DetectionResult {
    const timestamp = new Date().toISOString();

    switch (input.method) {
      case 'nfc':
        return this.detectNFC(input, timestamp);
      case 'ble':
        return this.detectBLE(input, timestamp);
      case 'qr_code':
        return this.detectQRCode(input, timestamp);
      case 'face_recognition':
        return this.detectFace(input, timestamp);
      default:
        return {
          method: input.method,
          proximity_cm: 1000,
          confidence: 0,
          timestamp
        };
    }
  }

  private detectNFC(input: DetectionInput, timestamp: string): DetectionResult {
    // NFC is very close range, high confidence
    const strength = input.signal_strength ?? 0.9;
    return {
      method: 'nfc',
      proximity_cm: Math.max(1, 5 * (1 - strength)),
      confidence: Math.min(0.99, 0.85 + strength * 0.14),
      device_id: input.device_id,
      timestamp
    };
  }

  private detectBLE(input: DetectionInput, timestamp: string): DetectionResult {
    // BLE has longer range, lower confidence
    const strength = input.signal_strength ?? 0.5;
    // Approximate distance: -60dBm = ~1m, every -20dBm = ~10x distance
    const proximityCm = Math.round(100 / (strength * strength + 0.1));
    return {
      method: 'ble',
      proximity_cm: Math.min(5000, proximityCm),
      confidence: Math.min(0.95, 0.4 + strength * 0.5),
      device_id: input.device_id,
      timestamp
    };
  }

  private detectQRCode(input: DetectionInput, timestamp: string): DetectionResult {
    // QR code scan is intentional, high confidence
    return {
      method: 'qr_code',
      proximity_cm: 50, // Typically arm's length
      confidence: 0.95,
      device_id: input.device_id,
      timestamp
    };
  }

  private detectFace(input: DetectionInput, timestamp: string): DetectionResult {
    // Face recognition depends on camera and settings
    const strength = input.signal_strength ?? 0.7;
    return {
      method: 'face_recognition',
      proximity_cm: Math.round(200 * (1 - strength + 0.5)),
      confidence: strength,
      device_id: input.device_id,
      timestamp
    };
  }
}

// ============================================================================
// HANDSHAKE CHALLENGE
// ============================================================================

/**
 * Generates challenges from robot to human
 */
export class HandshakeChallenge {
  private usedNonces: Set<string> = new Set();

  /**
   * Generate a new challenge
   */
  generate(input: ChallengeInput): RobotChallenge {
    const nonce = input.nonce ?? this.generateNonce();
    const ttl = input.ttl_seconds ?? 300; // 5 minutes default
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    return {
      robot_id: input.robot_id,
      requested_sections: input.requested_sections,
      purpose: input.purpose,
      nonce,
      expires_at: expiresAt.toISOString(),
      generated_at: now.toISOString()
    };
  }

  /**
   * Check if nonce was already used (for replay protection)
   */
  isNonceUsed(nonce: string): boolean {
    return this.usedNonces.has(nonce);
  }

  /**
   * Mark nonce as used
   */
  markNonceUsed(nonce: string): void {
    this.usedNonces.add(nonce);
  }

  private generateNonce(): string {
    return randomBytes(32).toString('hex');
  }
}

// ============================================================================
// HANDSHAKE RESPONSE
// ============================================================================

/**
 * Creates responses from human to robot
 */
export class HandshakeResponse {
  /**
   * Create a response
   */
  create(input: ResponseInput): HumanResponse {
    const timestamp = new Date().toISOString();
    const signature = this.signResponse(input);

    return {
      human_idiomark_id: input.human_idiomark_id,
      consent_token: input.consent_token,
      idiomark_data_hash: input.idiomark_data_hash,
      challenge_nonce: input.challenge_nonce,
      granted_sections: input.granted_sections,
      signature,
      timestamp
    };
  }

  private signResponse(input: ResponseInput): string {
    // Create deterministic signature payload
    const payload = JSON.stringify({
      human_idiomark_id: input.human_idiomark_id,
      challenge_nonce: input.challenge_nonce,
      consent_token: input.consent_token,
      granted_sections: input.granted_sections ?? []
    });

    return createHash('sha256').update(payload).digest('hex');
  }
}

// ============================================================================
// HANDSHAKE VERIFIER
// ============================================================================

/**
 * Verifies handshake responses on robot side
 */
export class HandshakeVerifier {
  private usedNonces: Set<string> = new Set();

  /**
   * Verify a handshake
   */
  async verify(input: VerificationInput): Promise<VerificationResult> {
    const { challenge, response } = input;

    // Check nonce match
    const nonceMatch = challenge.nonce === response.challenge_nonce;

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(challenge.expires_at);
    const tokenNotExpired = now < expiresAt;

    // Check for replay attack
    const replayDetected = this.usedNonces.has(challenge.nonce);

    // Verify signature
    const signatureValid = this.verifySignature(response);

    // Check section authorization
    const grantedSections = response.granted_sections ?? challenge.requested_sections;
    const deniedSections = challenge.requested_sections.filter(
      s => !grantedSections.includes(s)
    );
    const sectionsAuthorized = deniedSections.length === 0;

    // Overall validity
    const valid = nonceMatch && tokenNotExpired && !replayDetected && signatureValid && sectionsAuthorized;

    // Mark nonce as used if valid
    if (valid) {
      this.usedNonces.add(challenge.nonce);
    }

    return {
      valid,
      signature_valid: signatureValid,
      sections_authorized: sectionsAuthorized,
      token_not_expired: tokenNotExpired,
      nonce_match: nonceMatch,
      replay_detected: replayDetected,
      denied_sections: deniedSections.length > 0 ? deniedSections : undefined,
      granted_sections: grantedSections
    };
  }

  private verifySignature(response: HumanResponse): boolean {
    // Recreate signature payload
    const payload = JSON.stringify({
      human_idiomark_id: response.human_idiomark_id,
      challenge_nonce: response.challenge_nonce,
      consent_token: response.consent_token,
      granted_sections: response.granted_sections ?? []
    });

    const expectedSig = createHash('sha256').update(payload).digest('hex');

    return response.signature === expectedSig;
  }
}

// ============================================================================
// PROXIMITY HANDSHAKE
// ============================================================================

/**
 * Complete proximity handshake protocol
 */
export class ProximityHandshake {
  private detector: ProximityDetector;
  private challenge: HandshakeChallenge;
  private response: HandshakeResponse;
  private verifier: HandshakeVerifier;
  private state: HandshakeState = 'idle';

  constructor() {
    this.detector = new ProximityDetector();
    this.challenge = new HandshakeChallenge();
    this.response = new HandshakeResponse();
    this.verifier = new HandshakeVerifier();
  }

  /**
   * Get current state
   */
  getState(): HandshakeState {
    return this.state;
  }

  /**
   * Start detection phase
   */
  detect(input: DetectionInput): DetectionResult {
    this.state = 'detecting';
    const result = this.detector.detect(input);
    this.state = result.confidence > 0.5 ? 'challenging' : 'idle';
    return result;
  }

  /**
   * Generate challenge
   */
  generateChallenge(input: ChallengeInput): RobotChallenge {
    this.state = 'challenging';
    return this.challenge.generate(input);
  }

  /**
   * Create response
   */
  createResponse(input: ResponseInput): HumanResponse {
    this.state = 'responding';
    return this.response.create(input);
  }

  /**
   * Verify handshake
   */
  async verify(input: VerificationInput): Promise<VerificationResult> {
    this.state = 'verifying';
    const result = await this.verifier.verify(input);
    this.state = result.valid ? 'complete' : 'failed';
    return result;
  }

  /**
   * Reset handshake
   */
  reset(): void {
    this.state = 'idle';
  }
}
