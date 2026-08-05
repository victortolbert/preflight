import { execFile } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const cli = fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url))

export interface CliResult {
  code: number
  stdout: string
  stderr: string
}

/**
 * Runs the built CLI in `cwd`, the way a project would.
 *
 * SPEC §12: nearly all of Preflight's behaviour is filesystem side-effects and
 * exit codes, so these drive the real binary rather than importing its
 * internals. `execFile` also gives the child no TTY, which is the position a CI
 * job is in — the one that matters most for `check`.
 */
export async function preflight(args: string[], cwd: string): Promise<CliResult> {
  try {
    const { stdout, stderr } = await run(process.execPath, [cli, ...args], { cwd })
    return { code: 0, stdout, stderr }
  }
  catch (error) {
    const failure = error as { code?: number, stdout?: string, stderr?: string }
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' }
  }
}
