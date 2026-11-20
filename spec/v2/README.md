# Idiomark Protocol v2 (Experimental)

Experimental extensions to the Idiomark Protocol, based on psycholinguistics research.

## Schema

- **File:** [idiomark-v2.schema.json](./idiomark-v2.schema.json)
- **Format:** JSON Schema Draft-07
- **Status:** Experimental/Beta

## Version Pattern

```
2.0.0
2.0.0-beta
```

## Experimental Dimensions

All V2 dimensions are **optional** and build on the V1 core. They're designed to gather data on what features provide value.

### Big Five Traits (`big_five`)

The OCEAN model - most researched personality model in psychology:

- `openness` - Creativity, curiosity, adventure-seeking
- `conscientiousness` - Organization, discipline, reliability
- `extraversion` - Social energy, stimulation-seeking
- `agreeableness` - Cooperation, empathy, harmony-seeking
- `neuroticism` - Emotional stability (low = stable)
- `confidence` - Assessment confidence

### Linguistic Markers (`linguistic_markers`)

Subtle language patterns:

- `pronouns` - I/we/you usage patterns
- `hedging` - Uncertainty indicators (maybe, perhaps)
- `absolutist_language` - Certainty indicators (always, never)
- `concreteness` - Abstract vs concrete thinking (-1 to +1)

### Communication Style (`communication_style`)

How interactions are structured:

- `question_frequency` - Curiosity and engagement
- `self_disclosure` - Personal info sharing
- `task_vs_social` - Orientation (-1 task to +1 social)
- `conflict_approach` - direct, diplomatic, avoidant, collaborative, competitive
- `explanation_style` - terse to comprehensive

### Cognitive Patterns (`cognitive_patterns`)

Information processing style:

- `thinking_style` - analytical, intuitive, creative, pragmatic, scientific, artistic
- `decision_making` - quick, deliberate, collaborative, data_driven, gut_instinct
- `information_processing` - detailed, big_picture, synthesizing, filtering
- `learning_preference` - theoretical, hands_on, observational, experimental, collaborative

### Emotional Patterns (`emotional_patterns`)

Beyond simple enthusiasm:

- `baseline_tone` - optimistic, neutral, realistic, pessimistic, skeptical
- `expressiveness` - How freely emotions are expressed
- `emotional_contagion` - Picking up others' emotions
- `emotion_word_diversity` - Vocabulary richness

### Social Dynamics (`social_dynamics`)

Social hierarchy and group navigation:

- `leadership_style` - directive, collaborative, supportive, delegative, situational
- `status_orientation` - How much hierarchy matters
- `ingroup_signals` - Jargon, cultural references, community phrases
- `humor_targets` - Self-deprecating, others, situations, absurd

### Metadata (`_meta`)

Track experimental field usage:

- `populated_fields` - Which V2 fields are present
- `field_confidence` - Confidence per field
- `field_sources` - llm, statistical, manual, or inferred
- `analyzer_version` - What produced the data

## Stability Promise

V2 fields are **experimental** and may:
- Change structure without notice
- Be removed if they don't provide value
- Graduate to V1 core if they prove useful

## Validation

```bash
npx ajv-cli validate -s spec/v2/idiomark-v2.schema.json -d your-file.idiomark
```

## Graduation Criteria

V2 features graduate to V1 core when:
1. Multiple implementations support them
2. Real-world usage shows measurable value
3. Schema structure stabilizes
4. Community consensus forms
