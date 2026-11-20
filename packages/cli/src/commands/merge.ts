import chalk from 'chalk'
import ora from 'ora'
import { readFileSync, writeFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

interface MergeOptions {
  weights?: number[]
  output?: string
}

export async function merge(files: string[], options: MergeOptions): Promise<void> {
  const spinner = ora('Merging personalities...').start()

  try {
    // Parse all input files
    const personalities = files.map(f => {
      try {
        return JSON.parse(readFileSync(f, 'utf-8'))
      } catch (e) {
        spinner.fail(`Failed to read ${f}`)
        throw e
      }
    })

    // Determine weights
    let weights = options.weights?.map(w => typeof w === 'string' ? parseFloat(w) : w)
    if (!weights || weights.length !== personalities.length) {
      if (!weights) {
        weights = personalities.map(() => 1 / personalities.length)
      } else {
        spinner.fail(`Weight count (${weights.length}) doesn't match file count (${personalities.length})`)
        return
      }
    }

    // Normalize weights
    const weightSum = weights.reduce((a, b) => a + b, 0)
    weights = weights.map(w => w / weightSum)

    spinner.stop()

    // Display merge plan
    console.log(chalk.cyan('\n🔮 Merging personalities\n'))
    console.log(chalk.gray('Input:'))
    personalities.forEach((p, i) => {
      const name = p.metadata?.entity?.name || files[i]
      const weight = weights![i]
      console.log(`  • ${name} (${chalk.cyan((weight * 100).toFixed(0) + '%')} weight)`)
    })

    // Merge voice traits (weighted average)
    const mergedPersonality: any = {
      voice: {
        formality: weightedAverage(personalities.map(p => p.personality?.voice?.formality || 0.5), weights),
        humor: weightedAverage(personalities.map(p => p.personality?.voice?.humor || 0.5), weights),
        sarcasm: weightedAverage(personalities.map(p => p.personality?.voice?.sarcasm || 0.5), weights),
        enthusiasm: weightedAverage(personalities.map(p => p.personality?.voice?.enthusiasm || 0.5), weights),
        directness: weightedAverage(personalities.map(p => p.personality?.voice?.directness || 0.5), weights),
        tone: {
          primary: personalities[0].personality?.voice?.tone?.primary || 'neutral',
          confidence: weightedAverage(personalities.map(p => p.personality?.voice?.tone?.confidence || 0.5), weights)
        }
      },
      patterns: {},
      domains: mergeDomains(personalities, weights)
    }

    // Merge emoji usage
    const emojiFreqs = personalities.map(p => p.personality?.patterns?.emoji_usage?.frequency)
    const primaryFreq = emojiFreqs.find(f => f) || 'moderate'
    mergedPersonality.patterns.emoji_usage = { frequency: primaryFreq }

    // Create merged Idiomark file
    const primary = personalities[0]
    const merged = {
      idiomark: primary.idiomark || '1.0.0',
      id: uuidv4(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: {
        entity: {
          name: `Merged (${files.map(f => f.replace('.idiomark', '')).join(' + ')})`,
          type: 'merged',
          sources: personalities.flatMap(p => p.metadata?.entity?.sources || [])
        },
        extraction: {
          method: 'merge',
          sources: files,
          weights: weights
        }
      },
      personality: mergedPersonality
    }

    // Write output
    const outputFile = options.output || 'merged.idiomark'
    writeFileSync(outputFile, JSON.stringify(merged, null, 2))

    console.log(chalk.gray(`\nOutput: ${chalk.cyan(outputFile)}\n`))

    // Show resulting profile
    console.log(chalk.cyan('Resulting Profile:'))
    console.log(chalk.gray('─'.repeat(40)))
    const v = mergedPersonality.voice
    console.log(`  ${chalk.white('Formality:')} ${chalk.cyan((v.formality * 100).toFixed(0) + '%')} (${weights.map((w, i) => `${(personalities[i].personality?.voice?.formality || 0.5).toFixed(2)}`).join(', ')})`)
    console.log(`  ${chalk.white('Humor:')} ${chalk.cyan((v.humor * 100).toFixed(0) + '%')}`)
    console.log(`  ${chalk.white('Directness:')} ${chalk.cyan((v.directness * 100).toFixed(0) + '%')}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Domains:')} ${mergedPersonality.domains.map((d: any) => d.name).join(', ')}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.green(`\n✅ Merged personality saved to ${outputFile}\n`))

  } catch (error) {
    spinner.fail('Merge failed')
    console.error(chalk.red('Error:'), (error as Error).message)
  }
}

function weightedAverage(values: number[], weights: number[]): number {
  return values.reduce((sum, v, i) => sum + v * weights[i], 0)
}

function mergeDomains(personalities: any[], weights: number[]): any[] {
  const domainMap = new Map<string, number>()

  personalities.forEach((p, pIdx) => {
    const domains = p.personality?.domains || []
    domains.forEach((d: any) => {
      const existing = domainMap.get(d.name) || 0
      domainMap.set(d.name, existing + (d.confidence || 0.5) * weights[pIdx])
    })
  })

  return Array.from(domainMap.entries())
    .map(([name, confidence]) => ({ name, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
}
