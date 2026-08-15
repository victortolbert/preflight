import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { init, parse } from 'es-module-lexer'
import { describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import preflightCommitlint from '../src/presets/commitlint'
import preflightSecurityHeaders from '../src/presets/security-headers'
import preflightTaze from '../src/presets/taze'
import preflightVueA11y from '../src/presets/vue-a11y'
import { MANAGED_FILES } from '../src/templates'

const run = promisify(execFile)

const repoRoot = new URL('../', import.meta.url)
const resolve = (path: string) => fileURLToPath(new URL(path, repoRoot))

/** The source module each preset subpath should have been built from. */
const presetSources: Record<string, object> = {
  './commitlint': preflightCommitlint,
  './security-headers': preflightSecurityHeaders,
  './taze': preflightTaze,
  './vue-a11y': preflightVueA11y,
}

/** Built subpaths checked some other way — the root exports functions, not data. */
const nonPresetEntries = ['.']

/** The one field this file reads out of `npm pack --json`. */
interface PackResult { files: { path: string }[] }

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

  it('ships every template in the published tarball', async () => {
    // The one place a dotfile is at risk. `.nvmrc` resolves locally whether or
    // not it packs, so nothing else here would notice it going missing — and a
    // template absent from the tarball is SPEC §12's characteristic first-publish
    // failure, arriving as a crash in `preflight sync` rather than at build time.
    const { stdout } = await run(
      'npm',
      ['pack', '--dry-run', '--json', '--ignore-scripts'],
      { cwd: fileURLToPath(repoRoot) },
    )

    // `npm pack --json` changed shape in npm 12: it used to emit an array of
    // results and now emits an object keyed by package name. Accept both. This
    // is not defensiveness for its own sake — the array form already fails on
    // npm 12.0.2, and CI stayed green only because its bundled npm is older, so
    // the check was one runner-image bump from breaking with no code change.
    const parsed = JSON.parse(stdout) as PackResult[] | Record<string, PackResult>
    const [result] = Array.isArray(parsed) ? parsed : Object.values(parsed)

    // A third shape would mean npm changed the contract again, and every
    // assertion below would vacuously pass against an empty list. Fail loudly.
    if (!result)
      throw new Error(`\`npm pack --json\` returned an unrecognised shape: ${stdout.slice(0, 200)}`)

    const packed: string[] = result.files.map(f => f.path)

    for (const file of MANAGED_FILES)
      expect(packed).toContain(`templates/${file}`)
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
