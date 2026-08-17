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
   * covers a managed file the lock knows about and the project has deleted, and
   * the fourth state SPEC §6's table omits: local differing from both the lock
   * and the package, which is where a project lands when it edits a managed file
   * and then upgrades.
   *
   * It no longer covers *every* missing file. A file absent from a project that
   * has synced before, with no lock entry, is one Preflight started managing
   * after that sync — {@link CheckState.unrecorded}, not drift. See ADR-0010.
   */
  | 'drifted'
  /**
   * This project has never synced, and a managed file does not match.
   *
   * Fails, exactly as {@link CheckState.drifted} does — the exit code is the
   * same and ADR-0010's reasoning for it is unchanged: a project with no lock
   * has not been set up, so a managed file that is absent or different is worth
   * failing on rather than waving through.
   *
   * It is a separate state only because calling it *drift* is wrong, and wrong
   * in a way that misleads the one audience that meets it. CONTEXT.md defines
   * drift as divergence in a managed file *that has not been declared*, which
   * presumes an agreement to diverge from. A repo mid-migration never made one.
   * "drift" in its CI reads as *you broke something*; what happened is *you have
   * not adopted yet*. See ADR-0016.
   */
  | 'not-adopted'
  /**
   * Local matches the lock, but Preflight now ships something else.
   *
   * News, not a violation. Failing here would mean every Preflight release broke
   * its consumers' CI until they synced.
   */
  | 'upstream-moved'
  /**
   * No lock entry, and nothing to fail on. Two ways to arrive.
   *
   * The file already matches what Preflight ships — nothing has diverged, but
   * nothing recorded the agreement either. This is how a project looks the
   * moment before its first sync, and SPEC §2's "adoption is a no-op" dividend
   * depends on it passing.
   *
   * Or the file is absent from a project that *has* synced before, which means
   * Preflight started managing it after that sync. News, not a violation: the
   * project chose nothing, and failing would redden its CI on a routine upgrade.
   *
   * A file with no lock entry that is present and does *not* match is
   * {@link CheckState.drifted}.
   */
  | 'unrecorded'
  /** Declared in `preflight.config.ts`. Skipped entirely, and never fails. */
  | 'unmanaged'

export interface CheckedFile {
  readonly file: ManagedFile
  readonly state: CheckState
}

/** The files that diverged without the project saying so. */
export function driftedFiles(checked: readonly CheckedFile[]): CheckedFile[] {
  return checked.filter(({ state }) => state === 'drifted')
}

/** The managed files a project that has never synced does not match. */
export function notAdoptedFiles(checked: readonly CheckedFile[]): CheckedFile[] {
  return checked.filter(({ state }) => state === 'not-adopted')
}

/**
 * Everything that fails the check.
 *
 * Deliberately not called `driftedFiles`, which it used to be. The two states
 * here fail identically and mean different things, and collapsing them under
 * drift's name would put CONTEXT.md's vocabulary error into the API itself —
 * the same error ADR-0016 fixes in the output.
 */
export function failingFiles(checked: readonly CheckedFile[]): CheckedFile[] {
  return [...driftedFiles(checked), ...notAdoptedFiles(checked)]
}

/** Whether {@link failingFiles} found anything. */
export function hasFailures(checked: readonly CheckedFile[]): boolean {
  return failingFiles(checked).length > 0
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

    if (locked === undefined) {
      // Nothing recorded this file, and nothing has diverged from what ships.
      if (current === packaged)
        return { file, state: 'unrecorded' }

      // Absent, in a project that has synced before: Preflight started managing
      // this file *after* that sync. `upstream-moved` already refuses to fail a
      // consumer's CI just because Preflight moved; that protection simply never
      // covered a file the lock had never seen, which is the gap ADR-0010 closes.
      //
      // `lock !== undefined` is load bearing. A project that has never synced is
      // not receiving news — it has not been set up — so a missing managed file
      // there is still drift, and still worth failing on.
      if (current === undefined && lock !== undefined)
        return { file, state: 'unrecorded' }

      // No lock file at all: this project has never synced, so there is no
      // agreement here to have diverged from. Same failure, honest name.
      return { file, state: lock === undefined ? 'not-adopted' : 'drifted' }
    }

    if (current === undefined || hashContents(current) !== locked)
      return { file, state: 'drifted' }

    return { file, state: locked === hashContents(packaged) ? 'in-sync' : 'upstream-moved' }
  }))
}
