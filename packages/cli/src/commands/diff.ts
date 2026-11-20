import chalk from 'chalk'
import ora from 'ora'
import { readFileSync } from 'fs'

interface TraitDiff {
  trait: string
  value1: number
  value2: number
  delta: number
}

export async function diff(file1: string, file2: string): Promise<void> {
  const spinner = ora('Loading Idiomark files...').start()

  try {
    const data1 = JSON.parse(readFileSync(file1, 'utf-8'))
    const data2 = JSON.parse(readFileSync(file2, 'utf-8'))

    spinner.stop()

    const name1 = data1.metadata?.entity?.name || file1
    const name2 = data2.metadata?.entity?.name || file2

    console.log(chalk.cyan(`\n📊 Personality Comparison\n`))

    // Compare voice traits
    const voice1 = data1.personality?.voice || {}
    const voice2 = data2.personality?.voice || {}

    console.log(chalk.gray('                    │') + chalk.white(` ${name1.padEnd(8) } │ ${name2.padEnd(8) } │ Delta`))
    console.log(chalk.gray('────────────────────┼──────────┼──────────┼──────────'))

    const traits: TraitDiff[] = [
      { trait: 'Formality', value1: voice1.formality || 0, value2: voice2.formality || 0, delta: 0 },
      { trait: 'Humor', value1: voice1.humor || 0, value2: voice2.humor || 0, delta: 0 },
      { trait: 'Sarcasm', value1: voice1.sarcasm || 0, value2: voice2.sarcasm || 0, delta: 0 },
      { trait: 'Enthusiasm', value1: voice1.enthusiasm || 0, value2: voice2.enthusiasm || 0, delta: 0 },
      { trait: 'Directness', value1: voice1.directness || 0, value2: voice2.directness || 0, delta: 0 },
    ]

    traits.forEach(t => {
      t.delta = t.value2 - t.value1
      const deltaStr = t.delta >= 0 ? chalk.green(`+${t.delta.toFixed(2)}`) : chalk.red(t.delta.toFixed(2))
      console.log(`${chalk.white(t.trait.padEnd(20))} │ ${(t.value1.toFixed(2)).padEnd(8)} │ ${(t.value2.toFixed(2)).padEnd(8)} │ ${deltaStr}`)
    })

    console.log(chalk.gray('────────────────────┴──────────┴──────────┴──────────'))

    // Compare primary tone
    const tone1 = voice1.tone?.primary || 'Unknown'
    const tone2 = voice2.tone?.primary || 'Unknown'
    console.log(`\n${chalk.white('Primary Tone:')}       │ ${chalk.cyan(tone1.padEnd(8))} │ ${chalk.cyan(tone2.padEnd(8))}`)

    // Compare emoji usage
    const emoji1 = data1.personality?.patterns?.emoji_usage?.frequency || 'Unknown'
    const emoji2 = data2.personality?.patterns?.emoji_usage?.frequency || 'Unknown'
    console.log(`${chalk.white('Emoji Usage:')}        │ ${chalk.cyan(emoji1.padEnd(8))} │ ${chalk.cyan(emoji2.padEnd(8))}`)

    // Compare domains
    const domains1 = (data1.personality?.domains || []).map((d: any) => d.name)
    const domains2 = (data2.personality?.domains || []).map((d: any) => d.name)

    console.log(chalk.white(`\nTop Domains:`))
    console.log(chalk.gray(`  ${name1}:`) + ` ${domains1.slice(0, 5).join(', ') || 'None'}`)
    console.log(chalk.gray(`  ${name2}:`) + ` ${domains2.slice(0, 5).join(', ') || 'None'}`)

    console.log()

  } catch (error) {
    spinner.fail('Diff failed')
    if ((error as any).code === 'ENOENT') {
      console.error(chalk.red('File not found'))
    } else {
      console.error(chalk.red('Error:'), (error as Error).message)
    }
  }
}
