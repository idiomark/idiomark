/**
 * UCP (Universal Commerce Protocol) Types
 *
 * Types for implementing UCP profile generation and serving
 * Reference: https://ucp.dev/, https://developers.google.com/merchant/ucp
 */

import type { IdiomarkFile } from '@idiomark/core'

// ============================================================
// UCP Core Types
// ============================================================

export interface UCPProfile {
  /** Standard UCP profile version */
  ucp_version: string
  /** Merchant/business identifier */
  merchant_id: string
  /** Business name */
  business_name: string
  /** Website URL */
  website?: string
  /** Customer service email */
  customer_service_email?: string

  /** Standard UCP capabilities */
  capabilities: UCPCapabilities

  /** Idiomark-infused fields for personalized shopping */
  personality_integration?: UCPPersonalityIntegration

  /** Supported locales */
  supported_locales?: string[]

  /** Tax calculation */
  tax_calculation?: UCPTaxCalculation

  /** Shipping options */
  shipping_options?: UCPShippingOptions[]
}

export interface UCPCapabilities {
  /** Product search and discovery */
  product_search: boolean
  /** Product inventory checking */
  inventory_check: boolean
  /** Checkout process */
  checkout: boolean
  /** Payment processing via tokenization */
  payment_tokenization: boolean
  /** Order status tracking */
  order_tracking: boolean
  /** Return/exchange processing */
  returns: boolean
  /** Gift options */
  gift_options: boolean
}

export interface UCPPersonalityIntegration {
  /** Enable personality-infused interactions */
  enabled: boolean

  /** How AI agent should interact */
  interaction_style: {
    /** Primary tone */
    tone?: string
    /** Formality level (0-1) */
    formality?: number
    /** Directness level (0-1) */
    directness?: number
    /** Humor level (0-1) */
    humor?: number
    /** Enthusiasm level (0-1) */
    enthusiasm?: number
  }

  /** Product recommendation strategy using personality */
  recommendation_strategy: {
    /** Match products to user's values */
    values_alignment?: string[]
    /** Prioritize domains user is interested in */
    domain_preferences?: string[]
    /** Use voice matching for product descriptions */
    voice_matching?: boolean
  }

  /** System prompt for AI agent interactions */
  system_prompt?: string
}

export interface UCPTaxCalculation {
  /** Calculate tax before checkout */
  calculate_before_checkout: boolean
  /** Supported tax regions */
  supported_regions?: string[]
}

export interface UCPShippingOptions {
  /** Shipping option ID */
  id: string
  /** Display name */
  name: string
  /** Estimated days */
  estimated_days: number
  /** Cost in USD */
  cost_usd?: number
  /** International shipping */
  international: boolean
}

// ============================================================
// Configuration
// ============================================================

export interface UCPAdapterOptions {
  /** Merchant ID */
  merchantId: string
  /** Business name */
  businessName: string
  /** Idiomark personality to integrate */
  personality: IdiomarkFile
  /** Port to serve profile on */
  port?: number
  /** Also serve as MCP server (UCP supports MCP!) */
  enableMCP?: boolean
  /** Website URL */
  website?: string
  /** Customer service email */
  customerServiceEmail?: string
}

export interface UCPServeResult {
  /** Profile endpoint URL */
  profileUrl: string
  /** MCP server info (if enabled) */
  mcpServer?: {
    transport: 'stdio' | 'http'
    port?: number
  }
}
