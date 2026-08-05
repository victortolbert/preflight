import type { CommandOptions } from 'skills-npm'

/**
 * Preflight's `skills-npm` policy.
 *
 * A typed options object, not the result of calling skills-npm's `defineConfig`
 * — see [ADR-0004](../../docs/adr/0004-presets-are-composable-options-objects.md).
 *
 * ```ts
 * // consumer with no local policy
 * export { default } from '@victortolbert/preflight/skills-npm'
 *
 * // consumer with a local addition, declared at the point of divergence
 * import { defineConfig } from 'skills-npm'
 * import preflightSkillsNpm from '@victortolbert/preflight/skills-npm'
 *
 * export default defineConfig({
 *   ...preflightSkillsNpm,
 *   agents: ['claude-code'],
 * })
 * ```
 *
 * **This ships no policy, which contradicts ADR-0003.** That ADR concluded "the
 * preset ships with those two placeholder keys stripped and the real settings
 * kept", and SPEC §2 carries the same framing. What is kept here is nothing.
 * The reason is that the consuming repos' settings have not been extracted into
 * this public repo, and SPEC §2 takes only what those repos already agree on —
 * so inventing values would ship policy no measurement supports. Recorded in
 * ADR-0003 rather than left as a silent override.
 *
 * Two observations that shaped it, both about skills-npm's published README
 * example, which SPEC §2 records the consuming configuration as having been
 * copied from:
 *
 * - Its `include` / `exclude` keys hold the tool's placeholders — `@some/package`,
 *   listed identically under both. Dropping those keys is the one configuration
 *   change adoption makes (SPEC §2), and this ticket's stated job.
 * - Of the six keys left once they go, four — `recursive`, `gitignore`, `yes`,
 *   `dryRun` — are set to the values `CommandOptions` documents as its own
 *   defaults, so setting them changes nothing. Only `source` and `agents` could
 *   carry a real choice.
 *
 * The annotation is deliberate where the taze preset uses `satisfies`. With no
 * keys there is nothing for `satisfies` to keep concrete, and it would erase the
 * tie to `CommandOptions` from the emitted declaration — `declare const
 * preflightSkillsNpm: {}` tells a consumer's editor nothing. Once real policy
 * lands, this should move to `satisfies` for the reason ADR-0004 gives.
 */
const preflightSkillsNpm: Partial<CommandOptions> = {}

export default preflightSkillsNpm
