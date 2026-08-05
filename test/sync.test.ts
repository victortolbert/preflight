import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hashContents, LOCK_FILE, readLock } from '../src/lock'
import { applySync, pendingChanges, planSync } from '../src/sync'
import { MANAGED_FILES, readTemplate } from '../src/templates'
import { project } from './support/project'

const outcomes = async (root: string) =>
  Object.fromEntries((await planSync(root)).map(({ file, outcome }) => [file, outcome]))

describe('planSync', () => {
  it('plans to create every managed file in an untouched project', async () => {
    const root = await project()

    const plan = await planSync(root)

    expect(plan.map(({ file }) => file)).toEqual([...MANAGED_FILES])
    expect(plan.every(({ outcome }) => outcome === 'create')).toBe(true)
  })

  it('carries what the project has now and what Preflight would write', async () => {
    const root = await project({ '.nvmrc': '22\n' })

    const planned = (await planSync(root)).find(({ file }) => file === '.nvmrc')

    expect(planned).toMatchObject({
      outcome: 'update',
      current: '22\n',
      next: await readTemplate('.nvmrc'),
    })
  })

  it('reports a file already matching the template as unchanged', async () => {
    const root = await project({ '.nvmrc': await readTemplate('.nvmrc') })

    await expect(outcomes(root)).resolves.toMatchObject({ '.nvmrc': 'unchanged' })
  })

  it('reports a file the project declared unmanaged, without reading a template over it', async () => {
    const root = await project({
      '.nvmrc': '22\n',
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
    })

    await expect(outcomes(root)).resolves.toMatchObject({
      '.nvmrc': 'unmanaged',
      'axe-linter.yml': 'create',
    })
  })
})

describe('pendingChanges', () => {
  it('selects only the files a sync would actually write', async () => {
    const root = await project({
      '.nvmrc': await readTemplate('.nvmrc'),
      'preflight.config.ts': `export default { unmanaged: ['axe-linter.yml'] }\n`,
    })

    expect(pendingChanges(await planSync(root))).toEqual([])
  })
})

describe('applySync', () => {
  it('writes every managed file and records a hash per file', async () => {
    const root = await project()

    await applySync(root, await planSync(root))

    for (const file of MANAGED_FILES)
      expect(await readFile(join(root, file), 'utf8')).toBe(await readTemplate(file))

    const lock = await readLock(root)
    expect(lock?.files['.nvmrc']).toEqual({ computedHash: hashContents(await readTemplate('.nvmrc')) })
  })

  it('neither writes nor records a file the project declared unmanaged', async () => {
    const root = await project({
      '.nvmrc': '22\n',
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
    })

    await applySync(root, await planSync(root))

    expect(await readFile(join(root, '.nvmrc'), 'utf8')).toBe('22\n')
    expect(Object.keys((await readLock(root))!.files)).toEqual(['axe-linter.yml'])
  })

  it('is a no-op the second time', async () => {
    const root = await project()
    await applySync(root, await planSync(root))
    const lockAfterFirst = await readFile(join(root, LOCK_FILE), 'utf8')

    const second = await planSync(root)

    expect(pendingChanges(second)).toEqual([])
    await applySync(root, second)
    expect(await readFile(join(root, LOCK_FILE), 'utf8')).toBe(lockAfterFirst)
  })

  it('drops a file from the lock once the project declares it unmanaged', async () => {
    // The opt-out is a decision taken after adoption as often as before it, and
    // a stale lock entry would leave `check` with a hash for a file it no longer
    // has any business looking at.
    const root = await project()
    await applySync(root, await planSync(root))

    await writeFile(join(root, 'preflight.config.ts'), `export default { unmanaged: ['.nvmrc'] }\n`)
    await applySync(root, await planSync(root))

    expect(Object.keys((await readLock(root))!.files)).toEqual(['axe-linter.yml'])
  })
})
