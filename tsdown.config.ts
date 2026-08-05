import { defineConfig } from 'tsdown'

export default defineConfig({
  // One entry per `exports` subpath, keyed by its path under `dist` so the two
  // stay one-to-one (SPEC §12). §3's map is hand-written, so this list and that
  // map are kept in step by hand — `publint` fails CI if they ever disagree.
  entry: {
    'index': 'src/index.ts',
    'cli': 'src/cli.ts',
    'presets/taze': 'src/presets/taze.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  dts: true,
  clean: true,
  // SPEC §3: ESM-only, `.mjs` output. `.d.mts` is the declaration file Node's
  // ESM resolution looks for next to a `.mjs` entry, so the exports map can stay
  // a plain string path with no `types` condition.
  outExtensions: () => ({ js: '.mjs', dts: '.d.mts' }),
})
