import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hashContents, LOCK_FILE, writeLock } from '../src/lock'
import { preflight } from './support/cli'
import { project } from './support/project'

describe('preflight check', () => {
  it('passes a freshly synced project', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)

    const { code } = await preflight(['check'], root)

    expect(code).toBe(0)
  })

  it('fails once a managed file is edited, and names it', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')

    const { code, stdout, stderr } = await preflight(['check'], root)

    expect(code).not.toBe(0)
    expect(stdout + stderr).toContain('.nvmrc')
  })

  it('says what to do about the drift it found', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')

    const { stdout, stderr } = await preflight(['check'], root)

    expect(stdout + stderr).toMatch(/preflight sync/)
    expect(stdout + stderr).toMatch(/unmanaged/)
  })

  it('passes again once the drifted file is declared unmanaged', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')
    expect((await preflight(['check'], root)).code).not.toBe(0)

    await writeFile(join(root, 'preflight.config.ts'), `export default { unmanaged: ['.nvmrc'] }\n`)

    expect((await preflight(['check'], root)).code).toBe(0)
  })

  it('reports an upstream move without failing', async () => {
    // SPEC §6: news, not a violation. Failing here would make every Preflight
    // release break its consumers' CI until they synced.
    const root = await project()
    await preflight(['sync', '--yes'], root)

    // Rewind just `.nvmrc` to an older version, in both the file and the lock,
    // so it matches what the project last synced but not what Preflight now ships.
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')
    const lock = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    lock.files['.nvmrc'].computedHash = hashContents('22\n')
    await writeLock(root, lock)

    const { code, stdout } = await preflight(['check'], root)

    expect(code).toBe(0)
    expect(stdout).toMatch(/\.nvmrc/)
    expect(stdout).toMatch(/sync/)
  })

  it('fails a project that added the check step but never synced', async () => {
    const root = await project()

    expect((await preflight(['check'], root)).code).not.toBe(0)
  })

  it('fails loudly when the lock cannot be read', async () => {
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, LOCK_FILE), '{ not json', 'utf8')

    const { code, stderr } = await preflight(['check'], root)

    expect(code).not.toBe(0)
    expect(stderr).toContain(LOCK_FILE)
  })

  it('does not write anything', async () => {
    // `check` is what runs in CI. SPEC §5 gives it one job, and repairing drift
    // is the other command's.
    const root = await project()
    await preflight(['sync', '--yes'], root)
    await writeFile(join(root, '.nvmrc'), '22\n', 'utf8')

    await preflight(['check'], root)

    expect(await readFile(join(root, '.nvmrc'), 'utf8')).toBe('22\n')
  })

  it('leaves no lock behind in a project that never synced', async () => {
    const root = await project()

    await preflight(['check'], root)

    await expect(rm(join(root, LOCK_FILE))).rejects.toThrow()
  })
})
