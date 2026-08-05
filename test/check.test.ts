import type { ManagedFile } from '../src/index'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkProject, hasDrift } from '../src/check'
import { hashContents, LOCK_VERSION, writeLock } from '../src/lock'
import { applySync, planSync } from '../src/sync'
import { MANAGED_FILES, readTemplate } from '../src/templates'
import { project } from './support/project'

const sync = async (root: string) => applySync(root, await planSync(root))

const states = async (root: string) =>
  Object.fromEntries((await checkProject(root)).map(({ file, state }) => [file, state]))

/**
 * A project whose managed files are `overrides` (template contents otherwise),
 * with a lock recording exactly what is on disk.
 *
 * Every managed file is given a coherent state, not just the one under test —
 * otherwise the others sit in whatever state an empty lock leaves them, and they,
 * not the file being tested, decide the exit code.
 */
async function lockedProject(overrides: Partial<Record<ManagedFile, string>> = {}): Promise<string> {
  const contents = Object.fromEntries(await Promise.all(
    MANAGED_FILES.map(async file => [file, overrides[file] ?? await readTemplate(file)] as const),
  )) as Record<ManagedFile, string>

  const root = await project(contents)

  await writeLock(root, {
    version: LOCK_VERSION,
    files: Object.fromEntries(
      MANAGED_FILES.map(file => [file, { computedHash: hashContents(contents[file]) }]),
    ),
  })

  return root
}

describe('checkProject — SPEC §6\'s three states', () => {
  it('reports a freshly synced project as in sync', async () => {
    const root = await project()
    await sync(root)

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'in-sync' })
    expect(hasDrift(await checkProject(root))).toBe(false)
  })

  it('reports a local edit as drift', async () => {
    const root = await project()
    await sync(root)
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'drifted' })
    expect(hasDrift(await checkProject(root))).toBe(true)
  })

  it('reports an upstream move without calling it drift', async () => {
    // Local matches the lock; the lock no longer matches what Preflight ships.
    const root = await lockedProject({ '.nvmrc': '22\n' })

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'upstream-moved' })
    expect(hasDrift(await checkProject(root))).toBe(false)
  })
})

describe('checkProject — the state SPEC §6\'s table omits', () => {
  it('treats a file differing from both the lock and the package as drift', async () => {
    // Where a project lands when it edits a managed file and then upgrades.
    const root = await lockedProject({ '.nvmrc': '22\n' })
    await writeFile(join(root, '.nvmrc'), '20\n', 'utf8')

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'drifted' })
    expect(hasDrift(await checkProject(root))).toBe(true)
  })
})

describe('checkProject — no lock entry', () => {
  /** Every managed file present and matching, but nothing recorded in the lock. */
  const unrecordedProject = async (overrides: Partial<Record<ManagedFile, string>> = {}) => {
    const root = await lockedProject(overrides)
    await writeLock(root, { version: LOCK_VERSION, files: {} })
    return root
  }

  it('passes a file that already matches what Preflight ships, and says it is unrecorded', async () => {
    const root = await unrecordedProject()

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'unrecorded' })
    expect(hasDrift(await checkProject(root))).toBe(false)
  })

  it('fails a file that differs, because nothing declared that divergence', async () => {
    const root = await unrecordedProject({ '.nvmrc': '22\n' })

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'drifted' })
    expect(hasDrift(await checkProject(root))).toBe(true)
  })

  it('fails a project that never synced at all', async () => {
    // The managed files are absent, which is divergence from what Preflight
    // manages — so adding the CI step without ever running sync does not sit green.
    const root = await project()

    expect(hasDrift(await checkProject(root))).toBe(true)
  })
})

describe('checkProject — a missing managed file', () => {
  it('is drift when the lock says it was synced', async () => {
    const root = await project()
    await sync(root)
    await rm(join(root, '.nvmrc'))

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'drifted' })
    expect(hasDrift(await checkProject(root))).toBe(true)
  })
})

describe('checkProject — unmanaged', () => {
  it('skips a declared file entirely, however far it has diverged', async () => {
    const root = await project()
    await sync(root)
    await writeFile(join(root, '.nvmrc'), 'wildly different\n', 'utf8')
    await writeFile(join(root, 'preflight.config.ts'), `export default { unmanaged: ['.nvmrc'] }\n`)

    await expect(states(root)).resolves.toMatchObject({ '.nvmrc': 'unmanaged' })
    expect(hasDrift(await checkProject(root))).toBe(false)
  })
})
