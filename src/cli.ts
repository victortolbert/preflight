#!/usr/bin/env node
import type { ManagedPlan } from './sync'
import process from 'node:process'
import { confirm, isCancel } from '@clack/prompts'
import { cac } from 'cac'
import { createPatch } from 'diff'
import pc from 'picocolors'
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

const cli = cac('preflight')

cli
  .command('sync', 'Write managed files, showing a diff first')
  .option('--yes', 'Skip the confirmation prompt')
  .action(async (options: { yes?: boolean }) => {
    process.exitCode = await sync(process.cwd(), options)
  })

cli.help()
cli.parse()
