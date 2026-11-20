/**
 * Gaming & Virtual World Adapters
 *
 * Adapters for applying Idiomark personalities to gaming platforms,
 * virtual worlds, and metaverse environments
 */

// Base gaming adapter
export { GameAdapter, type GameServerConfig, type GamingAdapterOptions } from './base'

// Minecraft adapter
export { MinecraftAdapter, type MinecraftAdapterOptions } from './minecraft'

// Roblox adapter
export { RobloxAdapter } from './roblox'

// VR Chat adapter
export { VRChatAdapter } from './vrchat'

// Fortnite adapter
export { FortniteAdapter, type FortniteAdapterOptions } from './fortnite'

// Future adapters to implement:
// - Generic game server adapter (with RCON support)
// - Steam community integration
// - Discord/Telegram/WhatsApp game integration
