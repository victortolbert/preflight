import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { init, parse } from 'es-module-lexer'
import { describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import preflightTaze from '../src/presets/taze'

const repoRoot = new URL('../', import.meta.url)
const resolve = (path: string) => fileURLToPath(new URL(path, repoRoot))

/**
 * SPEC §12: the characteristic first-publish failure is not a logic bug — it is
 * a subpath that resolves locally and 404s from the registry, or an absent
 * `.d.ts`. `publint` and `attw` are the real gate; these are the fast local
 * version of the same question, and they run against a fresh `dist`.
 */
describe('packaging', () => {
  const subpaths = Object.entries(pkg.exports)

  it.each(subpaths)('exports map entry %s points at a file that exists', (_subpath, target) => {
    expect(existsSync(resolve(target))).toBe(true)
  })

  it('ships a declaration file alongside every built entry', () => {
    const built = subpaths
      .map(([, target]) => target)
      .filter(target => target.endsWith('.mjs'))

    expect(built.length).toBeGreaterThan(0)
    for (const target of built)
      expect(existsSync(resolve(target.replace(/\.mjs$/, '.d.mts')))).toBe(true)
  })

  it('builds the taze preset to the value the source exports', async () => {
    const built = await import(resolve('./dist/presets/taze.mjs'))

    expect(built.default).toEqual(preflightTaze)
  })

  it('does not pull a peer dependency into the preset at runtime', async () => {
    // Calling taze's `defineConfig` would make the peer dep a load-time import
    // of every consumer's config file. ADR-0004 says don't, and this is what
    // "don't" looks like in the emitted module.
    const built = await readFile(resolve('./dist/presets/taze.mjs'), 'utf8')

    await init
    const [imports] = parse(built)

    expect(imports.map(specifier => specifier.n)).toEqual([])
  })
})
