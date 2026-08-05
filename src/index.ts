/**
 * A file Preflight writes into a consuming project and tracks by hash.
 *
 * Only the CLI-written files (SPEC §2) are named here. Presets are consumed by
 * reference and never written into a project, so they cannot be opted out of —
 * a consumer diverges from a preset by composing over it instead (ADR-0004).
 */
export type ManagedFile = '.nvmrc' | 'axe-linter.yml'

/** The shape of a project's `preflight.config.ts`. */
export interface PreflightConfig {
  /**
   * Managed files this project has explicitly opted out of.
   *
   * Preflight stops writing them and `preflight check` stops failing on them.
   * SPEC §6: some divergence is legitimate, and a mechanism that cannot express
   * it will be worked around — so this makes divergence a recorded, reviewable
   * decision rather than something to be detected.
   *
   * Deliberately typed against {@link ManagedFile} rather than `string`. A typo
   * would otherwise opt out of nothing, and `preflight check` would then fail on
   * a file the project believes it has already declared.
   */
  unmanaged?: readonly ManagedFile[]
}

/**
 * Types a project's `preflight.config.ts`.
 *
 * ```ts
 * import { definePreflightConfig } from '@victortolbert/preflight'
 *
 * export default definePreflightConfig({
 *   unmanaged: ['.nvmrc'],
 * })
 * ```
 *
 * Identity at runtime, as both peer dependencies' `defineConfig` are. SPEC §3:
 * the root export exists to give this function an address, because both peer
 * dependencies expose their `defineConfig` from the package root and so this is
 * the line these projects already write.
 */
export function definePreflightConfig(config: PreflightConfig): PreflightConfig {
  return config
}
