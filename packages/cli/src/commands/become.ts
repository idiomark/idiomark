import { chat, respond } from './chat'
import type { ChatOptions } from '../types'

export async function become(file: string, options: ChatOptions & { message?: string }): Promise<void> {
  if (options.message) {
    // Single message mode
    await respond({ file, message: options.message, ...options })
  } else {
    // Interactive chat mode
    await chat({ file, ...options })
  }
}
