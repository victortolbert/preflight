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
 * The body is deliberately empty of policy. SPEC §2 takes only what the
 * consuming repos already agree on, and their settings have not been extracted
 * into this public repo yet; inventing defaults here would ship policy that no
 * measurement supports. `exclude` is present and empty because it is the key
 * SPEC §4's composition example builds on, so consumers can write that line
 * against v1 and have it keep working when real policy lands.
 */
const preflightTaze = {
  /** Dependencies Preflight asks taze to leave alone. */
  exclude: [] as string[],
} satisfies Partial<CheckOptions>

export default preflightTaze
