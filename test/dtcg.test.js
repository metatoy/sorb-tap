import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDtcg } from '../src/dtcg.js'
import { loadDtcgFiles } from '../src/sources/dtcgFiles.js'

test('parses values, inherits $type, derives cssVar', () => {
  const tokens = parseDtcg({
    color: { $type: 'color', brand: { primary: { $value: '#f26722' } } },
  })
  assert.equal(tokens.length, 1)
  const t = tokens[0]
  assert.equal(t.id, 'color.brand.primary')
  assert.equal(t.cssVar, '--color-brand-primary')
  assert.equal(t.value, '#f26722')
  assert.equal(t.type, 'color')
  assert.equal(t.tier, null)
})

test('resolves alias chains and records them', () => {
  const tokens = parseDtcg({
    primitive: { blue: { $type: 'color', $value: '#00f' } },
    semantic: { brand: { $value: '{primitive.blue}' } },
    component: { btn: { $value: '{semantic.brand}' } },
  })
  const btn = tokens.find((t) => t.id === 'component.btn')
  assert.equal(btn.value, '#00f')
  assert.deepEqual(btn.chain, ['semantic.brand', 'primitive.blue'])
  assert.equal(btn.tier, 'component')
})

test('flags unresolved aliases and cycles without throwing', () => {
  const tokens = parseDtcg({
    a: { $value: '{missing.token}' },
    b: { $value: '{c}' },
    c: { $value: '{b}' },
  })
  assert.match(tokens.find((t) => t.id === 'a').error, /unresolved-alias/)
  assert.match(tokens.find((t) => t.id === 'b').error, /alias-cycle/)
})

test('example set loads with zero errors and full tier coverage', () => {
  const src = loadDtcgFiles([new URL('../examples/acme-tokens.json', import.meta.url).pathname])
  assert.equal(src.errors.length, 0)
  assert.ok(src.tokens.length >= 10)
  assert.ok(src.tokens.every((t) => !t.error))
  for (const tier of ['primitive', 'semantic', 'component'])
    assert.ok(src.tokens.some((t) => t.tier === tier), tier)
})
