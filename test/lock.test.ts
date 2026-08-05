import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hashContents, LOCK_FILE, LOCK_VERSION, readLock, writeLock } from '../src/lock'
import { project } from './support/project'

describe('hashContents', () => {
  it('gives the same hash for the same contents', () => {
    expect(hashContents('24\n')).toBe(hashContents('24\n'))
  })

  it('gives a different hash for different contents', () => {
    expect(hashContents('24\n')).not.toBe(hashContents('22\n'))
  })

  it('is sensitive to whitespace, because a managed file is compared byte for byte', () => {
    expect(hashContents('24\n')).not.toBe(hashContents('24'))
  })
})

describe('readLock', () => {
  it('returns undefined when a project has never been synced', async () => {
    await expect(readLock(await project())).resolves.toBeUndefined()
  })

  it('reads back what writeLock wrote', async () => {
    const root = await project()
    const lock = { version: LOCK_VERSION, files: { '.nvmrc': { computedHash: hashContents('24\n') } } }

    await writeLock(root, lock)

    await expect(readLock(root)).resolves.toEqual(lock)
  })
})

describe('writeLock', () => {
  it('writes the shape SPEC §6 specifies', async () => {
    const root = await project()

    await writeLock(root, { version: LOCK_VERSION, files: { '.nvmrc': { computedHash: 'abc' } } })

    const written = JSON.parse(await readFile(join(root, LOCK_FILE), 'utf8'))
    expect(written).toEqual({ version: 1, files: { '.nvmrc': { computedHash: 'abc' } } })
  })

  it('writes byte-identical output for the same lock, so a re-sync is a no-op', async () => {
    const root = await project()
    const lock = { version: LOCK_VERSION, files: { '.nvmrc': { computedHash: 'abc' } } }

    await writeLock(root, lock)
    const first = await readFile(join(root, LOCK_FILE), 'utf8')
    await writeLock(root, lock)

    expect(await readFile(join(root, LOCK_FILE), 'utf8')).toBe(first)
  })

  it('is a tracked file a human will read, so it ends with a newline', async () => {
    const root = await project()

    await writeLock(root, { version: LOCK_VERSION, files: {} })

    expect(await readFile(join(root, LOCK_FILE), 'utf8')).toMatch(/\n$/)
  })
})

describe('a lock file a human has mangled', () => {
  it('is reported as unreadable rather than crashing with a parse error', async () => {
    const root = await project()
    await writeFile(join(root, LOCK_FILE), '{ not json', 'utf8')

    await expect(readLock(root)).rejects.toThrow(/preflight-lock\.json/)
  })
})
