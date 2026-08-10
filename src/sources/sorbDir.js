// sources/sorbDir.js — token source over a Sorb project directory (.sorb/).
//
// Reads what the seed pipeline writes: `.sorb/resolved.json` (token map) +
// `.sorb/index.json` (story index) + the per-story capture artifacts the index
// points at. Every artifact path from the index is path-confined: it must
// resolve INSIDE the project dir or the story is skipped (same traversal guard
// as the rest of the Sorb readers).

import { readFileSync } from 'fs'
import { resolve, sep } from 'path'
import { normalizeResolved, buildComponents } from '../sorbArtifacts.js'

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * @param {string} dir Project root (the dir holding `.sorb/`).
 * @returns {{ kind: 'sorb-dir', tokens: Array<object>, components: Array<object>|null, dir: string, errors: string[] }}
 */
export const loadSorbDir = (dir) => {
  const root = resolve(dir)
  const errors = []

  const resolvedBlob = readJson(resolve(root, '.sorb', 'resolved.json'))
  if (!resolvedBlob) errors.push('.sorb/resolved.json missing or malformed — run `sorb-seed resolve`')
  const tokens = normalizeResolved(resolvedBlob)

  const index = readJson(resolve(root, '.sorb', 'index.json'))
  const readArtifact = (storyId) => {
    const entry = index && index.stories && index.stories[storyId]
    if (!entry || !entry.artifact) return null
    const artPath = resolve(root, entry.artifact)
    if (artPath !== root && !artPath.startsWith(root + sep)) {
      errors.push(`story "${storyId}": artifact path escaped project dir — skipped`)
      return null
    }
    return readJson(artPath)
  }
  // components stays null (capability-msg mode) when there is no index at all.
  const components = index ? buildComponents(index, readArtifact) : null

  return { kind: 'sorb-dir', tokens, components, dir: root, errors }
}
