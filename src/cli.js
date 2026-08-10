#!/usr/bin/env node
// cli.js — `sorb-tap`: pick a token source, serve MCP over stdio.
//
//   sorb-tap --tokens tokens/*.json     bare DTCG file(s), no Sorb needed
//   sorb-tap --dir .                    a Sorb project (.sorb/ artifacts)   [P1]
//   sorb-tap --bridge http://127.0.0.1:7777 [--pk sorb_pk_…]                [P1]
//
// With no flags: auto-detect — .sorb/ in cwd, else tokens/*.json in cwd.
// Diagnostics go to stderr only (stdout is the MCP transport).

import { existsSync, readFileSync } from 'fs'
import { readdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadDtcgFiles } from './sources/dtcgFiles.js'
import { loadSorbDir } from './sources/sorbDir.js'
import { loadBridge } from './sources/bridge.js'
import { serveStdio } from './server.js'

const readVersion = () => {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf-8'),
    )
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const parseArgs = (argv) => {
  const args = { tokens: [], dir: null, bridge: null, pk: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--tokens') args.tokens.push(argv[++i])
    else if (a === '--dir') args.dir = argv[++i]
    else if (a === '--bridge') args.bridge = argv[++i]
    else if (a === '--pk') args.pk = argv[++i]
    else if (a === '--help' || a === '-h') args.help = true
    else args.tokens.push(a) // bare positional = token file
  }
  if (!args.bridge && process.env.SORB_TAP_BRIDGE) args.bridge = process.env.SORB_TAP_BRIDGE
  return args
}

const HELP = `sorb-tap — MCP server for design tokens (read-only)

  sorb-tap --tokens <file.json> [more files…]   serve bare DTCG token file(s)
  sorb-tap --dir <project>                      serve a Sorb project (.sorb/ artifacts)
  sorb-tap --bridge <url> [--pk <key>]          serve a running Sorb bridge (read-only)

No flags: auto-detects .sorb/ in cwd, else tokens/*.json in cwd.
Env: SORB_TAP_BRIDGE (bridge URL) · SORB_TAP_PK (read-only key).
Add to Claude Code:  claude mcp add sorb-tap -- npx -y @sorb/tap --tokens tokens.json
`

export const main = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv.filter(Boolean))
  if (args.help) {
    process.stderr.write(HELP)
    return
  }

  let source = null
  if (args.bridge) {
    source = await loadBridge(args.bridge, { pk: args.pk ?? process.env.SORB_TAP_PK ?? undefined })
  } else if (args.dir) {
    source = loadSorbDir(args.dir)
  } else if (args.tokens.length) {
    source = loadDtcgFiles(args.tokens)
  } else if (existsSync(resolve('.sorb'))) {
    source = loadSorbDir('.')
  } else {
    const tokensDir = resolve('tokens')
    const files = existsSync(tokensDir)
      ? readdirSync(tokensDir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => join(tokensDir, f))
      : []
    if (!files.length) {
      process.stderr.write('sorb-tap: no token source found (pass --tokens, --dir, or --bridge)\n')
      process.exit(1)
    }
    source = loadDtcgFiles(files)
  }

  for (const e of source.errors) process.stderr.write(`sorb-tap: ${e}\n`)
  const what =
    source.kind === 'bridge' ? source.url : source.kind === 'sorb-dir' ? source.dir : `${source.files.length} file(s)`
  process.stderr.write(
    `sorb-tap: serving ${source.tokens.length} tokens (${source.kind}: ${what}) over stdio\n`,
  )
  await serveStdio(source, readVersion())
}

main().catch((e) => {
  process.stderr.write(`sorb-tap: fatal — ${e?.message ?? e}\n`)
  process.exit(1)
})
