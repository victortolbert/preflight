import type { ManagedFile } from './index'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Every file Preflight writes into a consuming project, in the order it reports
 * them.
 *
 * `satisfies` keeps this in step with the {@link ManagedFile} union: a file
 * added here that the union does not name fails to compile, and the reverse is
 * caught by a type test asserting the two are exhaustive of each other. The two
 * have to exist separately — consumers need the union to type `unmanaged`, and
 * the CLI needs a list it can iterate.
 */
export const MANAGED_FILES = ['.nvmrc', 'axe-linter.yml'] as const satisfies readonly ManagedFile[]

/**
 * Resolved against this module rather than the process's working directory, so
 * it points into the installed package. `src/` and `dist/` both sit one level
 * under the package root, so this holds whether the caller imported source (as
 * the tests do) or the built CLI.
 */
const templates = new URL('../templates/', import.meta.url)

/** The contents Preflight would write for `file`. */
export async function readTemplate(file: ManagedFile): Promise<string> {
  return readFile(fileURLToPath(new URL(file, templates)), 'utf8')
}

/**
 * The contents a project currently has for `file`, or `undefined` if it has none.
 *
 * The counterpart to {@link readTemplate}: what the project has, against what
 * Preflight ships. Absence is a state both `sync` and `check` have an answer
 * for, so it is returned rather than thrown.
 */
export async function readProjectFile(projectRoot: string, file: ManagedFile): Promise<string | undefined> {
  try {
    return await readFile(join(projectRoot, file), 'utf8')
  }
  catch {
    return undefined
  }
}
