// dtcg.js — minimal DTCG (Design Tokens Community Group) reader.
//
// Parses a DTCG JSON document into a flat resolved token map. Deliberately
// small: `$value` + `$type` + `{alias.path}` references only — no Style
// Dictionary transforms, no math, no modes (documented LIMITATION). A token
// group's top-level name maps onto the Sorb tier vocabulary when it matches
// (`primitive` / `semantic` / `component`), otherwise tier is null.
//
// Defensive like the rest of the Sorb readers: malformed input yields empty
// results or per-token `error` fields, never a throw from the public API.

import { TIERS } from '@sorb/core'

/**
 * @typedef {Object} TapToken
 * @property {string} id        Dot-path id, e.g. "color.brand.primary".
 * @property {string} cssVar    Derived CSS custom property, e.g. "--color-brand-primary".
 * @property {*} value          Fully alias-resolved value.
 * @property {*} raw            The authored `$value` (may be an alias string).
 * @property {string|null} type `$type` (inherited from ancestors per DTCG).
 * @property {string|null} tier Sorb tier when the top group name matches TIERS.
 * @property {string[]} chain   Alias chain walked to resolve, ids in order.
 * @property {string} [error]   "unresolved-alias: …" | "alias-cycle: …".
 */

const ALIAS_RE = /^\{([^}]+)\}$/

/** Walk a DTCG document into `{ id -> { raw, type } }` (unresolved). */
const collect = (node, path, inheritedType, out) => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return
  const type = typeof node.$type === 'string' ? node.$type : inheritedType
  if ('$value' in node) {
    out.set(path.join('.'), { raw: node.$value, type: type ?? null })
    return
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    collect(child, [...path, key], type, out)
  }
}

/**
 * Parse a DTCG document (already JSON.parsed) into resolved TapTokens.
 * @param {object} doc
 * @returns {TapToken[]}
 */
export const parseDtcg = (doc) => {
  /** @type {Map<string, {raw: *, type: string|null}>} */
  const flat = new Map()
  collect(doc, [], null, flat)

  const resolveOne = (id) => {
    const chain = []
    let cur = id
    const seen = new Set()
    for (;;) {
      if (seen.has(cur)) return { value: undefined, chain, error: `alias-cycle: ${cur}` }
      seen.add(cur)
      const entry = flat.get(cur)
      if (!entry) return { value: undefined, chain, error: `unresolved-alias: ${cur}` }
      const m = typeof entry.raw === 'string' && entry.raw.match(ALIAS_RE)
      if (!m) return { value: entry.raw, chain }
      chain.push(m[1])
      cur = m[1]
    }
  }

  return [...flat.entries()].map(([id, entry]) => {
    const { value, chain, error } = resolveOne(id)
    const top = id.split('.')[0]
    /** @type {TapToken} */
    const token = {
      id,
      cssVar: `--${id.split('.').join('-')}`,
      value,
      raw: entry.raw,
      type: entry.type,
      tier: TIERS.includes(top) ? top : null,
      chain,
    }
    if (error) token.error = error
    return token
  })
}
