import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCK_FILE } from '../src/lock'
import { MANAGED_FILES, readTemplate } from '../src/templates'
import { preflight } from './support/cli'
import { project } from './support/project'

describe('preflight sync', () => {
  it('writes every managed file and a lock recording each one', async () => {
    const root = await project()

    const { code } = await preflight(['sync', '--yes'], root)

    expect(code).toBe(0)
    for (const file of MANAGED_FILES)
      expect(await readFile(join(root, file), 'utf8')).toBe(await readTemplate(file))

    const lock = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    expect(lock).toMatchObject({ version: 1 })
    expect(Object.keys(lock.files)).toEqual([...MANAGED_FILES])
  })

  it('shows a diff of every pending change before writing anything', async () => {
    const root = await project({ '.nvmrc': 'nonsense\n' })

    const { stdout } = await preflight(['sync', '--yes'], root)

    expect(stdout).toContain('.nvmrc')
    expect(stdout).toContain('axe-linter.yml')

    // Derived from the template, not written down here — the diff has to show
    // what Preflight would actually write, and a hardcoded expectation would
    // only be asserting that someone remembered to update this test too.
    expect(stdout).toContain('-nonsense')
    for (const line of (await readTemplate('.nvmrc')).trim().split('\n'))
      expect(stdout).toContain(`+${line}`)
  })

  it('writes nothing without confirmation', async () => {
    // No `--yes`, and `execFile` gives the child no TTY — the same position a CI
    // job or a piped shell is in. SPEC §5 rejected silent writes on trust
    // grounds, so the safe direction here is to refuse rather than assume.
    const root = await project()

    const { code } = await preflight(['sync'], root)

    expect(code).not.toBe(0)
    await expect(readFile(join(root, '.nvmrc'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(root, LOCK_FILE), 'utf8')).rejects.toThrow()
  })

  it('leaves a file the project declared unmanaged alone', async () => {
    const root = await project({
      '.nvmrc': '22\n',
      'preflight.config.ts': `export default { unmanaged: ['.nvmrc'] }\n`,
    })

    await preflight(['sync', '--yes'], root)

    expect(await readFile(join(root, '.nvmrc'), 'utf8')).toBe('22\n')
    const lock = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    expect(Object.keys(lock.files)).toEqual(MANAGED_FILES.filter(file => file !== '.nvmrc'))
  })

  it('is a no-op the second time', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)
    const lock = await readFile(join(root, LOCK_FILE), 'utf8')

    const { code, stdout } = await preflight(['sync', '--yes'], root)

    expect(code).toBe(0)
    expect(await readFile(join(root, LOCK_FILE), 'utf8')).toBe(lock)
    expect(stdout).toMatch(/up to date|nothing to do|no changes/i)
  })

  it('records the lock even when every managed file already matches', async () => {
    // SPEC §2's adoption story: all four files were byte-identical across both
    // consumers, so "nothing to write" is the *primary* path, not an edge case.
    // No lock would leave `preflight check` with nothing to compare against.
    const root = await project(Object.fromEntries(
      await Promise.all(MANAGED_FILES.map(async file => [file, await readTemplate(file)] as const)),
    ))

    const { code } = await preflight(['sync', '--yes'], root)

    expect(code).toBe(0)
    const lock = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    expect(Object.keys(lock.files)).toEqual([...MANAGED_FILES])
  })

  it('drops a file from the lock once the project declares it unmanaged', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)

    await writeFile(join(root, 'preflight.config.ts'), `export default { unmanaged: ['.nvmrc'] }\n`)
    await preflight(['sync', '--yes'], root)

    const lock = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    expect(Object.keys(lock.files)).toEqual(MANAGED_FILES.filter(file => file !== '.nvmrc'))
  })

  it('regenerates a lock that cannot be read', async () => {
    // What `readLock`'s error tells the reader to do, so it had better be true.
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, LOCK_FILE), '{ not json', 'utf8')

    const { code } = await preflight(['sync', '--yes'], root)

    expect(code).toBe(0)
    expect(JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))).toMatchObject({ version: 1 })
  })
})
