/**
 * @catchdrift/cli — main router
 * Dispatches to init, check, or status based on argv[0]
 */

import pc from 'picocolors'

const VERSION = '0.1.0'

const HELP = `
${pc.bold(pc.blue('catchdrift'))} — Design system compliance for teams shipping with AI

${pc.bold('Usage:')}
  npx catchdrift init              Install Drift into your React project
  npx catchdrift sync              Auto-discover DS components from dsPackages
  npx catchdrift check             Run headless drift scan (requires running app)
  npx catchdrift status            Show DS coverage snapshot from config
  npx catchdrift spec              List all .drift-spec.md files
  npx catchdrift spec validate     Validate specs against implementation
  npx catchdrift spec show <file>  Show parsed spec details

${pc.bold('Options:')}
  --help, -h      Show this help
  --version, -v   Show version

${pc.bold('Examples:')}
  npx catchdrift init
  npx catchdrift sync
  npx catchdrift check --url http://localhost:5173 --threshold 80
  npx catchdrift status
  npx catchdrift spec validate

${pc.dim('Docs: https://catchdrift.ai  ·  GitHub: https://github.com/dyoon92/design-drift')}
`

export async function run(argv) {
  const cmd = argv[0]

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(HELP)
    process.exit(0)
  }

  if (cmd === '--version' || cmd === '-v') {
    console.log(VERSION)
    process.exit(0)
  }

  if (cmd === 'init') {
    const { init } = await import('./commands/init.mjs')
    await init(argv.slice(1))
    return
  }

  if (cmd === 'sync') {
    const { sync } = await import('./commands/sync.mjs')
    await sync(argv.slice(1))
    return
  }

  if (cmd === 'check') {
    const { check } = await import('./commands/check.mjs')
    await check(argv.slice(1))
    return
  }

  if (cmd === 'status') {
    const { status } = await import('./commands/status.mjs')
    await status(argv.slice(1))
    return
  }

  if (cmd === 'spec') {
    const { spec } = await import('./commands/spec.mjs')
    await spec(argv.slice(1))
    return
  }

  console.error(pc.red(`Unknown command: ${cmd}`))
  console.log(`Run ${pc.bold('npx catchdrift --help')} for usage.`)
  process.exit(1)
}
