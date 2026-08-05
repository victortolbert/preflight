import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { init, parse } from 'es-module-lexer'
import { describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import preflightSkillsNpm from '../src/presets/skills-npm'
import preflightTaze from '../src/presets/taze'

const repoRoot = new URL('../', import.meta.url)
const resolve = (path: string) => fileURLToPath(new URL(path, repoRoot))

/** The source module each preset subpath should have been built from. */
const presetSources: Record<string, object> = {
  './taze': preflightTaze,
  './skills-npm': preflightSkillsNpm,
}

/** Built subpaths checked some other way — the root exports functions, not data. */
const nonPresetEntries = ['.']

/**
 * SPEC §12: the characteristic first-publish failure is not a logic bug — it is
 * a subpath that resolves locally and 404s from the registry, or an absent
 * `.d.ts`. `publint` and `attw` are the real gate; these are the fast local
 * version of the same question, and they run against a fresh `dist`.
 */
describe('packaging', () => {
  const subpaths = Object.entries(pkg.exports)
  const modules = subpaths.filter(([, target]) => target.endsWith('.mjs'))

  it.each(subpaths)('exports map entry %s points at a file that exists', (_subpath, target) => {
    expect(existsSync(resolve(target))).toBe(true)
  })

  it('ships a declaration file alongside every built entry', () => {
    expect(modules.length).toBeGreaterThan(0)
    for (const [, target] of modules)
      expect(existsSync(resolve(target.replace(/\.mjs$/, '.d.mts')))).toBe(true)
  })

  it('accounts for every built entry below', () => {
    // Keeps the checks that follow honest as later tickets add subpaths: a new
    // entry in the exports map fails here until it is accounted for, rather
    // than silently going unchecked.
    const accounted = [...Object.keys(presetSources), ...nonPresetEntries]

    expect(modules.map(([subpath]) => subpath).sort()).toEqual(accounted.sort())
  })

  it('exposes `definePreflightConfig` from the built root entry', async () => {
    // SPEC §3: the root export exists to type `preflight.config.ts`.
    const built = await import(resolve(pkg.exports['.']))

    expect(built.definePreflightConfig).toBeTypeOf('function')
  })

  it.each(Object.keys(presetSources))('builds %s to the value its source exports', async (subpath) => {
    const built = await import(resolve(pkg.exports[subpath as keyof typeof pkg.exports]))

    expect(built.default).toEqual(presetSources[subpath])
  })

  it.each(modules)('%s pulls in no peer dependency at runtime', async (_subpath, target) => {
    // Calling the tool's own `defineConfig` would make the peer dep a load-time
    // import of every consumer's config file. ADR-0004 says don't, and this is
    // what "don't" looks like in the emitted module.
    const code = await readFile(resolve(target), 'utf8')

    await init
    const [imports] = parse(code)

    expect(imports.map(specifier => specifier.n)).toEqual([])
  })
})
