/**
 * Personality Prompt Builder
 *
 * Converts Idiomark personality data into effective LLM system prompts
 */

import type { Personality, Voice, Patterns, Domain, Value, Knowledge } from './types'
import type { PersonalityV2, BigFiveTraits, LinguisticMarkers, CommunicationStyle, CognitivePatterns, EmotionalPatterns, SocialDynamics } from './types-v2'

/**
 * Build a comprehensive system prompt from personality data
 */
export function buildSystemPrompt(personality: Personality, context?: {
  userName?: string
  task?: string
  additionalInstructions?: string
}): string {
  const sections: string[] = []

  // Base instruction
  sections.push('# Persona Instructions')
  sections.push('You are an AI assistant that communicates with a specific personality. ')
  sections.push('Your responses must reflect the personality traits described below.\n')

  // Voice characteristics
  sections.push(buildVoiceSection(personality.voice))

  // Writing patterns
  sections.push(buildPatternsSection(personality.patterns))

  // Domain knowledge
  if (personality.domains.length > 0) {
    sections.push(buildDomainsSection(personality.domains))
  }

  // Values and beliefs
  if (personality.values.length > 0) {
    sections.push(buildValuesSection(personality.values))
  }

  // Knowledge context
  sections.push(buildKnowledgeSection(personality.knowledge))

  // Context-specific instructions
  if (context) {
    sections.push(buildContextSection(context))
  }

  return sections.join('\n')
}

/**
 * Build voice characteristics section
 */
function buildVoiceSection(voice: Voice): string {
  const lines: string[] = []

  lines.push('## Voice & Tone')
  lines.push(`**Primary Tone:** ${voice.tone.primary}`)
  if (voice.tone.secondary) {
    lines.push(`**Secondary Tone:** ${voice.tone.secondary}`)
  }
  lines.push(`**Confidence:** ${Math.round(voice.tone.confidence * 100)}%`)

  lines.push('\n**Voice Attributes (0-1 scale):**')
  lines.push(`- Formality: ${describeScale(voice.formality, ['very casual', 'casual', 'moderate', 'formal', 'very formal'])}`)
  lines.push(`- Humor: ${describeScale(voice.humor, ['very serious', 'serious', 'balanced', 'humorous', 'very humorous'])}`)
  lines.push(`- Sarcasm: ${describeScale(voice.sarcasm, ['genuine', 'mostly genuine', 'occasional sarcasm', 'sarcastic', 'heavily sarcastic'])}`)
  lines.push(`- Enthusiasm: ${describeScale(voice.enthusiasm, ['reserved', 'calm', 'moderate', 'enthusiastic', 'very enthusiastic'])}`)
  lines.push(`- Directness: ${describeScale(voice.directness, ['very indirect', 'diplomatic', 'balanced', 'direct', 'very direct'])}`)

  return lines.join('\n')
}

/**
 * Build writing patterns section
 */
function buildPatternsSection(patterns: Patterns): string {
  const lines: string[] = []

  lines.push('## Writing Patterns')
  lines.push(`**Sentence Length:** ${patterns.sentence_length.mean.toFixed(1)} words avg (±${patterns.sentence_length.stddev.toFixed(1)})`)
  if (patterns.paragraph_length) {
    lines.push(`**Paragraph Length:** ${patterns.paragraph_length.mean.toFixed(1)} sentences avg`)
  }

  // Emoji usage
  const emojiGuidance: Record<string, string> = {
    none: 'Never use emojis',
    low: 'Use emojis sparingly, only for emphasis',
    medium: 'Use emojis moderately to enhance expression',
    high: 'Use emojis frequently to match the conversational tone'
  }
  lines.push(`\n**Emoji Usage:** ${emojiGuidance[patterns.emoji_usage.frequency]}`)
  if (patterns.emoji_usage.top_emojis.length > 0) {
    lines.push(`Preferred emojis: ${patterns.emoji_usage.top_emojis.join(' ')}`)
  }
  if (patterns.emoji_usage.position) {
    lines.push(`Position: ${patterns.emoji_usage.position} of messages`)
  }

  // Punctuation
  lines.push(`\n**Punctuation Style:**`)
  lines.push(`- Exclamation marks: ${describeFrequency(patterns.punctuation.exclamation_frequency)}`)
  lines.push(`- Question marks: ${describeFrequency(patterns.punctuation.question_frequency)}`)
  lines.push(`- Ellipsis: ${patterns.punctuation.ellipsis_usage}`)

  // Capitalization
  if (patterns.capitalization) {
    lines.push(`\n**Capitalization:**`)
    if (patterns.capitalization.random_caps) {
      lines.push('- Occasionally uses random capitalization for emphasis')
    } else {
      lines.push('- Normal capitalization, ALL CAPS only for strong emphasis')
    }
    lines.push(`- ALL CAPS frequency: ${describeFrequency(patterns.capitalization.all_caps_frequency)}`)
  }

  return lines.join('\n')
}

/**
 * Build domain knowledge section
 */
function buildDomainsSection(domains: Domain[]): string {
  const lines: string[] = ['## Domain Expertise']

  const sortedDomains = [...domains].sort((a, b) => b.confidence - a.confidence)

  for (const domain of sortedDomains) {
    const confidenceLevel = domain.confidence > 0.8 ? 'expert' :
                          domain.confidence > 0.6 ? 'proficient' :
                          domain.confidence > 0.4 ? 'familiar' : 'basic knowledge'
    lines.push(`- **${domain.name}**: ${confidenceLevel} (${Math.round(domain.confidence * 100)}%)`)
    if (domain.evidence && domain.evidence.length > 0) {
      lines.push(`  _Context: ${domain.evidence.slice(0, 2).join(', ')}_`)
    }
  }

  return lines.join('\n')
}

/**
 * Build values section
 */
function buildValuesSection(values: Value[]): string {
  const lines: string[] = ['## Values & Perspectives']

  const positiveValues = values.filter(v => v.sentiment === 'positive')
  const negativeValues = values.filter(v => v.sentiment === 'negative')

  if (positiveValues.length > 0) {
    lines.push('\n**Values aligned with:**')
    for (const value of positiveValues.sort((a, b) => b.confidence - a.confidence)) {
      lines.push(`- ${value.name} (${Math.round(value.confidence * 100)}%)`)
    }
  }

  if (negativeValues.length > 0) {
    lines.push('\n**Critical of:**')
    for (const value of negativeValues.sort((a, b) => b.confidence - a.confidence)) {
      lines.push(`- ${value.name} (${Math.round(value.confidence * 100)}%)`)
    }
  }

  return lines.join('\n')
}

/**
 * Build knowledge section
 */
function buildKnowledgeSection(knowledge: Knowledge): string {
  const lines: string[] = ['## Knowledge Base']

  // Frequent terms to incorporate naturally
  if (knowledge.frequent_terms.length > 0) {
    lines.push(`\n**Vocabulary:** Incorporate these terms naturally: ${knowledge.frequent_terms.slice(0, 15).join(', ')}`)
  }

  // Known entities
  const mentions: string[] = []
  if (knowledge.mentions.people?.length) {
    mentions.push(`people: ${knowledge.mentions.people.join(', ')}`)
  }
  if (knowledge.mentions.projects?.length) {
    mentions.push(`projects: ${knowledge.mentions.projects.join(', ')}`)
  }
  if (knowledge.mentions.organizations?.length) {
    mentions.push(`organizations: ${knowledge.mentions.organizations.join(', ')}`)
  }
  if (mentions.length > 0) {
    lines.push('\n**Familiar with:**')
    lines.push('- ' + mentions.join('\n- '))
  }

  // Topic areas
  if (knowledge.topics.primary.length > 0) {
    lines.push(`\n**Primary focus areas:** ${knowledge.topics.primary.join(', ')}`)
  }
  if (knowledge.topics.secondary && knowledge.topics.secondary.length > 0) {
    lines.push(`**Secondary interests:** ${knowledge.topics.secondary.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Build context section for specific tasks
 */
function buildContextSection(context: {
  userName?: string
  task?: string
  additionalInstructions?: string
}): string {
  const lines: string[] = ['## Context']

  if (context.userName) {
    lines.push(`You are conversing with ${context.userName}.`)
  }

  if (context.task) {
    lines.push(`\n**Current Task:** ${context.task}`)
  }

  if (context.additionalInstructions) {
    lines.push(`\n**Additional Instructions:**`)
    lines.push(context.additionalInstructions)
  }

  return lines.join('\n')
}

/**
 * Describe a scale value (0-1) in human terms
 */
function describeScale(value: number, labels: string[]): string {
  const index = Math.min(Math.floor(value * labels.length), labels.length - 1)
  return labels[index]
}

/**
 * Describe a frequency value (0-1)
 */
function describeFrequency(value: number): string {
  if (value < 0.1) return 'rarely'
  if (value < 0.3) return 'occasionally'
  if (value < 0.6) return 'moderately'
  if (value < 0.8) return 'frequently'
  return 'very frequently'
}

/**
 * Build a chat history prompt for maintaining conversation context
 */
export function buildChatHistoryPrompt(history: Array<{
  role: 'user' | 'assistant' | 'system'
  content: string
}>): string {
  if (history.length === 0) return ''

  const lines: string[] = ['## Conversation History\n']

  for (const msg of history) {
    const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'You' : 'System'
    lines.push(`**${role}:** ${msg.content}`)
  }

  lines.push('\n**Your response:**')
  return lines.join('\n')
}

/**
 * Build a prompt for a specific response task
 */
export function buildResponsePrompt(
  personality: Personality,
  userMessage: string,
  options: {
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    userName?: string
    task?: string
  } = {}
): string {
  const parts: string[] = []

  // System prompt with personality
  parts.push(buildSystemPrompt(personality, {
    userName: options.userName,
    task: options.task || 'Respond to the user message'
  }))

  // Conversation history
  if (options.history && options.history.length > 0) {
    parts.push('\n' + buildChatHistoryPrompt(options.history))
  }

  // Current message
  parts.push(`\n## Current Message\n**User:** ${userMessage}`)

  return parts.join('\n')
}

// ============================================================================
// V2 BETA PROMPT BUILDING (Experimental personality dimensions)
// ============================================================================

/**
 * Build a comprehensive system prompt from V2 personality data
 * Includes all experimental dimensions from psycholinguistics research
 */
export function buildSystemPromptV2(personality: PersonalityV2, context?: {
  userName?: string
  task?: string
  additionalInstructions?: string
}): string {
  const sections: string[] = []

  // Base instruction
  sections.push('# Persona Instructions (V2 Enhanced)')
  sections.push('You are an AI assistant that communicates with a specific personality. ')
  sections.push('Your responses must reflect ALL personality traits described below—including both core and experimental dimensions.\n')

  // V1 Core sections (backward compatible)
  sections.push(buildVoiceSection(personality.voice))
  sections.push(buildPatternsSection(personality.patterns))
  if (personality.domains.length > 0) {
    sections.push(buildDomainsSection(personality.domains))
  }
  if (personality.values.length > 0) {
    sections.push(buildValuesSection(personality.values))
  }
  sections.push(buildKnowledgeSection(personality.knowledge))

  // V2 Experimental sections
  if (personality.big_five) {
    sections.push(buildBigFiveSection(personality.big_five))
  }
  if (personality.linguistic_markers) {
    sections.push(buildLinguisticMarkersSection(personality.linguistic_markers))
  }
  if (personality.communication_style) {
    sections.push(buildCommunicationStyleSection(personality.communication_style))
  }
  if (personality.cognitive_patterns) {
    sections.push(buildCognitivePatternsSection(personality.cognitive_patterns))
  }
  if (personality.emotional_patterns) {
    sections.push(buildEmotionalPatternsSection(personality.emotional_patterns))
  }
  if (personality.social_dynamics) {
    sections.push(buildSocialDynamicsSection(personality.social_dynamics))
  }

  // Context-specific instructions
  if (context) {
    sections.push(buildContextSection(context))
  }

  return sections.join('\n')
}

/**
 * Build Big Five personality section (OCEAN model)
 */
function buildBigFiveSection(big5: BigFiveTraits): string {
  const lines: string[] = []

  lines.push('## Big Five Personality Traits (OCEAN)')
  lines.push(`**Openness:** ${describeBigFiveScore(big5.openness, 'curiosity/adventure')}`)
  lines.push(`**Conscientiousness:** ${describeBigFiveScore(big5.conscientiousness, 'organization/discipline')}`)
  lines.push(`**Extraversion:** ${describeBigFiveScore(big5.extraversion, 'social_energy')}`)
  lines.push(`**Agreeableness:** ${describeBigFiveScore(big5.agreeableness, 'cooperation/empathy')}`)
  lines.push(`**Emotional Stability:** ${describeBigFiveScore(1 - big5.neuroticism, 'calmness')} (inverse of neuroticism)`)
  lines.push(`**Confidence:** ${Math.round(big5.confidence * 100)}%`)

  return lines.join('\n')
}

function describeBigFiveScore(score: number, trait: string): string {
  const value = Math.round(score * 100)
  if (value < 20) return `very low (${value}%) - ${trait}`
  if (value < 40) return `low (${value}%) - ${trait}`
  if (value < 60) return `moderate (${value}%) - ${trait}`
  if (value < 80) return `high (${value}%) - ${trait}`
  return `very high (${value}%) - ${trait}`
}

/**
 * Build linguistic markers section
 */
function buildLinguisticMarkersSection(markers: LinguisticMarkers): string {
  const lines: string[] = ['## Linguistic Markers']

  if (markers.pronouns) {
    lines.push('\n**Pronoun Usage:**')
    lines.push(`- First person singular ("I"): ${Math.round(markers.pronouns.first_person_singular * 100)}%`)
    lines.push(`- First person plural ("we"): ${Math.round(markers.pronouns.first_person_plural * 100)}%`)
    lines.push(`- Second person ("you"): ${Math.round(markers.pronouns.second_person * 100)}%`)
  }

  if (markers.hedging) {
    lines.push(`\n**Hedging Language:** ${markers.hedging.frequency}`)
    if (markers.hedging.common_hedges.length > 0) {
      lines.push(`- Common hedges: ${markers.hedging.common_hedges.join(', ')}`)
    }
  }

  if (markers.absolutist_language) {
    lines.push(`\n**Absolutist Language:** ${describeFrequency(markers.absolutist_language.frequency)}`)
    if (markers.absolutist_language.common_absolutes.length > 0) {
      lines.push(`- Common absolutes: ${markers.absolutist_language.common_absolutes.join(', ')}`)
    }
  }

  if (markers.concreteness) {
    const orientation = markers.concreteness.score < -0.3 ? 'very concrete' :
                       markers.concreteness.score < 0.3 ? 'balanced' : 'very abstract'
    lines.push(`\n**Thinking Style:** ${orientation} (${markers.concreteness.score.toFixed(2)})`)
  }

  return lines.join('\n')
}

/**
 * Build communication style section
 */
function buildCommunicationStyleSection(style: CommunicationStyle): string {
  const lines: string[] = ['## Communication Style']

  lines.push(`**Question Frequency:** ${describeFrequency(style.question_frequency)}`)
  lines.push(`**Self-Disclosure:** ${describeScale(style.self_disclosure, ['very private', 'private', 'moderate', 'open', 'very open'])}`)
  lines.push(`**Task vs Social Orientation:** ${style.task_vs_social > 0.2 ? 'Social-focused' : style.task_vs_social < -0.2 ? 'Task-focused' : 'Balanced'}`)
  lines.push(`**Conflict Approach:** ${style.conflict_approach}`)
  lines.push(`**Explanation Style:** ${style.explanation_style}`)

  if (style.response_pattern) {
    lines.push('\n**Response Patterns:**')
    if (style.response_pattern.average_delay_seconds) {
      lines.push(`- Average delay: ${style.response_pattern.average_delay_seconds}s`)
    }
    if (style.response_pattern.burst_frequency !== undefined) {
      lines.push(`- Burst messaging: ${describeFrequency(style.response_pattern.burst_frequency)}`)
    }
  }

  return lines.join('\n')
}

/**
 * Build cognitive patterns section
 */
function buildCognitivePatternsSection(cognitive: CognitivePatterns): string {
  const lines: string[] = ['## Cognitive Patterns']

  lines.push(`**Thinking Style:** ${cognitive.thinking_style}`)
  lines.push(`**Decision Making:** ${cognitive.decision_making}`)
  lines.push(`**Information Processing:** ${cognitive.information_processing}`)
  lines.push(`**Learning Preference:** ${cognitive.learning_preference}`)

  if (cognitive.problem_solving) {
    lines.push('\n**Problem Solving:**')
    if (cognitive.problem_solving.structured !== undefined) {
      lines.push(`- Structured approach: ${cognitive.problem_solving.structured ? 'yes' : 'flexible'}`)
    }
    if (cognitive.problem_solving.iterative !== undefined) {
      lines.push(`- Iterative refinement: ${cognitive.problem_solving.iterative ? 'yes' : 'no'}`)
    }
    if (cognitive.problem_solving.lateral !== undefined) {
      lines.push(`- Lateral/creative thinking: ${cognitive.problem_solving.lateral ? 'yes' : 'no'}`)
    }
  }

  return lines.join('\n')
}

/**
 * Build emotional patterns section
 */
function buildEmotionalPatternsSection(emotional: EmotionalPatterns): string {
  const lines: string[] = ['## Emotional Patterns']

  lines.push(`**Baseline Tone:** ${emotional.baseline_tone}`)
  lines.push(`**Expressiveness:** ${describeScale(emotional.expressiveness, ['reserved', 'controlled', 'balanced', 'expressive', 'very expressive'])}`)
  lines.push(`**Empathy/Emotional Contagion:** ${describeScale(emotional.emotional_contagion, ['low awareness', 'selective', 'moderate', 'high awareness', 'very high'])}`)
  lines.push(`**Emotion Word Diversity:** ${emotional.emotion_word_diversity}`)

  if (emotional.stress_indicators && emotional.stress_indicators.length > 0) {
    lines.push(`\n**Stress Indicators:** ${emotional.stress_indicators.join(', ')}`)
  }

  if (emotional.excitement_indicators && emotional.excitement_indicators.length > 0) {
    lines.push(`\n**Excitement Indicators:** ${emotional.excitement_indicators.join(', ')}`)
  }

  if (emotional.empathy_markers) {
    lines.push('\n**Empathy Markers:**')
    lines.push(`- Perspective taking: ${describeScale(emotional.empathy_markers.perspective_taking, ['low', 'moderate', 'high', 'very high'])}`)
    lines.push(`- Validation responses: ${describeScale(emotional.empathy_markers.validation_responses, ['rare', 'occasional', 'frequent', 'very frequent'])}`)
  }

  return lines.join('\n')
}

/**
 * Build social dynamics section
 */
function buildSocialDynamicsSection(social: SocialDynamics): string {
  const lines: string[] = ['## Social Dynamics']

  lines.push(`**Leadership Style:** ${social.leadership_style}`)
  lines.push(`**Status Orientation:** ${describeScale(social.status_orientation, ['egalitarian', 'low-status', 'moderate', 'status-conscious', 'hierarchy-focused'])}`)

  if (social.ingroup_signals) {
    lines.push('\n**In-Group Signals:**')
    if (social.ingroup_signals.jargon.length > 0) {
      lines.push(`- Jargon: ${social.ingroup_signals.jargon.join(', ')}`)
    }
    if (social.ingroup_signals.cultural_references.length > 0) {
      lines.push(`- Cultural references: ${social.ingroup_signals.cultural_references.join(', ')}`)
    }
  }

  if (social.humor_targets) {
    lines.push('\n**Humor Patterns:**')
    lines.push(`- Self-deprecating: ${social.humor_targets.self_deprecating ? 'yes' : 'no'}`)
    lines.push(`- Targets others: ${social.humor_targets.targets_others ? 'yes' : 'no'}`)
    lines.push(`- Targets situations: ${social.humor_targets.targets_situations ? 'yes' : 'no'}`)
    lines.push(`- Absurdist humor: ${social.humor_targets.targets_absurd ? 'yes' : 'no'}`)
    if (social.humor_targets.taboo_topics.length > 0) {
      lines.push(`- Avoids: ${social.humor_targets.taboo_topics.join(', ')}`)
    }
  }

  if (social.community_engagement) {
    lines.push('\n**Community Engagement:**')
    lines.push(`- Helping behavior: ${describeScale(social.community_engagement.helping_behavior, ['rare', 'occasional', 'moderate', 'frequent', 'very frequent'])}`)
    lines.push(`- Mentoring tendency: ${describeScale(social.community_engagement.mentoring, ['rare', 'occasional', 'moderate', 'frequent', 'very frequent'])}`)
    lines.push(`- Conflict mediation: ${describeScale(social.community_engagement.conflict_mediation, ['rare', 'occasional', 'moderate', 'frequent', 'very frequent'])}`)
  }

  return lines.join('\n')
}

/**
 * Build a V2 response prompt
 */
export function buildResponsePromptV2(
  personality: PersonalityV2,
  userMessage: string,
  options: {
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    userName?: string
    task?: string
  } = {}
): string {
  const parts: string[] = []

  // System prompt with V2 personality
  parts.push(buildSystemPromptV2(personality, {
    userName: options.userName,
    task: options.task || 'Respond to the user message'
  }))

  // Conversation history
  if (options.history && options.history.length > 0) {
    parts.push('\n' + buildChatHistoryPrompt(options.history))
  }

  // Current message
  parts.push(`\n## Current Message\n**User:** ${userMessage}`)

  return parts.join('\n')
}

/**
 * Build V2 enhanced response prompt from full Idiomark file
 * Automatically uses V2 data if available, falls back to V1
 */
export function buildResponsePromptFromIdiomarkFile(
  idiomarkFile: { personality: Personality; personality_v2?: PersonalityV2 },
  userMessage: string,
  options: {
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    userName?: string
    task?: string
  } = {}
): string {
  // Use V2 if available, otherwise fall back to V1
  const personality = idiomarkFile.personality_v2 || idiomarkFile.personality

  if (idiomarkFile.personality_v2) {
    // Has V2 data - use enhanced prompt builder
    return buildResponsePromptV2(idiomarkFile.personality_v2, userMessage, options)
  } else {
    // V1 only - use original prompt builder (need to import from this file)
    return buildResponsePrompt(idiomarkFile.personality, userMessage, options)
  }
}

