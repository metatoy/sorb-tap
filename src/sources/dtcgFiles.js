// sources/dtcgFiles.js — token source over bare DTCG JSON file(s).
//
// The zero-Sorb entry path: `sorb-tap --tokens tokens/*.json`. Each file is
// parsed independently; when a filename stem matches the Sorb tier vocabulary
// (primitive/semantic/component — the sorb-seed convention), that stem
// overrides the in-document tier heuristic. Aliases resolve across ALL loaded
// files (one merged document), matching how Style Dictionary treats sets.

import { readFileSync } from 'fs'
import { basename, extname } from 'path'
import { TIERS } from '@sorb/core'
import { parseDtcg } from '../dtcg.js'

/**
 * @param {string[]} files Absolute/relative paths to DTCG JSON files.
 * @returns {{ kind: 'dtcg', tokens: import('../dtcg.js').TapToken[], files: string[], errors: string[] }}
 */
export const loadDtcgFiles = (files) => {
  const merged = {}
  const tierByTop = new Map()
  const errors = []
  for (const file of files) {
    let doc
    try {
      doc = JSON.parse(readFileSync(file, 'utf-8'))
    } catch (e) {
      errors.push(`${file}: ${e.message}`)
      continue
    }
    if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
      errors.push(`${file}: not a DTCG object document`)
      continue
    }
    const stem = basename(file, extname(file)).toLowerCase()
    for (const [key, val] of Object.entries(doc)) {
      if (key.startsWith('$')) continue
      merged[key] = val
      if (TIERS.includes(stem)) tierByTop.set(key, stem)
    }
  }
  const tokens = parseDtcg(merged).map((t) => {
    const fileTier = tierByTop.get(t.id.split('.')[0])
    return fileTier && !t.tier ? { ...t, tier: fileTier } : t
  })
  return { kind: 'dtcg', tokens, files, errors }
}
