import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadBridge } from '../src/sources/bridge.js'
import { runTool } from '../src/tools.js'

const fixture = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/acme-app/.sorb/${p}`, import.meta.url)), 'utf-8'))

// A stub bridge speaking the four public read endpoints, with optional auth.
const startStubBridge = async ({ requireKey = null } = {}) => {
  const resolved = fixture('resolved.json')
  const index = { stories: { Button: { artifact: '.sorb/Button.sorb.json' }, Card: { artifact: '.sorb/Card.sorb.json' } } }
  const artifacts = { Button: fixture('Button.sorb.json'), Card: fixture('Card.sorb.json') }
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (requireKey && req.headers.authorization !== `Bearer ${requireKey}` && url.pathname !== '/health') {
      res.writeHead(401).end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
    const json = (o, code = 200) => res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify(o))
    if (url.pathname === '/health') json({ ok: true })
    else if (url.pathname === '/tokens/resolved') json(resolved)
    else if (url.pathname === '/artifacts') json(index)
    else if (url.pathname === '/artifact') {
      const art = artifacts[url.searchParams.get('id')]
      art ? json(art) : json({ error: 'not found' }, 404)
    } else json({ error: 'not found' }, 404)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { server, url: `http://127.0.0.1:${server.address().port}` }
}

test('bridge source loads tokens + components over HTTP', async () => {
  const { server, url } = await startStubBridge()
  try {
    const src = await loadBridge(url)
    assert.equal(src.kind, 'bridge')
    assert.equal(src.errors.length, 0)
    assert.equal(src.tokens.length, 4)
    assert.deepEqual(runTool(src, 'get_component_bindings', { component: 'Button' }).bindings, {
      fill: 'component.button.bg',
      padding: 'primitive.space.md',
    })
  } finally {
    server.close()
  }
})

test('hosted-style auth: 401 without key, works with --pk', async () => {
  const { server, url } = await startStubBridge({ requireKey: 'sorb_pk_test' })
  try {
    const noKey = await loadBridge(url)
    assert.ok(noKey.errors.some((e) => e.includes('sorb_pk_')))
    const withKey = await loadBridge(url, { pk: 'sorb_pk_test' })
    assert.equal(withKey.errors.length, 0)
    assert.equal(withKey.tokens.length, 4)
  } finally {
    server.close()
  }
})

test('unreachable bridge reports cleanly, never throws', async () => {
  const src = await loadBridge('http://127.0.0.1:9')
  assert.ok(src.errors.some((e) => e.includes('unreachable')))
  assert.equal(src.tokens.length, 0)
  assert.match(runTool(src, 'list_components').capability ?? '', /bridge|DTCG/)
})
