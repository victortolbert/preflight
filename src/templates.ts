import type { ManagedFile } from './index'
import { readFile } from 'node:fs/promises'
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
