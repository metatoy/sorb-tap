import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { loadSorbDir } from '../src/sources/sorbDir.js'
import { runTool } from '../src/tools.js'

const FIXTURE = fileURLToPath(new URL('./fixtures/acme-app', import.meta.url))
const src = loadSorbDir(FIXTURE)

test('loads the resolved map from .sorb/resolved.json', () => {
  assert.equal(src.kind, 'sorb-dir')
  assert.equal(src.tokens.length, 4)
  assert.equal(runTool(src, 'get_token', { id: 'semantic.brand.primary' }).token.value, '#3b82f6')
  assert.ok(runTool(src, 'list_tokens', { tier: 'component' }).count >= 1)
})

test('builds components from the index + artifacts (all three wrapper shapes)', () => {
  const list = runTool(src, 'list_components')
  assert.ok(list.components.includes('Button'))
  assert.ok(list.components.includes('Card'))
  const btn = runTool(src, 'get_component_bindings', { component: 'Button' })
  // story-wrapper artifact: root fill + deeper child padding, merged flat
  assert.deepEqual(btn.bindings, { fill: 'component.button.bg', padding: 'primitive.space.md' })
  const card = runTool(src, 'get_component_bindings', { component: 'Card' })
  assert.deepEqual(card.bindings, { fill: 'semantic.surface' }) // root-wrapper artifact
})

test('find_token_usage reverse-indexes bindings, accepting CSS vars', () => {
  const usage = runTool(src, 'find_token_usage', { id: '--component-button-bg' })
  assert.equal(usage.count, 1)
  assert.deepEqual(usage.usage[0], { component: 'Button', roles: ['fill'] })
})

test('path-traversal artifact entries are skipped with an error, not read', () => {
  assert.ok(src.errors.some((e) => e.includes('escaped project dir')))
  const escaped = runTool(src, 'get_component_bindings', { component: 'Escaped' })
  assert.deepEqual(escaped.bindings, {}) // present in index, artifact refused
})

test('a dir with no .sorb yields empty tokens + an actionable error', () => {
  const empty = loadSorbDir(fileURLToPath(new URL('./fixtures', import.meta.url)))
  assert.equal(empty.tokens.length, 0)
  assert.ok(empty.errors.some((e) => e.includes('sorb-seed resolve')))
})
