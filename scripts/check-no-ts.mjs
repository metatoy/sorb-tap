// Guard: @sorb/tap is JavaScript-only (the Sorb-wide hard rule; JSDoc types).
// Fails the build/test if TypeScript sources or deps sneak in.
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const offenders = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|tsx|mts|cts)$/.test(name)) offenders.push(p)
  }
}
walk('.')
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
for (const deps of [pkg.dependencies, pkg.devDependencies]) {
  for (const name of Object.keys(deps ?? {})) {
    if (name === 'typescript' || name.startsWith('@types/')) offenders.push(`package.json dep: ${name}`)
  }
}
if (offenders.length) {
  console.error('✗ TypeScript is not allowed in @sorb/tap (JS + JSDoc only):')
  for (const o of offenders) console.error('  -', o)
  process.exit(1)
}
console.log('✓ no TypeScript sources or deps')
