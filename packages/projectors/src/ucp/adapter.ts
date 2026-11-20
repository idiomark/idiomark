/**
 * UCP (Universal Commerce Protocol) Adapter
 *
 * Generates UCP Profiles infused with Idiomark personality.
 * Can also serve as MCP server (UCP supports MCP as transport).
 *
 * References:
 * - https://ucp.dev/
 * - https://developers.google.com/merchant/ucp
 * - https://support.google.com/merchants/answer/16837055
 */

import { createServer as createHttpServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'

import type {
  UCPAdapterOptions,
  UCPProfile,
  UCPServeResult
} from './types'
import type { IdiomarkFile } from '@idiomark/core'
import { BaseProjectionAdapter } from '../base'

// ============================================================
// UCP Adapter Implementation
// ============================================================

export class UCPAdapter extends BaseProjectionAdapter {
  private server: any = null
  private config: UCPAdapterOptions
  private personality: IdiomarkFile | null = null

  constructor(config: UCPAdapterOptions) {
    super('ucp-adapter', { name: 'ucp-adapter' })
    this.config = config
    this.personality = config.personality
  }

  // ============================================================
  // UCP Profile Generation
  // ============================================================

  /**
   * Generate UCP Profile with Idiomark personality integration
   */
  async generateProfile(): Promise<UCPProfile> {
    if (!this.personality) {
      throw new Error('Personality not loaded')
    }

    const { personality, metadata } = this.personality
    const { merchantId, businessName, website, customerServiceEmail } = this.config

    // Build system prompt for AI agent interactions
    const { buildSystemPrompt } = await import('@idiomark/inference')
    const systemPrompt = buildSystemPrompt(this.personality, 'balanced')

    // Extract values and domains
    const values = personality?.values?.map((v: any) => v.name) || []
    const domains = personality?.domains?.map((d: any) => d.name) || []

    return {
      ucp_version: '1.0',
      merchant_id: merchantId,
      business_name: businessName,
      website,
      customer_service_email: customerServiceEmail,

      // Standard UCP capabilities
      capabilities: {
        product_search: true,
        inventory_check: true,
        checkout: true,
        payment_tokenization: true,
        order_tracking: true,
        returns: true,
        gift_options: true
      },

      // Idiomark personality integration
      personality_integration: {
        enabled: true,
        interaction_style: {
          tone: personality?.voice?.tone?.primary,
          secondary_tone: personality?.voice?.tone?.secondary,
          formality: personality?.voice?.formality,
          directness: personality?.voice?.directness,
          humor: personality?.voice?.humor,
          enthusiasm: personality?.voice?.enthusiasm,
          emoji_usage: personality?.voice?.emoji_usage?.frequency
        },
        recommendation_strategy: {
          values_alignment: values,
          domain_preferences: domains,
          voice_matching: true,
          // Add personality domains to improve product matching
          personality_domains: domains
        },
        system_prompt: systemPrompt
      },

      // Standard fields
      supported_locales: ['en-US'],
      tax_calculation: {
        calculate_before_checkout: true,
        supported_regions: ['US', 'CA', 'GB', 'EU']
      },
      shipping_options: [
        {
          id: 'standard',
          name: 'Standard Shipping',
          estimated_days: 5,
          cost_usd: 5.99,
          international: false
        },
        {
          id: 'express',
          name: 'Express Shipping',
          estimated_days: 2,
          cost_usd: 14.99,
          international: true
        }
      ]
    }
  }

  // ============================================================
  // Serve UCP Profile
  // ============================================================

  /**
   * Start serving UCP profile (and optionally MCP server)
   */
  async start(): Promise<UCPServeResult> {
    const port = this.config.port || 3000

    // Generate the profile
    const profile = await this.generateProfile()

    this.server = createHttpServer(async (req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      // UCP Profile endpoint (standard location)
      if (req.method === 'GET' && req.url === '/.well-known/ucp-profile.json') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Expose-Headers': 'Content-Type'
        })
        res.end(JSON.stringify(profile, null, 2))
        return
      }

      // Alternative UCP profile endpoint
      if (req.method === 'GET' && req.url === '/ucp/profile') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(profile, null, 2))
        return
      }

      // Root endpoint
      if (req.method === 'GET' && req.url === '/') {
        await this.handleRoot(req, res, profile)
        return
      }

      // Health check
      if (req.method === 'GET' && req.url === '/health') {
        const health = await this.healthCheck()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(health))
        return
      }

      // If MCP is enabled, forward MCP traffic
      // (This would integrate with the MCP server adapter)
      if (this.config.enableMCP && req.url?.startsWith('/mcp')) {
        // TODO: Integrate with MCPServer
        res.writeHead(501)
        res.end(JSON.stringify({ error: 'MCP integration not yet implemented' }))
        return
      }

      // 404
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    })

    this.server.listen(port, () => {
      console.error(`UCP Profile server listening on port ${port}`)
      console.error(`Profile available at: http://localhost:${port}/.well-known/ucp-profile.json`)
      this.emitter.emit('serverStart', { port, profile })
    })

    return {
      profileUrl: `http://localhost:${port}/.well-known/ucp-profile.json`,
      mcpServer: this.config.enableMCP ? {
        transport: 'http',
        port
      } : undefined
    }
  }

  /**
   * Handle root endpoint with info
   */
  private async handleRoot(req: IncomingMessage, res: ServerResponse, profile: UCPProfile): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>UCP Profile - ${profile.business_name}</title>
  <meta name="description" content="UCP Profile for ${profile.business_name}">
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; }
    .badge { display: inline-block; background: #4285f4; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .section { background: #f5f5f5; padding: 20px; margin: 16px 0; border-radius: 8px; }
    h1 { color: #333; }
    .endpoint { background: #e8f5e9; border-left: 4px solid #4285f4; padding: 12px; margin: 8px 0; }
    code { background: #333; color: #4ade80; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1><span class="badge">UCP</span> ${profile.business_name}</h1>

  <div class="section">
    <h3>🎭 Idiomark Personality Integration</h3>
    <p><strong>Tone:</strong> ${profile.personality_integration?.interaction_style?.tone || 'Not specified'}</p>
    <p><strong>Formality:</strong> ${profile.personality_integration?.interaction_style?.formality?.toFixed(2) || 'N/A'}</p>
    <p><strong>Values:</strong> ${profile.personality_integration?.recommendation_strategy?.values_alignment?.join(', ') || 'None'}</p>
  </div>

  <div class="section">
    <h3>📦 UCP Capabilities</h3>
    <ul>
      ${Object.entries(profile.capabilities)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => `<li>${key.replace(/_/g, ' ').replace(/\b\w/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))}</li>`)
        .join('')}
    </ul>
  </div>

  <div class="section">
    <h3>🔗 Endpoints</h3>
    <div class="endpoint">
      <strong>UCP Profile:</strong><br>
      <code>/.well-known/ucp-profile.json</code>
      <code>/ucp/profile</code>
    </div>
    <div class="endpoint">
      <strong>Health:</strong><br>
      <code>/health</code>
    </div>
  </div>

  <p style="color: #666; font-size: 14px; margin-top: 24px;">
    📖 Learn more about UCP at <a href="https://ucp.dev/" target="_blank" style="color: #4285f4;">ucp.dev</a>
  </p>
</body>
</html>
    `
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  }

  // ============================================================
  // BaseAdapter Implementation
  // ============================================================

  async transform(input: { message: string }): Promise<{ content: string; format: string }> {
    // For UCP, we transform into profile format
    const profile = await this.generateProfile()
    return {
      content: JSON.stringify(profile, null, 2),
      format: 'json'
    }
  }

  async send(output: { content: string }): Promise<{ success: boolean; content?: string; error?: string }> {
    // For UCP, "sending" means serving the profile
    return {
      success: true,
      content: output.content
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    await this.dispose()
  }
}
