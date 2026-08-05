import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadPreflightConfig } from '../src/config'

const projects: string[] = []

/**
 * A throwaway project directory containing `files`, keyed by path relative to
 * its root. SPEC §12: config loading is filesystem behaviour, so it is tested
 * against real directories — a mocked `fs` suite would verify the mocks.
 */
async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'preflight-'))
  projects.push(root)

  for (const [name, contents] of Object.entries(files)) {
    const path = join(root, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents, 'utf8')
  }

  return root
}

afterEach(async () => {
  await Promise.all(projects.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('loadPreflightConfig', () => {
  it('reads `unmanaged` from a project\'s preflight.config.ts', async () => {
    const root = await project({
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
    })

    await expect(loadPreflightConfig(root)).resolves.toEqual({ unmanaged: ['.nvmrc'] })
  })

  it('treats a missing config file as declaring nothing unmanaged', async () => {
    // Not an error — most projects will never write this file.
    const root = await project({})

    await expect(loadPreflightConfig(root)).resolves.toEqual({ unmanaged: [] })
  })

  it('treats a config that omits `unmanaged` as declaring nothing unmanaged', async () => {
    const root = await project({ 'preflight.config.ts': `export default {}\n` })

    await expect(loadPreflightConfig(root)).resolves.toEqual({ unmanaged: [] })
  })

  it('loads TypeScript that native type stripping would reject', async () => {
    // Node's strip-only mode throws on this. It is why the loader goes through
    // `unconfig` rather than a bare dynamic import.
    const root = await project({
      'preflight.config.ts': [
        `enum Managed { Nvmrc = '.nvmrc' }`,
        `export default { unmanaged: [Managed.Nvmrc] }`,
      ].join('\n'),
    })

    await expect(loadPreflightConfig(root)).resolves.toEqual({ unmanaged: ['.nvmrc'] })
  })

  it('loads a JavaScript config too', async () => {
    const root = await project({
      'preflight.config.mjs': `export default { unmanaged: ['axe-linter.yml'] }\n`,
    })

    await expect(loadPreflightConfig(root)).resolves.toEqual({ unmanaged: ['axe-linter.yml'] })
  })

  it('does not reach into a parent directory for a config', async () => {
    // The loader is given the directory to look in. Walking up would let an
    // unrelated ancestor config silently govern a project.
    const root = await project({
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
      'packages/app/.keep': '',
    })

    await expect(loadPreflightConfig(join(root, 'packages/app'))).resolves.toEqual({ unmanaged: [] })
  })

  it('accepts a relative directory, including "."', async () => {
    // The bound on the search is derived from the directory it is given, and
    // deriving it from `.` collapses to "search nothing". That fails in the
    // dangerous direction: it reads as an empty `unmanaged`, so `sync` would go
    // on to write a file the project had opted out of. `.` is also the most
    // likely thing a CLI hands a loader.
    const root = await project({
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
    })

    const original = process.cwd()
    process.chdir(root)

    try {
      await expect(loadPreflightConfig('.')).resolves.toEqual({ unmanaged: ['.nvmrc'] })
    }
    finally {
      process.chdir(original)
    }
  })
})
