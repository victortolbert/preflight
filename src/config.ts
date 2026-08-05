import type { ManagedFile, PreflightConfig } from './index'
import { dirname, resolve } from 'node:path'
import { loadConfig } from 'unconfig'

/**
 * A {@link PreflightConfig} with every optional field settled.
 *
 * The loader absorbs the difference between "no config file", "a config file
 * declaring nothing", and "a config file declaring something", so callers get
 * one shape and never branch on absence.
 */
export interface ResolvedPreflightConfig {
  unmanaged: readonly ManagedFile[]
}

/**
 * Reads a project's `preflight.config.ts`.
 *
 * A missing config file is the ordinary case, not an error — most projects will
 * never write one, since SPEC §6's opt-out exists for the exception. It resolves
 * the same as a config that declares nothing.
 *
 * The search is confined to `projectRoot`. `unconfig` walks up to the filesystem
 * root by default, which would let an unrelated ancestor config silently govern
 * a project. `stopAt` is exclusive — it names the first directory *not* searched
 * — so bounding the walk to one directory means stopping at its parent. The path
 * is resolved to an absolute one first: `dirname('.')` is `'.'`, which would
 * make `stopAt` equal to the starting directory and search nothing at all.
 *
 * `unconfig` rather than a bare dynamic import, for the reason SPEC §4 gives for
 * everything else here — it is what both peer dependencies load their own config
 * with. It also loads TypeScript that Node's strip-only mode rejects, and a
 * consumer's config is their file to write however they like. It is Preflight's
 * first runtime dependency; SPEC §3's package sketch shows no `dependencies`
 * key, but that sketch omits `scripts` and `devDependencies` too.
 */
export async function loadPreflightConfig(projectRoot: string): Promise<ResolvedPreflightConfig> {
  const cwd = resolve(projectRoot)

  const { config } = await loadConfig<PreflightConfig>({
    sources: [{ files: 'preflight.config' }],
    defaults: {},
    cwd,
    stopAt: dirname(cwd),
  })

  return { unmanaged: config.unmanaged ?? [] }
}
