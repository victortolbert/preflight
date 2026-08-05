import type { ManagedFile } from './index'
import type { PreflightLock } from './lock'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadPreflightConfig } from './config'
import { hashContents, LOCK_VERSION, writeLock } from './lock'
import { MANAGED_FILES, readTemplate } from './templates'

/** What a sync would do to a file Preflight manages in this project. */
export type SyncOutcome =
  /** The project does not have the file. */
  | 'create'
  /** The project has it, and it differs from what Preflight would write. */
  | 'update'
  /** The project already has exactly what Preflight would write. */
  | 'unchanged'

interface PlannedFileBase {
  readonly file: ManagedFile
  /** What the project has now, or `undefined` when the file is absent. */
  readonly current: string | undefined
}

/** A file Preflight manages in this project. */
export interface ManagedPlan extends PlannedFileBase {
  readonly outcome: SyncOutcome
  /** What Preflight would write. */
  readonly next: string
}

/**
 * A file the project declared unmanaged.
 *
 * It carries no `next` rather than an empty one: Preflight has nothing it would
 * write here, and a placeholder value would be a lie the rest of the code then
 * has to remember to filter out.
 */
export interface UnmanagedPlan extends PlannedFileBase {
  readonly outcome: 'unmanaged'
}

export type PlannedFile = ManagedPlan | UnmanagedPlan

/** Whether Preflight is still responsible for this file in this project. */
export function isManaged(planned: PlannedFile): planned is ManagedPlan {
  return planned.outcome !== 'unmanaged'
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  }
  catch {
    return undefined
  }
}

/**
 * Works out what a sync would do, without doing any of it.
 *
 * Separated from {@link applySync} because SPEC §5 requires the diff to be shown
 * and confirmed before anything is written — which is only possible if deciding
 * and writing are two steps.
 */
export async function planSync(projectRoot: string): Promise<PlannedFile[]> {
  const { unmanaged } = await loadPreflightConfig(projectRoot)

  return Promise.all(MANAGED_FILES.map(async (file): Promise<PlannedFile> => {
    const current = await readIfPresent(join(projectRoot, file))

    if (unmanaged.includes(file))
      return { file, outcome: 'unmanaged', current }

    const next = await readTemplate(file)
    const outcome = current === undefined ? 'create' : current === next ? 'unchanged' : 'update'

    return { file, outcome, current, next }
  }))
}

/** The files a sync would actually write. */
export function pendingChanges(plan: readonly PlannedFile[]): ManagedPlan[] {
  return plan.filter((planned): planned is ManagedPlan =>
    isManaged(planned) && planned.outcome !== 'unchanged')
}

/**
 * Writes the pending files and records a hash for every file Preflight manages
 * in this project.
 *
 * The lock is written on every sync, not only when a file changed. SPEC §2's
 * adoption story is that the managed files are *already* byte-identical in the
 * consuming repos, so "nothing to write" is the ordinary first run rather than
 * an edge case — and a sync that recorded nothing would leave `preflight check`
 * with no hash to compare against. It also means a lock lost to a bad merge is
 * repaired by re-running sync.
 *
 * The lock is rebuilt from the plan rather than merged into what was there
 * before, so a file the project has since declared unmanaged drops out of it. A
 * stale entry would leave `preflight check` holding a hash for a file it no
 * longer has any business looking at.
 */
export async function applySync(projectRoot: string, plan: readonly PlannedFile[]): Promise<void> {
  for (const { file, next } of pendingChanges(plan))
    await writeFile(join(projectRoot, file), next, 'utf8')

  const files: PreflightLock['files'] = {}
  for (const planned of plan) {
    if (isManaged(planned))
      files[planned.file] = { computedHash: hashContents(planned.next) }
  }

  await writeLock(projectRoot, { version: LOCK_VERSION, files })
}
