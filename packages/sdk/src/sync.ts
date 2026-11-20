/**
 * Idiomark Sync Manager
 *
 * Handles real-time synchronization via WebSocket
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  SyncState,
  SyncResult,
  SyncEvent,
  SyncEventType
} from './types'

/**
 * Sync manager configuration
 */
export interface SyncConfig {
  serverURL: string
  token: string
  reconnect: boolean
  heartbeatInterval: number
  queueOfflineEvents: boolean
  timeout: number
  debug: boolean
}

/**
 * WebSocket message types
 */
type WebSocketMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'subscribe'; channel: string }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'presence'; status: string }
  | { type: 'file_created'; file: IdiomarkFile }
  | { type: 'file_updated'; file: IdiomarkFile }
  | { type: 'file_deleted'; fileId: string }

/**
 * Sync manager for Idiomark files
 */
export class Sync {
  private config: SyncConfig
  private ws: WebSocket | null = null
  private state: SyncState = {
    connected: false,
    reconnecting: false,
    pendingEvents: 0
  }
  private stateListeners: Set<(state: SyncState) => void> = new Set()
  private eventListeners: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map()
  private offlineQueue: WebSocketMessage[] = []
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectionId: string | null = null
  private isDisposed = false

  constructor(config: SyncConfig) {
    this.config = config
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state }
  }

  /**
   * Connect to sync server
   */
  async connect(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Sync manager has been disposed')
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.debug('Already connected')
      return
    }

    this.debug(`Connecting to ${this.config.serverURL}`)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverURL)

        this.ws.onopen = () => {
          this.debug('WebSocket connected')
          this.updateState({ connected: true, reconnecting: false })
          this.startHeartbeat()
          this.sendQueuedEvents()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          this.debug(`WebSocket error: ${error}`)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          this.debug('WebSocket closed')
          this.stopHeartbeat()
          this.updateState({ connected: false })
          this.connectionId = null

          // Auto-reconnect if enabled
          if (this.config.reconnect && !this.isDisposed) {
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from sync server
   */
  async disconnect(): Promise<void> {
    this.isDisposed = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.debug('Disconnecting WebSocket')
      this.ws.close()
      this.ws = null
    }

    this.updateState({ connected: false, reconnecting: false })
  }

  /**
   * Subscribe to a file for updates
   */
  subscribe(fileId: string): void {
    this.send({ type: 'subscribe', channel: `idiomark:${fileId}` })
    this.debug(`Subscribed to file: ${fileId}`)
  }

  /**
   * Unsubscribe from a file
   */
  unsubscribe(fileId: string): void {
    this.send({ type: 'unsubscribe', channel: `idiomark:${fileId}` })
    this.debug(`Unsubscribed from file: ${fileId}`)
  }

  /**
   * Update presence status
   */
  updatePresence(status: 'online' | 'away' | 'offline'): void {
    this.send({ type: 'presence', status })
    this.debug(`Presence updated: ${status}`)
  }

  /**
   * Sync a file (trigger update)
   */
  sync(file: IdiomarkFile): void {
    const message: WebSocketMessage = {
      type: 'file_updated',
      file
    }

    this.send(message)
    this.debug(`Syncing file: ${file.id}`)
  }

  /**
   * Listen to state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateListeners.add(callback)
    callback(this.getState())

    return () => {
      this.stateListeners.delete(callback)
    }
  }

  /**
   * Listen to sync events
   */
  on(eventType: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }

    this.eventListeners.get(eventType)!.add(callback)

    return () => {
      this.eventListeners.get(eventType)?.delete(callback)
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.connected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get number of pending events
   */
  getPendingEventsCount(): number {
    return this.state.pendingEvents
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage

      switch (message.type) {
        case 'pong':
          this.debug('Received pong')
          break

        case 'file_created':
          this.emit('file_created', {
            type: 'file_created',
            timestamp: new Date(),
            file: message.file
          })
          break

        case 'file_updated':
          this.emit('file_updated', {
            type: 'file_updated',
            timestamp: new Date(),
            file: message.file
          })
          break

        case 'file_deleted':
          this.emit('file_deleted', {
            type: 'file_deleted',
            timestamp: new Date(),
            data: { fileId: message.fileId }
          })
          break

        default:
          this.debug(`Unknown message type: ${(message as any).type}`)
      }
    } catch (error) {
      this.debug(`Failed to parse message: ${error}`)
    }
  }

  /**
   * Send a message via WebSocket
   */
  private send(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      if (this.config.queueOfflineEvents) {
        this.offlineQueue.push(message)
        this.updateState({
          pendingEvents: this.state.pendingEvents + 1
        })
        this.debug('Message queued (offline)')
      }
      return
    }

    try {
      this.ws!.send(JSON.stringify(message))
    } catch (error) {
      this.debug(`Failed to send message: ${error}`)
    }
  }

  /**
   * Send queued offline events
   */
  private sendQueuedEvents(): void {
    if (this.offlineQueue.length === 0) return

    this.debug(`Sending ${this.offlineQueue.length} queued events`)

    for (const message of this.offlineQueue) {
      try {
        this.ws!.send(JSON.stringify(message))
      } catch (error) {
        this.debug(`Failed to send queued message: ${error}`)
      }
    }

    this.offlineQueue = []
    this.updateState({ pendingEvents: 0 })
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' })
      }
    }, this.config.heartbeatInterval)

    this.debug(`Heartbeat started (${this.config.heartbeatInterval}ms)`)
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
      this.debug('Heartbeat stopped')
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.updateState({ reconnecting: true })

    const delay = Math.min(1000 * Math.pow(2, this.state.pendingEvents), 30000)

    this.debug(`Scheduling reconnect in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch((error) => {
        this.debug(`Reconnect failed: ${error}`)
        this.scheduleReconnect()
      })
    }, delay)
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyStateListeners()
  }

  /**
   * Notify state listeners
   */
  private notifyStateListeners(): void {
    for (const listener of this.stateListeners) {
      try {
        listener(this.getState())
      } catch (error) {
        this.debug(`State listener error: ${error}`)
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(type: SyncEventType, event: SyncEvent): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          this.debug(`Event listener error: ${error}`)
        }
      }
    }
  }

  /**
   * Debug logging
   */
  private debug(message: string): void {
    if (this.config.debug) {
      console.log(`[Idiomark Sync] ${message}`)
    }
  }
}
