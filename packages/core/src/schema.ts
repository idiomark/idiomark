/**
 * Idiomark Protocol Schema
 *
 * Zod schema for validating Idiomark files
 */

import { z } from 'zod'

// Voice schema
const VoiceSchema = z.object({
  tone: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    confidence: z.number().min(0).max(1)
  }),
  formality: z.number().min(0).max(1),
  humor: z.number().min(0).max(1),
  sarcasm: z.number().min(0).max(1),
  enthusiasm: z.number().min(0).max(1),
  directness: z.number().min(0).max(1)
})

// Patterns schema
const EmojiUsageSchema = z.object({
  frequency: z.enum(['none', 'low', 'medium', 'high']),
  top_emojis: z.array(z.string()),
  position: z.enum(['start', 'end', 'mixed']).optional()
})

const PunctuationSchema = z.object({
  exclamation_frequency: z.number().min(0).max(1),
  question_frequency: z.number().min(0).max(1),
  ellipsis_usage: z.enum(['none', 'low', 'medium', 'high'])
})

const PatternsSchema = z.object({
  sentence_length: z.object({
    mean: z.number(),
    stddev: z.number()
  }),
  paragraph_length: z.object({
    mean: z.number(),
    stddev: z.number()
  }).optional(),
  emoji_usage: EmojiUsageSchema,
  punctuation: PunctuationSchema,
  capitalization: z.object({
    all_caps_frequency: z.number().min(0).max(1),
    random_caps: z.boolean()
  }).optional()
})

// Domain schema
const DomainSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).optional()
})

// Value schema
const ValueSchema = z.object({
  name: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1)
})

// Knowledge schema
const KnowledgeSchema = z.object({
  frequent_terms: z.array(z.string()),
  mentions: z.object({
    people: z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    organizations: z.array(z.string()).optional()
  }),
  topics: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()).optional()
  })
})

// Personality schema
const PersonalitySchema = z.object({
  voice: VoiceSchema,
  patterns: PatternsSchema,
  domains: z.array(DomainSchema),
  values: z.array(ValueSchema),
  knowledge: KnowledgeSchema
})

// Entity schema
const EntitySchema = z.object({
  name: z.string().optional(),
  type: z.enum(['human', 'brand', 'bot', 'fictional']),
  sources: z.array(z.string())
})

// Extraction schema
const ExtractionSchema = z.object({
  date: z.string(),
  sample_size: z.number().positive(),
  timeframe: z.object({
    from: z.string(),
    to: z.string()
  })
})

// Metadata schema
const MetadataSchema = z.object({
  entity: EntitySchema,
  extraction: ExtractionSchema,
  validator: z.string().optional()
})

// Main Idiomark file schema
export const schema = z.object({
  idiomark: z.string().regex(/^\d+\.\d+\.\d+$/),
  id: z.string().startsWith('idiomark_'),
  created: z.string(),
  updated: z.string(),
  metadata: MetadataSchema,
  personality: PersonalitySchema,
  signature: z.string().optional()
})

// Type is already exported from types.ts to avoid duplication
// Use: import type { IdiomarkFile } from './types'
// The schema validates the IdiomarkFile structure
