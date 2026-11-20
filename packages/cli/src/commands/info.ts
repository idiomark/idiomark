import chalk from 'chalk'
import { readFileSync } from 'fs'

export async function info(file: string) {
  console.log(chalk.cyan('\n📋 Idiomark File Info\n'))

  try {
    const content = readFileSync(file, 'utf-8')
    const data = JSON.parse(content)

    // Metadata section
    console.log(chalk.cyan('📄 Metadata:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Version:')}        ${data.idiomark || 'Unknown'}`)
    console.log(`  ${chalk.white('ID:')}            ${data.id || 'Unknown'}`)
    console.log(`  ${chalk.white('Created:')}       ${data.created || 'Unknown'}`)
    console.log(`  ${chalk.white('Last Updated:')}  ${data.updated || 'Unknown'}`)
    console.log(chalk.gray('─'.repeat(40)))

    // Entity section
    if (data.metadata?.entity) {
      const entity = data.metadata.entity
      console.log(chalk.cyan('\n👤 Entity:'))
      console.log(chalk.gray('─'.repeat(40)))
      console.log(`  ${chalk.white('Name:')}         ${entity.name || 'Unnamed'}`)
      console.log(`  ${chalk.white('Type:')}         ${entity.type || 'Unknown'}`)
      if (entity.sources) {
        console.log(`  ${chalk.white('Sources:')}      ${entity.sources.join(', ')}`)
      }
      console.log(chalk.gray('─'.repeat(40)))
    }

    // Extraction section
    if (data.metadata?.extraction) {
      const extraction = data.metadata.extraction
      console.log(chalk.cyan('\n🔍 Extraction:'))
      console.log(chalk.gray('─'.repeat(40)))
      console.log(`  ${chalk.white('Date:')}         ${extraction.date || 'Unknown'}`)
      console.log(`  ${chalk.white('Sample Size:')}  ${extraction.sample_size || 'Unknown'} posts`)
      if (extraction.timeframe) {
        console.log(`  ${chalk.white('From:')}         ${extraction.timeframe.from}`)
        console.log(`  ${chalk.white('To:')}           ${extraction.timeframe.to}`)
      }
      console.log(chalk.gray('─'.repeat(40)))
    }

    // Personality section
    if (data.personality) {
      const p = data.personality

      console.log(chalk.cyan('\n🎭 Personality:'))
      console.log(chalk.gray('─'.repeat(40)))

      if (p.voice) {
        console.log(chalk.white('  Voice:'))
        if (p.voice.tone) {
          console.log(`    ${chalk.gray('Tone:')}          ${p.voice.tone.primary} (${(p.voice.tone.confidence * 100).toFixed(0)}%)`)
        }
        console.log(`    ${chalk.gray('Formality:')}     ${(p.voice.formality * 100).toFixed(0)}%`)
        console.log(`    ${chalk.gray('Humor:')}         ${(p.voice.humor * 100).toFixed(0)}%`)
        console.log(`    ${chalk.gray('Sarcasm:')}       ${(p.voice.sarcasm * 100).toFixed(0)}%`)
        console.log(`    ${chalk.gray('Enthusiasm:')}    ${(p.voice.enthusiasm * 100).toFixed(0)}%`)
        console.log(`    ${chalk.gray('Directness:')}    ${(p.voice.directness * 100).toFixed(0)}%`)
      }

      if (p.patterns?.emoji_usage) {
        console.log(`\n    ${chalk.gray('Emoji Usage:')}   ${p.patterns.emoji_usage.frequency}`)
        if (p.patterns.emoji_usage.top_emojis) {
          console.log(`    ${chalk.gray('Top Emojis:')}    ${p.patterns.emoji_usage.top_emojis.join(' ')}`)
        }
      }

      console.log(chalk.gray('─'.repeat(40)))

      // Domains
      if (p.domains && p.domains.length > 0) {
        console.log(chalk.cyan('\n📚 Domains:'))
        console.log(chalk.gray('─'.repeat(40)))
        p.domains.forEach((domain: any) => {
          const confidence = domain.confidence ? ` (${(domain.confidence * 100).toFixed(0)}%)` : ''
          console.log(`  ${chalk.white('•')} ${domain.name}${confidence}`)
        })
        console.log(chalk.gray('─'.repeat(40)))
      }

      // Values
      if (p.values && p.values.length > 0) {
        console.log(chalk.cyan('\n💭 Values:'))
        console.log(chalk.gray('─'.repeat(40)))
        p.values.forEach((value: any) => {
          const sentiment = value.sentiment === 'positive' ? chalk.green('✓') : chalk.red('✗')
          const confidence = value.confidence ? ` (${(value.confidence * 100).toFixed(0)}%)` : ''
          console.log(`  ${sentiment} ${value.name}${confidence}`)
        })
        console.log(chalk.gray('─'.repeat(40)))
      }
    }

    console.log()

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log(chalk.red(`\n❌ File not found: ${file}\n`))
    } else if ((error as any).syntaxError) {
      console.log(chalk.red('\n❌ Invalid JSON\n'))
    } else {
      console.log(chalk.red(`\n❌ ${(error as any).message}\n`))
    }
  }
}
