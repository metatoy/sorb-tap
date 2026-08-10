// sources/bridge.js — token source over a running Sorb bridge.
//
// Speaks the bridge's PUBLIC read endpoints only: GET /tokens/resolved,
// GET /artifacts, GET /artifact?id=<storyId>, GET /health. Works against a
// local `sorb dev` (keyless) or a hosted bridge with a read-only `sorb_pk_`
// bearer. Read-only by construction — tap never POSTs.
//
// The snapshot is fetched once at startup (an MCP stdio server is short-lived
// and per-session); a `refresh()` is exposed for long-lived embedders.

import { normalizeResolved, buildComponents, unwrapArtifact, collectBindings } from '../sorbArtifacts.js'

const get = async (base, path, pk) => {
  const res = await fetch(new URL(path, base), {
    headers: pk ? { authorization: `Bearer ${pk}` } : {},
  })
  if (!res.ok) return { ok: false, status: res.status, data: null }
  return { ok: true, status: res.status, data: await res.json().catch(() => null) }
}

/**
 * @param {string} url  Bridge origin, e.g. http://127.0.0.1:7777
 * @param {{ pk?: string }} [opts] Read-only sorb_pk_ key for hosted bridges.
 * @returns {Promise<{ kind: 'bridge', tokens: Array<object>, components: Array<object>|null, url: string, errors: string[], refresh: () => Promise<void> }>}
 */
export const loadBridge = async (url, { pk } = {}) => {
  const source = { kind: 'bridge', tokens: [], components: null, url, errors: [], refresh: null }

  const load = async () => {
    const errors = []

    const health = await get(url, '/health', pk).catch((e) => ({ ok: false, status: 0, err: e }))
    if (!health.ok) {
      errors.push(
        health.status === 401 || health.status === 403
          ? `bridge auth failed (${health.status}) — hosted bridges need a read-only sorb_pk_ key (--pk)`
          : `bridge unreachable at ${url}${health.status ? ` (HTTP ${health.status})` : ''}`,
      )
      source.tokens = []
      source.components = null
      source.errors = errors
      return
    }

    const resolved = await get(url, '/tokens/resolved', pk).catch(() => ({ ok: false, status: 0, data: null }))
    if (!resolved.ok) {
      // /health is open in all bridge modes — auth failures surface here.
      errors.push(
        resolved.status === 401 || resolved.status === 403
          ? `bridge auth failed (${resolved.status}) — hosted bridges need a read-only sorb_pk_ key (--pk)`
          : 'bridge has no resolved token map yet (run `sorb-seed resolve` in the project)',
      )
    }
    source.tokens = normalizeResolved(resolved.data)

    const index = await get(url, '/artifacts', pk).catch(() => ({ ok: false, data: null }))
    if (index.ok && index.data && index.data.stories) {
      // Fetch each story's artifact up front; the per-story reader then answers
      // from this cache (buildComponents' reader contract is synchronous).
      const blobs = new Map()
      await Promise.all(
        Object.keys(index.data.stories).map(async (id) => {
          const art = await get(url, `/artifact?id=${encodeURIComponent(id)}`, pk).catch(() => null)
          if (art && art.ok) blobs.set(id, art.data)
        }),
      )
      source.components = buildComponents(index.data, (id) => blobs.get(id) ?? null)
    } else {
      source.components = null // capability-msg mode: no captures on this bridge
    }
    source.errors = errors
  }

  source.refresh = load
  await load()
  return source
}

export { unwrapArtifact, collectBindings } // re-export for embedders/tests
