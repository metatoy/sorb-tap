import test from 'node:test'
import assert from 'node:assert/strict'
import { loadDtcgFiles } from '../src/sources/dtcgFiles.js'
import { runTool, TOOL_DEFS } from '../src/tools.js'

const src = loadDtcgFiles([new URL('../examples/acme-tokens.json', import.meta.url).pathname])

test('tool defs are well-formed', () => {
  assert.equal(TOOL_DEFS.length, 6)
  for (const d of TOOL_DEFS) {
    assert.ok(d.name && d.description && d.inputSchema)
    assert.equal(d.inputSchema.type, 'object')
  }
})

test('list_tokens filters by tier, type, q', () => {
  assert.ok(runTool(src, 'list_tokens').count >= 10)
  assert.ok(runTool(src, 'list_tokens', { tier: 'semantic' }).tokens.every((t) => t.tier === 'semantic'))
  assert.ok(runTool(src, 'list_tokens', { type: 'dimension' }).tokens.every((t) => t.type === 'dimension'))
  const q = runTool(src, 'list_tokens', { q: 'brand' })
  assert.ok(q.count >= 2 && q.tokens.every((t) => t.id.includes('brand')))
})

test('get_token accepts dot ids and CSS variables', () => {
  assert.equal(runTool(src, 'get_token', { id: 'semantic.brand.primary' }).token.value, '#3b82f6')
  assert.equal(runTool(src, 'get_token', { id: '--semantic-brand-primary' }).token.value, '#3b82f6')
  assert.match(runTool(src, 'get_token', { id: 'nope' }).error, /not found/)
})

test('resolve_token shows the alias chain', () => {
  const r = runTool(src, 'resolve_token', { id: 'component.button.bg' })
  assert.equal(r.value, '#3b82f6')
  assert.deepEqual(r.chain, ['semantic.brand.primary', 'primitive.blue.500'])
})

test('component tools report capability honestly in bare-DTCG mode', () => {
  assert.match(runTool(src, 'list_components').capability, /bare DTCG/)
  assert.match(runTool(src, 'get_component_bindings', { component: 'Button' }).capability, /bridge/)
})
