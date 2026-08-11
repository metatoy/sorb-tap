# Changelog

All notable changes to `@sorb/tap` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres
to [Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.1.0] — 2026-08-10

First cut. Read-only by design.

### Added

- **MCP server over stdio** (`sorb-tap` bin) on `@modelcontextprotocol/sdk`.
- **Three token sources**, selected by flag:
  - `--tokens <file.json> …` — bare DTCG token file(s), no Sorb required;
  - `--dir <project>` — a Sorb project (`.sorb/resolved.json` + capture artifacts);
  - `--bridge <url> [--pk <key>]` — a running Sorb bridge, read-only key supported.
  - No flags: auto-detects `.sorb/` in the cwd, else `tokens/*.json`.
    Env: `SORB_TAP_BRIDGE`, `SORB_TAP_PK`.
- **Six read-only tools**: `list_tokens`, `get_token`, `resolve_token` (returns
  the alias chain that produced the value), `list_components`,
  `get_component_bindings`, `find_token_usage`. Token ids accepted as dot paths
  or CSS-variable form.
- **One resource**: `sorb-tap://tokens` — the full resolved token map as JSON.
- DTCG reader resolving `$value` / `$type` / `{alias}` references with chain
  tracking (no Style Dictionary transforms, math, or modes — documented).
- Honest capability messages: component tools in bare-DTCG mode say what would
  unlock them instead of returning silent emptiness.
- Programmatic API: `loadDtcgFiles` / `loadSorbDir` / `loadBridge` + `runTool`.
- LangChain example client (`examples/langchain-client`) via
  `@langchain/mcp-adapters`; example DTCG set (`examples/acme-tokens.json`).
- README with 60-second Claude Code quickstart + demo GIF, GitHub Actions CI,
  no-TypeScript guard (JS only), esbuild build, 17 `node:test` cases including
  a stub bridge.
