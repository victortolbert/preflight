import type { CheckOptions } from 'taze'

/**
 * Preflight's `taze` policy.
 *
 * A typed options object, not the result of calling taze's `defineConfig` — see
 * [ADR-0004](../../docs/adr/0004-presets-are-composable-options-objects.md).
 * `satisfies` rather than a type annotation is what makes the difference load
 * bearing: it checks the object against taze's own option type while keeping
 * each key's concrete type, so a consumer can spread the preset and concatenate
 * onto one of its arrays.
 *
 * ```ts
 * // consumer with no local policy
 * export { default } from '@victortolbert/preflight/taze'
 *
 * // consumer with a local addition, declared at the point of divergence
 * import { defineConfig } from 'taze'
 * import preflightTaze from '@victortolbert/preflight/taze'
 *
 * export default defineConfig({
 *   ...preflightTaze,
 *   exclude: [...preflightTaze.exclude, '@internal/*'],
 * })
 * ```
 *
 * Extracted from the consuming repos, where this was byte-identical, and it is
 * the one v1 file whose contents were a genuine choice rather than a tool's
 * README example left where it landed. taze's own example excludes `webpack`;
 * this does not resemble it.
 */
const preflightTaze = {
  /**
   * Dependencies Preflight asks taze to leave alone.
   *
   * `@fortawesome/*` is currently vestigial: neither consuming repo depends on
   * those packages, and neither lockfile mentions them. An archived
   * `package.json` in one of them still lists the free FontAwesome icon
   * packages, so the rule appears to date from when they were installed.
   *
   * Kept because an `exclude` entry is a guard, and a guard matching nothing is
   * its normal state — but recorded here rather than dressed up, because this
   * is the shape of thing SPEC §8 warns about: a rule that is byte-identical
   * everywhere, and inert everywhere.
   */
  exclude: ['@fortawesome/*'],
} satisfies Partial<CheckOptions>

export default preflightTaze
