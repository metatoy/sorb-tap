// sorbArtifacts.js — shared normalization for Sorb capture artifacts, used by
// both the .sorb/-directory source and the bridge source.
//
// Fresh implementation of the PUBLIC read-model contract (the shapes
// @sorb/juice's `sorbData.js` reads on main — resolved map, story index, and
// the three accepted artifact wrappers). Deliberately no code from any gated
// branch. Defensive throughout: malformed input → empty results, never throws.

/**
 * Normalize a resolved-map blob (`.sorb/resolved.json` or GET /tokens/resolved):
 * a bare array or `{ tokens: [...] }` of ResolvedToken records
 * (`{ id, cssVar, value, tier, type, … }`).
 * @returns {Array<object>}
 */
export const normalizeResolved = (data) => {
  if (!data) return []
  const arr = Array.isArray(data) ? data : data.tokens
  if (!Array.isArray(arr)) return []
  return arr
    .filter((t) => t && typeof t === 'object' && typeof t.id === 'string')
    .map((t) => ({
      id: t.id,
      cssVar: t.cssVar ?? `--${t.id.split('.').join('-')}`,
      value: t.value,
      raw: t.value,
      type: t.type ?? null,
      tier: t.tier ?? null,
      chain: [],
    }))
}

/**
 * Unwrap an artifact blob to its LayerNode root(s): a bare node, `{ root }`,
 * or `{ stories: [{ root }] }`. Unknown shapes → empty (tap is a reader; the
 * loud-failure policy belongs to the writer side).
 * @returns {Array<object>} roots
 */
export const unwrapArtifact = (data) => {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.stories)) {
    return data.stories.map((s) => s && s.root).filter(Boolean)
  }
  if (data.root && typeof data.root === 'object') return [data.root]
  if (data.type || data.name || data.sorb || Array.isArray(data.children)) return [data]
  return []
}

/**
 * Merge every node's `sorb.tokens` bindings across all roots into one flat
 * `{ role: tokenId }` object — depth-first, later nodes win per role (the
 * public merge contract).
 */
export const collectBindings = (roots) => {
  /** @type {Record<string, string>} */
  const bindings = {}
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    const tokens = node.sorb && node.sorb.tokens
    if (tokens && typeof tokens === 'object') {
      for (const [role, tokenId] of Object.entries(tokens)) {
        if (typeof tokenId === 'string') bindings[role] = tokenId
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk)
  }
  roots.forEach(walk)
  return bindings
}

/**
 * Build the components list for a tap source from a story index + an artifact
 * reader. `readArtifact(storyId)` returns the raw blob or null.
 * @param {object|null} index `{ stories: { id: { artifact } } }`
 * @param {(storyId: string) => object|null} readArtifact
 * @returns {Array<{ id: string, name: string, bindings: Record<string,string> }>}
 */
export const buildComponents = (index, readArtifact) => {
  const stories = index && index.stories
  if (!stories || typeof stories !== 'object') return []
  return Object.keys(stories).map((id) => {
    const roots = unwrapArtifact(readArtifact(id))
    return { id, name: id, bindings: collectBindings(roots) }
  })
}
