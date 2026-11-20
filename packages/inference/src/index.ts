/**
 * Idiomark Inference Package
 *
 * Apply personality to AI responses - the core Idiomark product
 */

export { InferenceEngine } from './inference'
export type { InferenceOptions, InferenceResponse, ResponseMode } from './types'

export { createPrompt, applyPersonality } from './prompts'
