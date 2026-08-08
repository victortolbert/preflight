/**
 * A flat-config rule entry, in the only shapes this preset uses.
 *
 * Declared locally rather than imported from `eslint-plugin-vuejs-accessibility`
 * or `eslint`. The plugin arrives transitively through `@antfu/eslint-config`,
 * and both consuming repos run a strict pnpm layout with no `shamefully-hoist`,
 * so importing its types would be a phantom dependency — the same trap the
 * `commitlint.config.ts` files in both repos carry a comment about.
 *
 * The union is literal on purpose: `satisfies` uses it as a contextual type, so
 * `'off'` stays `'off'` rather than widening to `string`, which is what keeps
 * the preset spreadable into a typed `overrides` block (ADR-0004).
 */
type RuleEntry = 'off' | 'warn' | 'error' | ['off' | 'warn' | 'error', ...unknown[]]

/**
 * Preflight's `vue-a11y` policy.
 *
 * A typed options object, spread rather than named in an `extends`
 * ([ADR-0004](../../docs/adr/0004-presets-are-composable-options-objects.md)).
 * The commitlint preset is the exception in this package, not the pattern: it
 * needs `extends` because a commitlint config carries *resolvable references*
 * ([ADR-0007](../../docs/adr/0007-commitlint-presets-are-consumed-via-extends.md)).
 * There are none here — these are plain rule settings — so the ordinary
 * mechanism applies.
 *
 * ```ts
 * // eslint.config.mjs, in the consuming repo
 * import preflightVueA11y from '@victortolbert/preflight/vue-a11y'
 *
 * export default antfu({
 *   vue: {
 *     a11y: true,
 *     overrides: {
 *       ...preflightVueA11y,
 *       // local divergence, declared at the point of divergence
 *     },
 *   },
 * })
 * ```
 *
 * **On the subpath name.** SPEC §3 says subpaths are tool-named and
 * framework-silent — `/taze`, never `/nuxt/taze`. `vue-a11y` is not a breach of
 * that: it is the rule prefix `eslint-plugin-vuejs-accessibility` publishes, so
 * it names the tool exactly as `/taze` does. §3's rule forbids namespacing a
 * framework-independent thing *under* a framework; it does not require pretending
 * a Vue-only plugin is something else.
 *
 * **Why three rules and not the thirteen one repo carries.** Measured, in
 * [ADR-0009](../../docs/adr/0009-the-accessibility-gap-is-three-rules.md).
 * Stripping each repo's overrides and running eslint: every rule each repo
 * silences does fire in it, so none are stale — but each repo silences exactly
 * what its own content trips, and the application repo trips ten more only
 * because it carries a component showcase the template has no equivalent of.
 * Those ten are not disagreement; the template has never had occasion to hold a
 * view on them. SPEC §2 ships the agreement and defers the disputes, and the
 * agreement is these three.
 *
 * **No peer dependency.** Unlike commitlint, this preset asks a consumer to
 * install nothing: the plugin is already running inside `@antfu/eslint-config`
 * in both repos. So [ADR-0008](../../docs/adr/0008-commit-linting-is-opt-in.md)'s
 * opt-in question does not arise here — there is no tool to install and leave
 * unwired, and therefore no dead config to manufacture.
 */
const preflightVueA11y = {
  /**
   * Off in both consuming repos, and agreed rather than merely absent.
   *
   * `autofocus` is a genuine accessibility hazard in general, which is why the
   * rule exists — it moves focus without the user asking. Both repos use it
   * anyway, in the places where a form is the entire purpose of the view and
   * the focus move is the expected behaviour rather than a surprise. That is a
   * position, not an oversight, and it is held identically on both sides.
   */
  'vue-a11y/no-autofocus': 'off',

  /**
   * Off in both consuming repos.
   *
   * The rule wants a `<track kind="captions">` on every `<video>`. Neither repo
   * hosts first-party video with a caption track to point at; the elements that
   * trip it are embeds and demo players. Enforcing it would produce a
   * suppression at every call site rather than a caption anywhere.
   */
  'vue-a11y/media-has-caption': 'off',

  /**
   * Tuned, not disabled — the one rule the two repos genuinely disagreed on,
   * resolved in favour of the template's answer.
   *
   * The stock default requires `both` nesting *and* an `id` association. That
   * rejects a wrapped form control — `<label>Name <input></label>` — which is
   * valid HTML and associates the label perfectly well. `some` accepts either
   * mechanism, which is the honest reading of the rule's intent.
   *
   * This is measured, not preferred. Under the stock default the template trips
   * this 21 times and the application repo 96; under `some` the template drops
   * to **0** and the application repo to **46**. So the tuning removes exactly
   * the false positives and keeps the rule catching real ones — which is why the
   * template's `'error'` is the setting shipped, rather than the application
   * repo's blanket `'off'`. A rule that is right 46 times is worth running.
   */
  'vue-a11y/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
} satisfies Record<string, RuleEntry>

export default preflightVueA11y
