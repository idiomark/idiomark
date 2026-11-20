/**
 * VRChat Adapter
 *
 * Applies Idiomark personality to VRChat interactions.
 * Features:
 * - Player chat responses with personality
 * - World chat and interaction handling
 * - Avatar customization based on personality
 * - Friend request handling with personality
 *
 * References:
 * - https://developers.vrchat.com/
 * - https://github.com/vrchatapi
 */

import type { GamingAdapterOptions } from './base'

export interface VRChatAdapterOptions extends GamingAdapterOptions {
  config: {
    /** VRChat API endpoint */
    apiKey?: string
    /** VRChat WebSocket endpoint */
    websocketUrl?: string
  }
}

export class VRChatAdapter extends GameAdapter {
  private client: any = null
  private connected = false
  private websocket: WebSocket | null = null
  private vrchatApiKey: string | null = null
  private currentWorldId: string | null = null
  private currentInstanceId: string | null = null

  constructor(options: VRChatAdapterOptions) {
    super({ name: 'vrchat', ...options })
    const { apiKey, websocketUrl } = options.config
    this.vrchatApiKey = apiKey || process.env.VRCHAT_API_KEY
    this.websocketUrl = websocketUrl || process.env.VRCHAT_WEBSOCKET || 'wss://vrchat.com/websocket'
  }

  // ============================================================
  // Connection Methods
  // ============================================================

  /**
   * Connect to VRChat WebSocket
   */
  async connect(): Promise<void> {
    if (!this.vrchatApiKey) {
      throw new Error('VRChat API key is required. Get one from https://vrchat.com/')
    }

    console.error(`[VRChat] Connecting to ${this.websocketUrl}...`)

    this.websocket = new WebSocket(this.websocketUrl, {
      headers: {
        'Authorization': `Bearer ${this.vrchatApiKey}`,
        'User-Agent': 'Idiomark-Projection/1.0'
      }
    })

    this.websocket.on('open', () => {
      this.connected = true
      console.error('[VRChat] Connected')
      this.emitter.emit('connected', { url: this.websocketUrl })

      // Authenticate
      this.sendWebSocketMessage({
        cmd: 'auth',
        args: {
          apiKey: this.vrchatApiKey
        }
      })
    })

    this.websocket.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data)
        await this.handleMessage(message)
      } catch (error) {
        console.error('[VRChat] Failed to parse message:', error)
      }
    })

    this.websocket.on('close', () => {
      this.connected = false
      console.error('[VRChat] Disconnected')
      this.emitter.emit('disconnected')
    })

    this.websocket.on('error', (error: Error) => {
      console.error('[VRChat] WebSocket error:', error)
    })
  }

  /**
   * Disconnect from VRChat
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.connected = false
  }

  // ============================================================
  // Send Methods
  // ============================================================

  /**
   * Send message to VRChat
   */
  async sendToGame(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to VRChat')
    }

    const response = await this.applyPersonalityToChat(message)

    // Send as VRChat message
    this.send({
      cmd: 'message',
      message: response
    })
  }

  /**
   * Execute VRChat command
   */
  async executeCommand(command: string, args: Record<string, unknown> = []): Promise<void> {
    const fullCommand = this.formatCommand(command, args)
    await this.sendToGame(fullCommand)
  }

  /**
   * Format command for VRChat
   */
  private formatCommand(command: string, args: Record<string, unknown>): string {
    let result = `/${command}`

    for (const [key, value] of Object.entries(args)) {
      result += ` ${key}=${encodeURIComponent(String(value))}`
    }

    return result
  }

  /**
   * Send VRChat WebSocket message
   */
  private sendWebSocketMessage(data: Record<string, unknown>): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data))
    }
  }

  /**
   * Handle incoming VRChat message
   */
  private async handleMessage(message: Record<string, unknown>): Promise<void> {
    const { cmd } = message

    switch (cmd) {
      case 'peer-update':
        // Player joined/updated
        await this.handlePeerUpdate(message as PeerUpdate)
        break

      case 'friend-request':
        // Friend request received
        await this.handleFriendRequest(message as FriendRequest)
        break

      case 'friend-response':
        // Friend request response
        await this.handleFriendResponse(message as FriendResponse)
        break

      case 'world-instance-update':
        // World information update
        await this.handleWorldUpdate(message as WorldUpdate)
        break

      case 'user-enter':
        // User entered world
        await this.handleUserEnter(message as UserEnter)
        break

      case 'user-leave':
        // User left world
        await this.handleUserLeave(message as UserLeave)
        break

      case 'player-join':
        // Player joined instance
        await this.handlePlayerJoin(message as PlayerJoin)
        break

      case 'player-left':
        // Player left instance
        await this.handlePlayerLeft(message as PlayerLeft)
        break

      case 'chat-message':
        // Chat message in world
        await this.handleChatMessage(message as ChatMessage)
        break

      default:
        console.error('[VRChat] Unknown command:', cmd)
    }
  }

  /**
   * Handle peer connection update
   */
  private async handlePeerUpdate(data: PeerUpdate): Promise<void> {
    const { userId, displayName, location, instanceId } = data.data

    // Update tracking
    if (instanceId) {
      this.currentInstanceId = instanceId
    }

    console.error(`[VRChat] Peer update: ${displayName} (${userId})`)
  }

  /**
   * Handle friend request
   */
  private async handleFriendRequest(data: FriendRequest): Promise<void> {
    const { userId, displayName, type } = data.data

    const response = await this.applyPersonalityToChat(
      type === 'both' ? 'Friend request from both' : 'Incoming friend request'
    )

    this.send({
      cmd: 'friend-response',
      requestId: data.requestId,
      response: response ? 'yes' : 'no'
    })
  }

  /**
   * Handle friend response
   */
  private async handleFriendResponse(data: FriendResponse): Promise<void> {
    const { userId, displayName, response } = data.data

    if (response === 'yes') {
      console.error(`[VRChat] Friend request accepted: ${displayName} (${userId})`)
      // Would send friend request
    } else {
      console.error(`[VRChat] Friend request declined: ${displayName} (${userId})`)
    }
  }

  /**
   * Handle world update
   */
  private async handleWorldUpdate(data: WorldUpdate): Promise<void> {
    const { worldId, name, description } = data.data

    console.error(`[VRChat] World update: ${name} (${worldId})`)

    if (description && this.currentWorldId !== worldId) {
      this.currentWorldId = worldId
      // Could trigger world-specific personality events
    }
  }

  /**
   * Handle user entering world
   */
  private async handleUserEnter(data: UserEnter): Promise<void> {
    const { userId, displayName, username, instanceId } = data.data

    const greeting = await this.generateGreeting(displayName)
    await this.sendToGame(greeting)

    console.error(`[VRChat] User entered: ${displayName} (${username})`)
  }

  /**
   * Handle user leaving world
   */
  private async handleUserLeave(data: UserLeave): Promise<void> {
    const { userId, displayName } = data.data

    const farewell = await this.generateFarewell(displayName)
    await this.sendToGame(farewell)

    console.error(`[VRChat] User left: ${displayName}`)
  }

  /**
   * Handle player joining instance
   */
  private async handlePlayerJoin(data: PlayerJoin): Promise<void> {
    const { userId, displayName } = data.data

    const greeting = await this.generateGreeting(displayName)
    await this.sendToGame(greeting)

    console.error(`[VRChat] Player joined: ${displayName} (${userId})`)
  }

  /**
   * Handle player leaving instance
   */
  private async handlePlayerLeft(data: PlayerLeft): Promise<void> {
    const { userId, displayName } = data.data

    const farewell = await this.generateFarewell(displayName)
    await this.sendToGame(farewell)

    console.error(`[VRChat] Player left: ${displayName} (${userId})`)
  }

  /**
   * Handle chat message in world
   */
  private async handleChatMessage(data: ChatMessage): Promise<void> {
    const { userId, displayName, message } = data.data

    // Apply personality to message and respond
    const response = await this.applyPersonalityToChat(
      `${displayName}: ${message}`
    )

    this.send({
      cmd: 'message',
      message: response
    })

    console.error(`[VRChat] Chat: ${displayName}: ${response}`)
  }

  /**
   * Generate greeting based on personality
   */
  private async generateGreeting(playerName: string): Promise<string> {
    const persona = this.personality?.personality
    const voice = persona?.voice

    const formality = voice?.formality || 0.5

    if (formality > 0.6) {
      return `Welcome, ${playerName}. Good to see you.`
    } else if (voice?.tone?.primary === 'enthusiastic') {
      return `Hey ${playerName}!! Awesome to see you in VRChat!`
    } else if (voice?.tone?.primary === 'humorous') {
      const greetings = [
        `Welcome ${playerName}! Your avatar looks amazing today.`,
        `Look who it is! ${playerName} has arrived!`,
        `${playerName} joins the chat! 🎉`
      ]
      return greetings[Math.floor(Math.random() * greetings.length)]
    }

    return `Welcome ${playerName}!`
  }

  /**
   * Generate farewell based on personality
   */
  private async generateFarewell(playerName: string): Promise<string> {
    const persona = this.personality?.personality
    const voice = persona?.voice

    const formality = voice?.formality || 0.5

    if (formality > 0.6) {
      return `Goodbye, ${playerName}. It was nice to see you.`
    } else if (voice?.tone?.primary === 'enthusiastic') {
      return `See you next time, ${playerName}! Come back soon! 🎮`
    } else if (voice?.tone?.primary === 'humorous') {
      const farewells = [
        `${playerName} has left the building. The NPCs miss them already.`,
        `Catch you later, ${playerName}! Don't be a stranger.`
        `Bye ${playerName}! The world waits for your return.`
      ]
      return farewells[Math.floor(Math.random() * farewells.length)]
    }

    return `Bye ${playerName}!`
  }

  // ============================================================
  // BaseAdapter Implementation
  // ============================================================

  /**
   * Transform input for VRChat
   */
  async transform(input: { message: string }): Promise<{ content: string; format: string }> {
    const response = await this.applyPersonalityToChat(input.message)
    return {
      content: response,
      format: 'text'
    }
  }

  /**
   * Send output to VRChat
   */
  async send(output: { content: string }): Promise<{ success: boolean; content?: string; error?: string }> {
    await this.sendToGame(output.content)
    return {
      success: true,
      content: output.content
    }
  }

  /**
   * Start VRChat adapter
   */
  async start(): Promise<void> {
    await this.connect()

    console.error('[VRChat] Adapter running. Press Ctrl+C to stop.')

    return new Promise(() => {
      // Keep running
    })
  }

  /**
   * Stop VRChat adapter
   */
  async stop(): Promise<void> {
    await this.disconnect()
  }
}

// ============================================================
// Type Definitions
// ============================================================

interface PeerUpdate {
  cmd: string
  data: {
    userId: string
    displayName: string
    location: { instanceId: string; worldName: string }
    instanceId: string
  }
}

interface FriendRequest {
  cmd: string
  requestId: string
  data: {
    userId: string
    displayName: string
    type: 'incoming' | 'outgoing'
  }
}

interface FriendResponse {
  cmd: string
  requestId: string
  response: 'yes' | 'no'
  data: {
    userId: string
    displayName: string
    response: 'yes' | 'no'
  }
}

interface WorldUpdate {
  cmd: string
  data: {
    worldId: string
    name: string
    description: string
  }
}

interface UserEnter {
  cmd: string
  data: {
    userId: string
    displayName: string
    username: string
    instanceId: string
  }
}

interface UserLeave {
  cmd: string
  data: {
    userId: string
    displayName: string
  }
}

interface PlayerJoin {
  cmd: string
  data: {
    userId: string
    displayName: string
  }
}

interface PlayerLeft {
  cmd: string
  data: {
    userId: string
    displayName: string
  }
}

interface ChatMessage {
  cmd: string
  data: {
    userId: string
    displayName: string
    message: string
  }
}
