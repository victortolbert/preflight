import type { ManagedFile } from './index'
import { loadPreflightConfig } from './config'
import { hashContents, readLock } from './lock'
import { MANAGED_FILES, readProjectFile, readTemplate } from './templates'

/**
 * What `preflight check` found for one managed file.
 *
 * SPEC §6's table has three rows. This has five, for two reasons its author
 * records: the table describes three of four combinations of (local vs lock,
 * lock vs package) — {@link CheckState.drifted} absorbs the fourth — and it
 * assumes a lock entry exists, which {@link CheckState.unrecorded} covers.
 */
export type CheckState =
  /** Local matches the lock, and the lock matches what Preflight ships. */
  | 'in-sync'
  /**
   * Local diverges from the lock, and nothing declared that it should.
   *
   * The only state that fails the check (CONTEXT.md's definition of drift). It
   * covers a missing managed file, and the fourth state SPEC §6's table omits:
   * local differing from both the lock and the package, which is where a project
   * lands when it edits a managed file and then upgrades.
   */
  | 'drifted'
  /**
   * Local matches the lock, but Preflight now ships something else.
   *
   * News, not a violation. Failing here would mean every Preflight release broke
   * its consumers' CI until they synced.
   */
  | 'upstream-moved'
  /**
   * No lock entry, but the file already matches what Preflight ships.
   *
   * Nothing has diverged, so there is nothing to fail on — but nothing recorded
   * the agreement either, so it is reported. A file with no lock entry that does
   * *not* match is {@link CheckState.drifted}.
   */
  | 'unrecorded'
  /** Declared in `preflight.config.ts`. Skipped entirely, and never fails. */
  | 'unmanaged'

export interface CheckedFile {
  readonly file: ManagedFile
  readonly state: CheckState
}

/** The files that diverged without the project saying so — the whole of what fails CI. */
export function driftedFiles(checked: readonly CheckedFile[]): CheckedFile[] {
  return checked.filter(({ state }) => state === 'drifted')
}

/** Whether {@link driftedFiles} found anything. */
export function hasDrift(checked: readonly CheckedFile[]): boolean {
  return driftedFiles(checked).length > 0
}

/**
 * Compares every managed file against the lock and against what Preflight ships.
 *
 * Reads only. Repairing drift is `preflight sync`'s job, and SPEC §6 makes the
 * separation the point: a check that fixed what it found would be a check nobody
 * could run in CI to learn anything.
 */
export async function checkProject(projectRoot: string): Promise<CheckedFile[]> {
  const [{ unmanaged }, lock] = await Promise.all([
    loadPreflightConfig(projectRoot),
    readLock(projectRoot),
  ])

  return Promise.all(MANAGED_FILES.map(async (file): Promise<CheckedFile> => {
    if (unmanaged.includes(file))
      return { file, state: 'unmanaged' }

    const [current, packaged] = await Promise.all([
      readProjectFile(projectRoot, file),
      readTemplate(file),
    ])

    const locked = lock?.files[file]?.computedHash

    if (locked === undefined)
      return { file, state: current === packaged ? 'unrecorded' : 'drifted' }

    if (current === undefined || hashContents(current) !== locked)
      return { file, state: 'drifted' }

    return { file, state: locked === hashContents(packaged) ? 'in-sync' : 'upstream-moved' }
  }))
}
