/**
 * IdiomarkD Security & Privacy
 *
 * Safeguards for sensitive data handling in IdiomarkD extraction
 * for Idiomark (Idiomark for Developers) profiles.
 */

import type { CodeSample } from './types-dev'

/**
 * Sensitive data patterns
 */
const SENSITIVE_PATTERNS = {
  // API Keys
  apiKeys: [
    /apikey/i,
    /api[_-]?key/i,
    /secret/i,
    /token/i,
    /password/i,
    /credential/i
  ],
  // Database URLs
  databaseUrls: [
    /mysql:\/\//i,
    /mongodb:\/\//i,
    /postgres:\/\//i,
    /redis:\/\//i,
    /firebaseio\.com/i,
    /supabase\.com/i
  ],
  // Private keys
  privateKeys: [
    /private[_-]?key/i,
    /secret[_-]?key/i,
    /access[_-]?key/i,
    /auth[_-]?key/i,
    /session[_-]?key/i,
    /jwt/i,
    /oauth[_-]?secret/i,
  ],
  // Email addresses
  emails: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    ],
  // Phone numbers
  phones: [
    /\b\d{3}[-.)]?\d{3}\b/g,
    ],
  // Certificates
  certificates: [
    /-----BEGIN [A-Z0-9]+-----/i,
    /-----BEGIN CERTIFICATE-----/i,
    /-----BEGIN RSA PRIVATE KEY-----/i,
  ],
  // Personal info
  personalInfo: [
    /ssn/i,
    /social[_-]?security[_-]?number/i,
    /dob/i,
    /birth[_-]?date/i,
    /address/i,
    /passport/i,
    ],
  // Cloud credentials
  cloudCredentials: [
    /aws[_-]?access[_-]?key/i,
    /azure[_-]?storage[_-]?key/i,
    /gcp_[a-z]+_key/i,
  ],
}

/**
 * Filter options
 */
export interface FilterOptions {
  /** Filter API keys (default: true) */
  removeApiKeys?: boolean
  /** Filter database URLs (default: true) */
  removeDatabaseUrls?: boolean
  /** Filter private keys (default: true) */
  removePrivateKeys?: boolean
  /** Filter email addresses (default: true) */
  removeEmails?: boolean
  /** Filter phone numbers (default: true) */
  removePhones?: boolean
  /** Filter certificates (default: true) */
  removeCertificates?: boolean
  /** Filter personal info (default: true) */
  removePersonalInfo?: boolean
  /** Filter cloud credentials (default: true) */
  removeCloudCredentials?: boolean
  /** Custom patterns to filter (default: []) */
  customPatterns?: RegExp[]
}

/**
 * Sanitization result
 */
export interface SanitizationResult {
  original: { sampleCount: number }
  sanitized: { sampleCount: number }
  removed: { count: number; patterns: string[] }
  warnings: { count: number; messages: string[] }
}

/**
 * IdiomarkD Sanitizer
 */
export class IdiomarkDSanitizer {
  private options: FilterOptions

  constructor(options: FilterOptions = {}) {
    this.options = {
      removeApiKeys: true,
      removeDatabaseUrls: true,
      removePrivateKeys: true,
      removeEmails: true,
      removePhones: true,
      removeCertificates: true,
      removePersonalInfo: true,
      removeCloudCredentials: true,
      ...options
    }
  }

  /**
   * Sanitize code samples
   */
  sanitizeSamples(samples: CodeSample[]): SanitizationResult {
    const sanitized: CodeSample[] = []
    const removed: { count: number; patterns: string[] } = { count: 0, patterns: [] }
    const warnings: string[] = []

    for (const sample of samples) {
      const content = sample.content
      let modified = false
      let removedPatterns: string[] = []

      // Check each sensitive pattern
      for (const [patternName, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
        if (!this.shouldFilter(patternName)) {
          continue
        }

        // Each category holds a list of RegExp; build a fresh stateless regex
        // per pattern (avoids /g lastIndex carry-over between samples).
        const matched = (pattern as RegExp[]).some((re) => {
          const flags = re.flags.includes('i') ? re.flags : re.flags + 'i'
          return new RegExp(re.source, flags.replace('g', '')).test(content)
        })

        if (matched) {
          modified = true
          removedPatterns.push(patternName)
        }
      }

      // Check custom patterns
      if (this.options.customPatterns) {
        for (const customPattern of this.options.customPatterns) {
          if (customPattern.test(content)) {
            modified = true
            removedPatterns.push(`custom: ${customPattern.source}`)
          }
        }
      }

      if (modified) {
        // Create sanitized version
        const sanitizedContent = this.sanitizeContent(content)

        sanitized.push({
          ...sample,
          content: sanitizedContent
        })

        removed.count++
      } else {
        sanitized.push(sample)
      }
    }

    return {
      original: { sampleCount: samples.length },
      sanitized: { sampleCount: sanitized.length },
      removed,
      warnings: { count: warnings.length, messages: warnings }
    }
  }

  /**
   * Check if pattern should be filtered
   */
  private shouldFilter(patternName: string): boolean {
    const filterKey = `remove${patternName.charAt(0).toUpperCase() + patternName.slice(1)}`
    const options = this.options as Record<string, boolean | undefined>
    return options[filterKey] === true || options[filterKey] === undefined
  }

  /**
   * Sanitize content by removing sensitive data
   */
  private sanitizeContent(content: string): string {
    let sanitized = content

    // Remove API keys
    if (this.options.removeApiKeys !== false) {
      for (const pattern of SENSITIVE_PATTERNS.apiKeys) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove database URLs
    if (this.options.removeDatabaseUrls !== false) {
      for (const pattern of SENSITIVE_PATTERNS.databaseUrls) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove private keys
    if (this.options.removePrivateKeys !== false) {
      for (const pattern of SENSITIVE_PATTERNS.privateKeys) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove email addresses
    if (this.options.removeEmails !== false) {
      for (const pattern of SENSITIVE_PATTERNS.emails) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove phone numbers
    if (this.options.removePhones !== false) {
      for (const pattern of SENSITIVE_PATTERNS.phones) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove certificates
    if (this.options.removeCertificates !== false) {
      for (const pattern of SENSITIVE_PATTERNS.certificates) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove personal info
    if (this.options.removePersonalInfo !== false) {
      for (const pattern of SENSITIVE_PATTERNS.personalInfo) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    // Remove cloud credentials
    if (this.options.removeCloudCredentials !== false) {
      for (const pattern of SENSITIVE_PATTERNS.cloudCredentials) {
        const regex = new RegExp(pattern, 'gi')
        sanitized = sanitized.replace(regex, '[REDACTED]')
      }
    }

    return sanitized
  }

  /**
   * Get sensitive data patterns
   */
  getSensitivePatterns(): typeof SENSITIVE_PATTERNS {
    return SENSITIVE_PATTERNS
  }
}

/**
 * Sanitize code samples
 */
export function sanitizeCodeSamples(
  samples: CodeSample[],
  options?: FilterOptions
): SanitizationResult {
  const sanitizer = new IdiomarkDSanitizer(options)
  return sanitizer.sanitizeSamples(samples)
}

/**
 * Get sensitive data patterns
 */
export function getSensitivePatterns(): typeof SENSITIVE_PATTERNS {
  return SENSITIVE_PATTERNS
}
