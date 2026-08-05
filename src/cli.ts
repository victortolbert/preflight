#!/usr/bin/env node
import type { CheckState } from './check'
import type { ManagedPlan } from './sync'
import process from 'node:process'
import { confirm, isCancel } from '@clack/prompts'
import { cac } from 'cac'
import { createPatch } from 'diff'
import pc from 'picocolors'
import { checkProject, driftedFiles } from './check'
import { applySync, pendingChanges, planSync } from './sync'

/**
 * A unified diff of one pending change.
 *
 * Unified rather than a bespoke format because it is the one every reviewer
 * already reads, and because a `create` is honestly expressible in it as a diff
 * against nothing.
 */
function renderDiff({ file, current, next }: ManagedPlan): string {
  const patch = createPatch(file, current ?? '', next, undefined, undefined, { context: 3 })

  return patch
    .split('\n')
    // The `Index:`/`===` preamble names a file we have already printed.
    .slice(2)
    .map((line) => {
      if (line.startsWith('+'))
        return pc.green(line)
      if (line.startsWith('-'))
        return pc.red(line)
      if (line.startsWith('@@'))
        return pc.cyan(line)
      return pc.dim(line)
    })
    .join('\n')
}

/** The one-line heading above a change's diff. */
function changeLabel({ file, outcome }: ManagedPlan): string {
  return `${outcome === 'create' ? pc.green('create') : pc.yellow('update')} ${pc.bold(file)}`
}

async function sync(projectRoot: string, options: { yes?: boolean }): Promise<number> {
  const plan = await planSync(projectRoot)
  const pending = pendingChanges(plan)

  for (const { file } of plan.filter(({ outcome }) => outcome === 'unmanaged'))
    console.log(`${pc.dim('unmanaged')} ${pc.bold(file)} ${pc.dim('— declared in preflight.config.ts')}`)

  // Nothing to show and nothing to ask, but the lock is still written: SPEC §2's
  // adoption story has the managed files already matching, so this is the
  // ordinary first run in a consuming repo rather than a no-op.
  if (pending.length === 0) {
    await applySync(projectRoot, plan)
    console.log(pc.green('Managed files are up to date. Nothing to do.'))
    return 0
  }

  // SPEC §5: the diff comes first, always, and before any question is asked.
  for (const planned of pending) {
    console.log(`\n${changeLabel(planned)}`)
    console.log(renderDiff(planned))
  }

  if (!options.yes) {
    if (!process.stdin.isTTY) {
      // SPEC §5 rejected writing without confirmation on trust grounds. With no
      // terminal there is nobody to ask, so the honest move is to refuse and say
      // how to proceed deliberately.
      console.error(pc.red('\nRefusing to write without confirmation. Re-run with --yes to sync non-interactively.'))
      return 1
    }

    const confirmed = await confirm({ message: `Write ${pending.length} file(s)?` })

    if (isCancel(confirmed) || !confirmed) {
      console.log(pc.dim('Nothing written.'))
      return 1
    }
  }

  await applySync(projectRoot, plan)
  console.log(pc.green(`\nWrote ${pending.length} file(s) and updated preflight-lock.json.`))

  return 0
}

/**
 * How each state is labelled and what a project should do about it.
 *
 * The labels are SPEC §6's own words for its table's rows, and CONTEXT.md's for
 * the two states beyond it, rather than a shorthand invented here — this output
 * is where a reader meets the vocabulary for the first time.
 */
const report: Record<CheckState, { label: string, advice?: string }> = {
  'drifted': {
    label: pc.red('drift'),
    // Not "restore": for a file with no lock entry Preflight never wrote it, and
    // syncing would replace the project's own version rather than put back its
    // previous one. Both remedies read correctly whichever way the file got here.
    advice: 'run `preflight sync` to take Preflight\'s version, or add it to `unmanaged` in preflight.config.ts to keep yours',
  },
  'upstream-moved': {
    label: pc.cyan('sync available'),
    advice: 'Preflight ships a newer version — run `preflight sync` to take it',
  },
  'unrecorded': {
    label: pc.yellow('unrecorded'),
    advice: 'matches Preflight, but preflight-lock.json has no entry — run `preflight sync` to record it',
  },
  'in-sync': { label: pc.green('in sync') },
  'unmanaged': { label: pc.dim('unmanaged') },
}

async function check(projectRoot: string): Promise<number> {
  const checked = await checkProject(projectRoot)

  for (const { file, state } of checked) {
    const { label, advice } = report[state]
    console.log(`${label} ${pc.bold(file)}${advice ? pc.dim(` — ${advice}`) : ''}`)
  }

  const drifted = driftedFiles(checked)

  if (drifted.length === 0) {
    console.log(pc.green('\nNo drift.'))
    return 0
  }

  // SPEC §6: CI is the only gate that cannot be skipped and that sees every
  // change, and warn-only was rejected as functionally identical to the status
  // quo. This exit code is the whole enforcement mechanism.
  console.error(pc.red(`\n${drifted.length} managed file(s) drifted: ${drifted.map(({ file }) => file).join(', ')}`))

  return 1
}

/**
 * Reports a failure as a message rather than a stack trace.
 *
 * The errors that reach here are addressed to the reader — an unreadable lock
 * file says what to run — and a stack trace would bury that under frames from
 * inside a dependency.
 */
async function reportingFailures(command: () => Promise<number>): Promise<number> {
  try {
    return await command()
  }
  catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)))
    return 1
  }
}

const cli = cac('preflight')

cli
  .command('sync', 'Write managed files, showing a diff first')
  .option('--yes', 'Skip the confirmation prompt')
  .action(async (options: { yes?: boolean }) => {
    process.exitCode = await reportingFailures(() => sync(process.cwd(), options))
  })

cli
  .command('check', 'Exit non-zero on drift in a managed, non-opted-out file')
  .action(async () => {
    process.exitCode = await reportingFailures(() => check(process.cwd()))
  })

cli.help()
cli.parse()
