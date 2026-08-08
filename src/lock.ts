import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Where a project's lock lives, relative to its root. */
export const LOCK_FILE = 'preflight-lock.json'

/** The `version` field SPEC §6 specifies. Bump only for a breaking shape change. */
export const LOCK_VERSION = 1

/**
 * A hash per managed file, in the shape SPEC §6 specifies.
 *
 * It is what makes SPEC §6's three states distinguishable: comparing the local
 * file against this hash separates "the project edited it" from "Preflight
 * changed it upstream", which a package-to-local comparison alone cannot.
 */
export interface PreflightLock {
  version: number
  files: Record<string, { computedHash: string }>
}

/** The hash recorded for a managed file's contents. */
export function hashContents(contents: string): string {
  return createHash('sha256').update(contents).digest('hex')
}

/** A project's lock, or `undefined` if it has never been synced. */
export async function readLock(projectRoot: string): Promise<PreflightLock | undefined> {
  let contents: string

  try {
    contents = await readFile(join(projectRoot, LOCK_FILE), 'utf8')
  }
  catch {
    return undefined
  }

  let lock: PreflightLock

  try {
    lock = JSON.parse(contents) as PreflightLock
  }
  catch (cause) {
    // Distinguished from "no lock at all", which is ordinary. A lock that exists
    // but cannot be read is a hand-edit or a bad merge, and silently treating it
    // as absent would rewrite it and lose whatever it recorded.
    throw new Error(`${LOCK_FILE} is not valid JSON. Run \`preflight sync\` to regenerate it.`, { cause })
  }

  // The compatibility mechanism SPEC §6 specified, actually connected. Until
  // 0.3.0 `LOCK_VERSION` was exported, documented as the thing to bump for a
  // breaking shape change, and read by nothing — so a future v2 lock would have
  // been parsed as though it were v1 and its hashes compared against a shape
  // this code does not understand. A version field nobody checks is the shape of
  // dead config ADR-0003 deleted; this is the check that makes it a mechanism.
  //
  // Only a *newer* lock is refused. An older one is not an error: it is what a
  // migration would read, and failing here would leave a project unable to run
  // the very command that upgrades it.
  if (lock.version > LOCK_VERSION) {
    throw new Error(
      `${LOCK_FILE} is version ${lock.version}, but this Preflight understands version ${LOCK_VERSION}. `
      + 'Upgrade @victortolbert/preflight to read it.',
    )
  }

  return lock
}

/**
 * Writes a project's lock.
 *
 * Formatting is fixed rather than incidental: the lock is a tracked file that
 * shows up in review, and a re-sync that reformatted it would produce a diff
 * saying nothing.
 */
export async function writeLock(projectRoot: string, lock: PreflightLock): Promise<void> {
  await writeFile(join(projectRoot, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}
