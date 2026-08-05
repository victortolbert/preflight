import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach } from 'vitest'

const roots: string[] = []

/**
 * A throwaway project directory containing `files`, keyed by path relative to
 * its root. Removed after each test.
 *
 * SPEC §12: nearly all of Preflight's behaviour is filesystem side-effects and
 * exit codes, so it is tested against real directories — a mocked `fs` suite
 * would verify the mocks.
 */
export async function project(files: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'preflight-'))
  roots.push(root)

  for (const [name, contents] of Object.entries(files)) {
    const path = join(root, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents, 'utf8')
  }

  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
