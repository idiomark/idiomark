import chalk from 'chalk'
import { readFileSync } from 'fs'

export async function whoami(file: string): Promise<void> {
  try {
    const content = readFileSync(file, 'utf-8')
    const data = JSON.parse(content)

    const entity = data.metadata?.entity
    const personality = data.personality

    if (!entity) {
      console.log(chalk.red('❌ No entity information found'))
      return
    }

    // Header
    console.log(chalk.cyan(`\n👤 ${entity.name}`))

    // Voice traits
    if (personality?.voice) {
      const v = personality.voice

      const traits: string[] = []
      if (v.tone?.primary) traits.push(v.tone.primary)
      if (v.tone?.secondary) traits.push(v.tone.secondary)

      console.log(chalk.gray('├──'), chalk.white('Tone:'), traits.join(', '))

      const scores = [
        `${Math.round((v.formality || 0) * 100)}% formal`,
        `${Math.round((v.humor || 0) * 100)}% humor`,
        `${Math.round((v.sarcasm || 0) * 100)}% sarcasm`,
      ]
      console.log(chalk.gray('├──'), chalk.white('Voice:'), scores.join(' | '))
    }

    // Domains
    if (personality?.domains && personality.domains.length > 0) {
      const topDomains = personality.domains
        .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 5)
        .map((d: any) => d.name)

      console.log(chalk.gray('└──'), chalk.white('Domains:'), topDomains.join(', '))
    }

    console.log()

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log(chalk.red(`\n❌ File not found: ${file}\n`))
    } else {
      console.log(chalk.red(`\n❌ ${(error as Error).message}\n`))
    }
  }
}
