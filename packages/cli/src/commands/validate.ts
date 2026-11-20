import chalk from 'chalk'
import ora from 'ora'
import { readFileSync } from 'fs'
import { IdiomarkValidator } from '@idiomark/core'
import { IdiomarkDValidator, validateIdiomarkD } from '@idiomark/core'
import type { ValidateOptions } from '../types'

export async function validate(file: string, options: ValidateOptions) {
  const { strict } = options

  console.log(chalk.cyan('\n✓ Idiomark/IdiomarkD Validator\n'))

  const spinner = ora(`Validating ${file}...`).start()

  try {
    // Read the file
    const content = readFileSync(file, 'utf-8')

    spinner.text = 'Parsing file...'

    const data = JSON.parse(content)

    // Detect file type
    const isIdiomarkD = data.profile_type === 'developer'

    if (isIdiomarkD) {
      spinner.text = 'Validating as IdiomarkD file...'
      console.log(chalk.gray('Detected: IdiomarkD (Idiomark for Developers) profile'))

      // Validate against IdiomarkD schema
      const validator = new IdiomarkDValidator({ strict: strict || false })
      const result = await validator.validate(data)

      if (result.valid) {
        spinner.succeed(chalk.green('\n✅ Valid IdiomarkD file\n'))

        console.log(chalk.cyan('👤 Developer Profile Details:'))
        console.log(chalk.gray('─'.repeat(40)))
        console.log(`  ${chalk.white('Profile Type:')}     ${chalk.cyan('Developer')}`)
        console.log(`  ${chalk.white('Version:')}          ${result.version}`)
        console.log(`  ${chalk.white('ID:')}               ${result.id}`)
        console.log(`  ${chalk.white('Created:')}          ${result.created}`)
        console.log(`  ${chalk.white('Sources:')}          ${result.sources.join(', ')}`)
        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.cyan('🧠 Behavioral Layer:'))
        console.log(chalk.gray('─'.repeat(40)))

        if (data.behavioral) {
          const { cognitive_style, code_structure, naming, error_handling, testing, code_review } = data.behavioral

          if (cognitive_style) {
            console.log(`  ${chalk.white('Problem Solving:')}  ${chalk.cyan(cognitive_style.problem_solving)}`)
            console.log(`  ${chalk.white('Learning Style:')}   ${chalk.cyan(cognitive_style.learning_style)}`)
          }

          if (code_structure) {
            console.log(`  ${chalk.white('Functional Pref:')}  ${chalk.cyan(String(code_structure.functional_preference))}`)
            console.log(`  ${chalk.white('Max Func Len:')}     ${chalk.cyan(String(code_structure.max_function_length))}`)
          }

          if (naming) {
            console.log(`  ${chalk.white('Naming Phil:')}      ${chalk.cyan(naming.philosophy)}`)
            console.log(`  ${chalk.white('Variables:')}        ${chalk.cyan(naming.conventions.variables)}`)
          }

          if (error_handling) {
            console.log(`  ${chalk.white('Error Phil:')}       ${chalk.cyan(error_handling.philosophy)}`)
          }

          if (testing) {
            console.log(`  ${chalk.white('Testing Temp:')}     ${chalk.cyan(testing.temperament)}`)
            console.log(`  ${chalk.white('Coverage:')}         ${chalk.cyan(String(testing.coverage_threshold))}`)
          }

          if (code_review) {
            console.log(`  ${chalk.white('Review Style:')}     ${chalk.cyan(code_review.style)}`)
            console.log(`  ${chalk.white('Focus Areas:')}      ${chalk.cyan(code_review.focus_areas.join(', '))}`)
          }
        }

        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.cyan('🤖 AI Personality Layer:'))
        console.log(chalk.gray('─'.repeat(40)))

        if (data.ai_personality) {
          const { voice, code_generation, interaction } = data.ai_personality

          if (voice) {
            console.log(`  ${chalk.white('Primary Tone:')}     ${chalk.cyan(voice.tone?.primary)}`)
            console.log(`  ${chalk.white('Certainty:')}        ${chalk.cyan(voice.tone?.certainty)}`)
          }

          if (code_generation) {
            console.log(`  ${chalk.white('Prefer Patterns:')}  ${chalk.cyan(String(code_generation.prefer_patterns_over_raw_code))}`)
            console.log(`  ${chalk.white('Include Expl:')}     ${chalk.cyan(code_generation.include_explanations)}`)
          }

          if (interaction) {
            console.log(`  ${chalk.white('Question Style:')}   ${chalk.cyan(interaction.question_response_style)}`)
          }
        }

        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.gray(`\n✅ All checks passed!\n`))
      } else {
        spinner.fail(chalk.red('\n❌ Validation failed\n'))

        console.log(chalk.red('Errors found:'))
        console.log(chalk.gray('─'.repeat(40)))

        for (const error of result.errors) {
          console.log(`  ${chalk.red('•')} ${error.message}`)
          if (error.field) {
            console.log(`    ${chalk.gray(`Field: ${error.field}`)}`)
          }
        }

        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.gray(`\n💡 Fix errors and run validate again\n`))
      }

      return result
    } else {
      spinner.text = 'Validating as Idiomark file...'
      console.log(chalk.gray('Detected: Idiomark (Personality Characterization Protocol) profile'))

      // Validate against schema
      const validator = new IdiomarkValidator({ strict: strict || false })
      const result = await validator.validate(data)

      if (result.valid) {
        spinner.succeed(chalk.green(`\n✅ Valid Idiomark file\n`))

        console.log(chalk.cyan('📋 File Details:'))
        console.log(chalk.gray('─'.repeat(40)))
        console.log(`  ${chalk.white('Version:')}           ${result.version}`)
        console.log(`  ${chalk.white('Entity ID:')}         ${result.id}`)
        console.log(`  ${chalk.white('Created:')}           ${result.created}`)
        console.log(`  ${chalk.white('Sources:')}           ${result.sources.join(', ')}`)
        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.gray(`\n✅ All checks passed!\n`))

        return result
      } else {
        spinner.fail(chalk.red('\n❌ Validation failed\n'))

        console.log(chalk.red('Errors found:'))
        console.log(chalk.gray('─'.repeat(40)))

        for (const error of result.errors) {
          console.log(`  ${chalk.red('•')} ${error.message}`)
          if (error.field) {
            console.log(`    ${chalk.gray(`Field: ${error.field}`)}`)
          }
        }

        console.log(chalk.gray('─'.repeat(40)))
        console.log(chalk.gray(`\n💡 Fix the errors and run validate again\n`))

        return result
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('\n❌ Validation failed\n'))

    if ((error as any).code === 'ENOENT') {
      console.log(chalk.red(`  File not found: ${file}\n`))
    } else if ((error as any).syntaxError) {
      console.log(chalk.red('  Invalid JSON syntax\n'))
      console.log(chalk.gray('  Run with --strict for detailed parsing info\n'))
    } else {
      console.log(chalk.red(`  ${(error as any).message}\n`))
    }
  }
}
