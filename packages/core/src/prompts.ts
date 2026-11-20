/**
 * Idiomark Analysis Prompts
 *
 * LLM prompts for personality extraction from text content
 */

export interface TextSample {
  id: string
  text: string
  timestamp?: string
  platform?: string
}

export interface AnalysisContext {
  samples: TextSample[]
  totalWordCount: number
  dateRange: { from: string; to: string }
  platforms: string[]
}

/**
 * System prompt for the personality analysis LLM
 */
export const PERSONALITY_ANALYSIS_SYSTEM = `You are an expert personality linguist and behavioral analyst. Your task is to analyze text samples and extract personality insights with high precision.

You will receive text content from various sources (social media posts, comments, messages) and must analyze them for:

1. **Voice Characteristics**: Tone, formality, humor, sarcasm, enthusiasm, directness
2. **Writing Patterns**: Sentence/paragraph structure, emoji usage, punctuation, capitalization
3. **Domain Knowledge**: Technical areas, industries, fields of expertise
4. **Values & Interests**: Topics they care about (positive sentiment) or dislike (negative sentiment)
5. **Knowledge Graph**: Frequent terms, mentions, topics

**Important Guidelines**:
- Be precise and evidence-based
- Provide confidence scores (0-1) for all assessments
- Support domain/value claims with specific examples
- Distinguish between primary and secondary topics
- Detect subtle patterns in writing style
- Account for platform-specific conventions (e.g., Twitter character limits)
- Consider temporal changes in writing style if samples span long periods

**Output Format**:
Return ONLY valid JSON matching the Idiomark schema. No explanations, no markdown code blocks.`

/**
 * Main analysis prompt for extracting personality from text samples
 */
export function buildAnalysisPrompt(context: AnalysisContext): string {
  const { samples, totalWordCount, dateRange, platforms } = context

  const samplesText = samples
    .map((s, i) => `--- Sample ${i + 1} (ID: ${s.id}) ---\n${s.text}`)
    .join('\n\n')

  return `Analyze the following ${samples.length} text sample(s) totaling ~${totalWordCount} words from ${platforms.join(
    ', '
  )} platforms. The samples span from ${dateRange.from} to ${dateRange.to}.

${samplesText}

Extract and return a JSON object with the following structure:

{
  "voice": {
    "tone": {
      "primary": "string (casual|formal|humorous|professional|technical|friendly|sarcastic)",
      "secondary": "string (optional - secondary tone)",
      "confidence": 0.0-1.0
    },
    "formality": 0.0-1.0,
    "humor": 0.0-1.0,
    "sarcasm": 0.0-1.0,
    "enthusiasm": 0.0-1.0,
    "directness": 0.0-1.0
  },
  "patterns": {
    "sentence_length": {
      "mean": number,
      "stddev": number
    },
    "paragraph_length": {
      "mean": number,
      "stddev": number
    },
    "emoji_usage": {
      "frequency": "none|low|medium|high",
      "top_emojis": ["emoji1", "emoji2", "..."],
      "position": "start|end|mixed"
    },
    "punctuation": {
      "exclamation_frequency": 0.0-1.0,
      "question_frequency": 0.0-1.0,
      "ellipsis_usage": "none|low|medium|high"
    },
    "capitalization": {
      "all_caps_frequency": 0.0-1.0,
      "random_caps": boolean
    }
  },
  "domains": [
    {
      "name": "domain name",
      "confidence": 0.0-1.0,
      "evidence": ["specific quote or reference from text", "..."]
    }
  ],
  "values": [
    {
      "name": "topic or concept",
      "sentiment": "positive|negative|neutral",
      "confidence": 0.0-1.0
    }
  ],
  "knowledge": {
    "frequent_terms": ["term1", "term2", "..."],
    "mentions": {
      "people": ["@person1", "..."],
      "projects": ["project1", "..."],
      "organizations": ["org1", "..."]
    },
    "topics": {
      "primary": ["topic1", "..."],
      "secondary": ["topic2", "..."]
    }
  }
}

**Analysis Instructions**:

**Voice Analysis**:
- Identify primary tone based on overall writing style
- Note secondary tone if present (e.g., primarily casual but sometimes professional)
- Rate formality: 0 (very casual/slang-heavy) to 1 (very formal/academic)
- Rate humor: 0 (serious) to 1 (frequent jokes/wit)
- Rate sarcasm: 0 (sincere) to 1 (heavily sarcastic/ironic)
- Rate enthusiasm: 0 (flat/detached) to 1 (very energetic/excited)
- Rate directness: 0 (indirect/hedged) to 1 (straightforward/assertive)

**Pattern Analysis**:
- Calculate actual sentence length statistics (mean words per sentence, standard deviation)
- Calculate paragraph length statistics if applicable
- Categorize emoji frequency: none (0%), low (<10%), medium (10-30%), high (>30%)
- List top 5-10 most used emojis
- Note emoji position preference: start (at beginning), end (at end), mixed
- Calculate exclamation frequency: ratio of sentences with ! to total sentences
- Calculate question frequency: ratio of sentences with ? to total sentences
- Categorize ellipsis usage: none, low, medium, high
- Calculate all-caps frequency: ratio of all-caps words to total words
- Note random_caps: true if inconsistent capitalization patterns detected

**Domain Extraction**:
- Identify technical domains (programming languages, frameworks, tools)
- Identify industry knowledge areas (finance, healthcare, design, etc.)
- Provide confidence score based on evidence strength
- Include 1-3 specific quotes or references as evidence for each domain

**Value Extraction**:
- Identify topics/concepts with positive sentiment (things they care about)
- Identify topics/concepts with negative sentiment (things they criticize/dislike)
- Include neutral values if neither positive nor negative sentiment detected
- Provide confidence score based on sentiment clarity

**Knowledge Graph**:
- Extract 10-20 most frequent meaningful terms (exclude common words like "the", "and")
- Extract @mentions of people (with @ symbol)
- Extract project names (look for proper nouns, GitHub repos, product names)
- Extract organization/company names
- Categorize topics: primary (most frequently discussed) and secondary (occasionally mentioned)

Return ONLY the JSON object. No additional text.`
}

/**
 * Prompt for analyzing a single chunk of text (for chunked analysis)
 */
export function buildChunkAnalysisPrompt(
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): string {
  return `Analyze this text chunk ${chunkIndex + 1} of ${totalChunks} and extract personality insights.

Text chunk:
${chunk}

Extract insights following the same JSON structure as the main analysis prompt. Focus on:
1. Voice characteristics visible in this chunk
2. Writing patterns in this chunk
3. Any domains mentioned
4. Any values expressed (positive/negative sentiment toward topics)
5. Knowledge elements (terms, mentions, topics)

Return ONLY valid JSON.`
}

/**
 * Prompt for merging multiple analysis results
 */
export function buildMergePrompt(
  analyses: string[]
): string {
  return `You are merging ${analyses.length} separate personality analyses into one cohesive profile.

Each analysis represents a chunk of text from the same individual. Merge them by:

1. **Averaging numerical scores** (formality, humor, sarcasm, enthusiasm, directness, frequencies)
2. **Combining and deduplicating** arrays (top_emojis, domains, values, terms, mentions)
3. **Re-calculating statistics** based on aggregated data (sentence length, emoji counts)
4. **Resolving conflicts** - if one analysis says "casual" and another "professional", use primary/secondary tones
5. **Summing evidence arrays** - combine all evidence from different analyses

Here are the analyses to merge:

${analyses.map((a, i) => `--- Analysis ${i + 1} ---\n${a}`).join('\n\n')}

Return a single merged JSON object following the same structure. Return ONLY the JSON.`
}

/**
 * Prompt for refining analysis with additional context
 */
export function buildRefinementPrompt(
  initialAnalysis: string,
  additionalContext: string
): string {
  return `Here is an initial personality analysis:

${initialAnalysis}

And here is additional context about the individual:
${additionalContext}

Refine the analysis considering this additional context. Adjust:
- Confidence scores if the context confirms or contradicts initial findings
- Domain expertise if the context provides more evidence
- Topics/interests if the context reveals additional areas of focus
- Any other fields that should be updated based on this information

Return the refined JSON object. Return ONLY the JSON.`
}

/**
 * Prompt for validating analysis quality
 */
export function buildValidationPrompt(analysis: string): string {
  return `You are validating a personality analysis for quality and consistency.

Review this analysis:
${analysis}

Check for:
1. **Consistency**: Do numerical scores match qualitative descriptions?
2. **Completeness**: Are all required fields populated?
3. **Evidence**: Do domains have supporting evidence? Is it specific?
4. **Plausibility**: Are confidence scores reasonable given the analysis?
5. **Coherence**: Do different sections of the analysis align?

Return a JSON object with:
{
  "valid": boolean,
  "issues": ["array of issue descriptions if valid is false"],
  "confidence": 0.0-1.0,
  "recommendations": ["array of suggestions for improvement"]
}

Return ONLY the JSON.`
}
