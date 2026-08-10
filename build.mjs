import { build } from 'esbuild'
import { chmodSync } from 'fs'

// @sorb/tap is a small Node CLI + library. Deps stay external (the package's
// own node_modules provides them — @modelcontextprotocol/sdk is ESM, so the
// bundle format is ESM too). JS only, per the Sorb-wide hard rule.
const base = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  packages: 'external',
}

await build({ ...base, entryPoints: ['src/index.js'], outfile: 'dist/index.js' })
await build({ ...base, entryPoints: ['src/cli.js'], outfile: 'dist/cli.js' })
chmodSync('dist/cli.js', 0o755)
console.log('✓ built dist/index.js + dist/cli.js')
