#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { extract } from './commands/extract'
import { clone } from './commands/clone'
import { validate } from './commands/validate'
import { serve } from './commands/serve'
import { info } from './commands/info'
import { chat, respond } from './commands/chat'
import { become } from './commands/become'
import { apply } from './commands/apply'
import { init } from './commands/init'
import { config } from './commands/config'
import { registerAdapterCommands } from './commands/adapter'
import { registerProjectionAdapterCommands } from './commands/projection-adapter'
import { verifyCommand } from './commands/verify'
import { whoami } from './commands/whoami'
import { doctor } from './commands/doctor'
import { diff } from './commands/diff'
import { merge } from './commands/merge'

const program = new Command()

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('Idiomark')} - ${chalk.bold.white('Personality Characterization Protocol')}  ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('The missing standard for AI personality')}        ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('(No, not that one.)')}                               ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════╝')}

${chalk.gray('Try: idiomark clone @user | idiomark become file.idiomark | idiomark diff a.idiomark b.idiomark')}
`

program
  .name('idiomark')
  .description('Personality Characterization Protocol CLI')
  .version('1.0.0')
  .addHelpText('beforeAll', banner)

// Extract command
program
  .command('extract')
  .alias('x')
  .description('Extract personality from connected platforms')
  .option('-t, --twitter', 'Include Twitter data')
  .option('-g, --github', 'Include GitHub data')
  .option('-r, --reddit', 'Include Reddit data')
  .option('-o, --output <file>', 'Output file path', 'entity.idiomark')
  .option('-s, --sample-size <number>', 'Number of posts to analyze', '1000')
  .option('-v, --verbose', 'Verbose output')
  .action(extract)

// Init command
program
  .command('init')
  .alias('n')
  .description('Create a new Idiomark file interactively')
  .option('-n, --name <name>', 'Entity name')
  .option('-t, --type <type>', 'Entity type (human, ai, fictional)')
  .option('-o, --output <file>', 'Output filename')
  .action(init)

// Validate command
program
  .command('validate')
  .alias('v')
  .description('Validate a Idiomark file')
  .argument('<file>', 'Idiomark file to validate')
  .option('-s, --strict', 'Strict validation mode')
  .action(async (file, options) => {
    await validate(file, options)
  })

// Serve command
program
  .command('serve')
  .alias('s')
  .description('Start a local inference server with a personality')
  .argument('<file>', 'Idiomark file to serve')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-m, --model <model>', 'AI model to use', 'gpt-4')
  .action(serve)

// Info command
program
  .command('info')
  .alias('i')
  .description('Display information about a Idiomark file')
  .argument('<file>', 'Idiomark file to inspect')
  .action(info)

// Chat command (interactive)
program
  .command('chat')
  .alias('c')
  .description('Interactive chat with a Idiomark personality')
  .argument('<file>', 'Idiomark file to load')
  .option('-p, --provider <provider>', 'LLM provider (anthropic, openai)', 'anthropic')
  .option('-m, --model <model>', 'AI model to use')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-stream', 'Disable streaming')
  .action(chat)

// Respond command (single message)
program
  .command('respond')
  .description('Generate a single response from a Idiomark personality')
  .argument('<file>', 'Idiomark file to load')
  .argument('<message>', 'Message to respond to')
  .option('-p, --provider <provider>', 'LLM provider (anthropic, openai)', 'anthropic')
  .option('-m, --model <model>', 'AI model to use')
  .option('-v, --verbose', 'Verbose output')
  .action((file, message, options) => respond({ file, message, ...options }))

// Become command (semantic alias for chat)
program
  .command('become <file>')
  .description('Become a Idiomark personality (alias for chat)')
  .option('-p, --provider <provider>', 'LLM provider (anthropic, openai)', 'anthropic')
  .option('-m, --model <model>', 'AI model to use')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-stream', 'Disable streaming')
  .option('--message <msg>', 'Send single message instead of interactive mode')
  .action(become)

// Apply command
program
  .command('apply')
  .description('Apply a Idiomark personality to external systems (MCP, UCP, HTTP)')
  .argument('<file>', 'Idiomark file to apply')
  .option('-m, --mcp-server <name>', 'Start MCP server with personality')
  .option('--mcp-transport <stdio|http>', 'MCP transport method (default: stdio)', 'stdio')
  .option('--mcp-port <number>', 'Port for MCP HTTP transport')
  .option('-u, --ucp-merchant <id>', 'Generate UCP profile for merchant')
  .option('--ucp-business-name <name>', 'Business name for UCP profile')
  .option('-p, --http-port <number>', 'Start HTTP server on port')
  .option('--provider <anthropic|openai|auto>', 'LLM provider', 'auto')
  .option('--llm-model <model>', 'AI model to use')
  .action((file, opts) => apply({ file, ...opts }))

// Config command
program
  .command('config')
  .description('View and edit Idiomark CLI configuration')
  .option('-l, --list', 'List all config values (non-interactive)')
  .option('-g, --get <key>', 'Get a specific config value')
  .option('-s, --set <key> <value>', 'Set a config value', (value, prev: string[]) => [...prev, value], [])
  .option('-d, --delete <key>', 'Delete a config value')
  .option('--reset', 'Reset configuration to defaults')
  .option('--path', 'Show config file path')
  .action((options) => {
    // Handle --set which can have two arguments
    const setValues = options.set
    if (setValues && setValues.length === 1) {
      // If only key provided, we need to get the value from remaining args
      // Commander limitation - we'll handle this in the config command
    }
    config(options)
  })

// Verify command
program.addCommand(verifyCommand)

// Register adapter commands
registerAdapterCommands(program)

// Register projection adapter commands
registerProjectionAdapterCommands(program)

// Whoami command
program
  .command('whoami <file>')
  .description('Quick identity dump of a Idiomark personality')
  .action(whoami)

// Doctor command
program
  .command('doctor <file>')
  .description('Run health checks on a Idiomark file')
  .action(doctor)

// Clone command
program
  .command('clone <source>')
  .description('Clone personality from various sources (@user, github:user, URL)')
  .option('-g, --github', 'Include GitHub data')
  .option('-t, --twitter', 'Include Twitter data')
  .option('-o, --output <file>', 'Output file path')
  .option('-s, --sample-size <number>', 'Number of posts to analyze', '1000')
  .option('-v, --verbose', 'Verbose output')
  .action(clone)

// Diff command
program
  .command('diff <file1> <file2>')
  .description('Compare two Idiomark personalities side-by-side')
  .action(diff)

// Merge command
program
  .command('merge <files...>')
  .description('Merge multiple Idiomark personalities into one')
  .option('-w, --weights <numbers...>', 'Weights for each personality (equal if not specified)')
  .option('-o, --output <file>', 'Output file path', 'merged.idiomark')
  .action((files, options) => merge(files, options))

// Parse arguments
program.parse()
