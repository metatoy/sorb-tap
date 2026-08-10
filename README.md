# @sorb/tap

**An MCP server for design tokens.** Point AI agents at your design system —
a [DTCG](https://design-tokens.github.io/community-group/format/) token file, a
[Sorb™](https://www.sorbcloud.com) project, or a running Sorb bridge — and they
can list, inspect, resolve, and trace tokens through real alias chains and real
component bindings. Read-only by design.

![demo: Claude resolving a token through its alias chain](docs/demo.gif)

Part of the Sorb tree — **Seed** captures · **Juice** bridges · **Leaf** renders ·
**Canopy** designs · **Tap** is how agents draw from it.

## Quickstart (60 seconds)

```sh
# Claude Code — against the bundled example set:
claude mcp add sorb-tap -- npx -y @sorb/tap --tokens node_modules/@sorb/tap/examples/acme-tokens.json

# …or your own DTCG file(s):
claude mcp add sorb-tap -- npx -y @sorb/tap --tokens tokens.json
```

Then ask: *"What's the button background token, and where does it come from?"*

## Sources

| flag | serves |
|---|---|
| `--tokens <file.json> …` | bare DTCG token file(s) — **no Sorb required** |
| `--dir <project>` | a Sorb project: `.sorb/resolved.json` + capture artifacts |
| `--bridge <url> [--pk <key>]` | a running Sorb bridge (`sorb dev`); hosted bridges — e.g. `bridge.sorbcloud.com` — work with a read-only `sorb_pk_` key from your workspace |

No flags: auto-detects `.sorb/` in the cwd, else `tokens/*.json`.
Env: `SORB_TAP_BRIDGE`, `SORB_TAP_PK`.

## Tools (all read-only)

- **`list_tokens`** `(tier?, type?, q?)` — ids, CSS variables, resolved values
- **`get_token`** `(id)` — one token, raw + resolved, by dot-id or `--css-var`
- **`resolve_token`** `(id)` — final value **with the alias chain that produced it**
- **`list_components`** — captured components/stories
- **`get_component_bindings`** `(component)` — role → token map (`fill`/`stroke`/…)
- **`find_token_usage`** `(id)` — reverse index: which components bind a token

Plus one resource, `sorb-tap://tokens` — the full resolved map as JSON.

Component tools need Sorb capture artifacts (`sorb-seed capture`) or a bridge;
in bare-DTCG mode they say so instead of returning silent emptiness.

## LangChain

A runnable example agent lives in
[`examples/langchain-client`](examples/langchain-client) — the same six tools
loaded through `@langchain/mcp-adapters` into a LangChain (LangGraph) agent.

## Limitations

- **Read-only.** No tool writes, proposes, or applies changes — by design.
- The DTCG reader resolves `$value`/`$type`/`{alias}` references only: no
  Style Dictionary transforms, no math expressions, no modes/theming — for
  those, run the file through your build and point tap at the output (or at a
  Sorb project, where `.sorb/resolved.json` is the built map).
- Bridge mode snapshots at startup; restart (or call `refresh()` when
  embedding) to pick up new captures.
- Component bindings come from Sorb captures — bare DTCG files have none.

## Programmatic use

```js
import { loadDtcgFiles, runTool } from '@sorb/tap'
const source = loadDtcgFiles(['tokens.json'])
runTool(source, 'resolve_token', { id: 'component.button.bg' })
// → { id, cssVar, value: '#3b82f6', chain: ['semantic.brand.primary', …] }
```

## Development

```sh
npm install && npm test    # node:test, 17 cases, incl. a stub bridge
npm run build              # esbuild → dist/ (JS only — no TypeScript, ever)
```

Roadmap: authenticated write tools (propose/apply) may arrive later via Sorb
Cloud; the read surface here stays free and open.

MIT © Metatoy LLC · Sorb™ is a trademark of Metatoy LLC.
Works with Figma. Not affiliated with, or endorsed by, Figma. Figma is a
trademark of Figma, Inc.
