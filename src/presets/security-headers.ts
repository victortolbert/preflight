/**
 * A Nitro route-rule entry, in the only shape this preset uses.
 *
 * Declared locally rather than imported from `nitropack` or `nuxt`. Neither is a
 * dependency of this package, and both consuming repos run a strict pnpm layout
 * with no `shamefully-hoist`, so importing either type would be a phantom
 * dependency — the same trap `src/presets/vue-a11y.ts` avoids for
 * `eslint-plugin-vuejs-accessibility`.
 *
 * `Record<string, string>` for the headers rather than a union of known header
 * names: Nitro passes these to `setResponseHeaders` unchanged, and a consumer
 * composing a header this preset has never heard of is the expected case.
 */
type RouteRuleHeaders = Record<string, { headers: Record<string, string> }>

/**
 * Preflight's security-header policy, as Nitro route rules.
 *
 * A typed options object, spread rather than named in an `extends`
 * ([ADR-0004](../../docs/adr/0004-presets-are-composable-options-objects.md)).
 *
 * ```ts
 * // nuxt.config.ts, in the consuming repo
 * import preflightSecurityHeaders from '@victortolbert/preflight/security-headers'
 *
 * export default defineNuxtConfig({
 *   routeRules: {
 *     ...preflightSecurityHeaders,
 *     '/app': { redirect: '/dashboard' },
 *   },
 * })
 * ```
 *
 * **On the subpath name.** SPEC §3 says subpaths are tool-named and
 * framework-silent. This one is named for its *content* instead, and the reason
 * is worth stating rather than glossing: the tool here — Nitro — is the delivery
 * vehicle, not the policy. The policy is three HTTP response headers, which are
 * a web-platform thing that would survive a move to any other server. Naming the
 * subpath `/nitro` would also claim the whole of Nitro's configuration surface
 * for what is one key inside `routeRules`. §3's actual prohibition is
 * namespacing under a *framework* — `/nuxt/taze` — and `/security-headers` does
 * not do that. See [ADR-0012](../../docs/adr/0012-security-headers-are-reclaimed-as-route-rules.md).
 *
 * **`/**` and not `/*`.** The consuming repos' `netlify.toml` writes `for = "/*"`,
 * and under Netlify's glob that matches every path at any depth. Nitro's matcher
 * is not Netlify's: there `/*` matches a single segment, so a literal port would
 * have covered `/about` and missed `/podcasts/admin/settings`. This is the one
 * place the translation is not mechanical, and getting it wrong fails open and
 * silently — every page still renders, and only the nested ones lose the header.
 *
 * **Why three headers and not the five rules the repos agree on.** Measured, in
 * [ADR-0012](../../docs/adr/0012-security-headers-are-reclaimed-as-route-rules.md).
 * Both repos' `netlify.toml` header blocks are byte-identical and carry five
 * rules: these three, plus `immutable` caching for `/_nuxt/*` and `/img/*`.
 * Neither cache rule ships. Nitro already sets exactly that header on `/_nuxt/*`
 * itself, so a preset restating it would guard nothing — [ADR-0003](../../docs/adr/0003-drop-skills-json-as-dead-config.md)'s
 * case. And `/img/*` serves `public/`, whose filenames carry no content hash, so
 * `immutable` there tells browsers to ignore a replaced image for a year. That
 * rule not reaching production was luck rather than design, and Preflight is not
 * the place to make it reliable.
 *
 * **No HSTS and no CSP**, though both are the headers a reader will look for
 * first. Neither consuming repo sets either one, anywhere, on any host. That is
 * silence, and [ADR-0009](../../docs/adr/0009-the-accessibility-gap-is-three-rules.md)
 * is the ADR about mistaking silence for consensus: two repos that have never
 * had occasion to hold a view do not constitute agreement to ship. Both also
 * carry real deployment risk that this package cannot measure from here — a CSP
 * strict enough to be worth setting breaks inline styles and third-party embeds,
 * and HSTS is close to irreversible once a browser has pinned it. SPEC §2 ships
 * the agreement and defers the disputes; these are not yet either.
 *
 * **No peer dependency.** Like the `vue-a11y` preset and unlike `commitlint`,
 * this asks a consumer to install nothing — `routeRules` is already there.
 */
const preflightSecurityHeaders = {
  /**
   * Every route, at any depth.
   *
   * All three headers are byte-identical in both consuming repos' `netlify.toml`
   * and were measured as absent from live production, which is the finding that
   * made this preset worth shipping rather than a tidy-up. They apply to HTML
   * responses; setting them on the asset routes as well is harmless and avoids a
   * second rule whose only purpose is to carve out an exception.
   */
  '/**': {
    headers: {
      /**
       * Refuses framing outright, which is what both repos already chose.
       *
       * `DENY` rather than `SAMEORIGIN`: neither repo frames its own pages, so
       * the stricter value costs nothing today, and it is the value both
       * `netlify.toml` files carry. A consumer that later needs same-origin
       * framing overrides this key at the point of divergence rather than
       * loosening it here for everyone.
       */
      'X-Frame-Options': 'DENY',

      /**
       * Stops content-type sniffing.
       *
       * The one header here with no plausible reason to differ between repos,
       * and the cheapest: it makes a browser honour the declared `Content-Type`
       * instead of guessing from the bytes, which is the behaviour anything
       * serving user-supplied files wants.
       */
      'X-Content-Type-Options': 'nosniff',

      /**
       * Sends the full referrer within the origin, and only the origin outward.
       *
       * The modern default in most browsers, which makes this partly a
       * belt-and-braces declaration — but it is declared identically in both
       * repos, and stating it means the behaviour does not change under a
       * browser that has not adopted the default or a user agent that has been
       * configured away from it.
       */
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
} satisfies RouteRuleHeaders

export default preflightSecurityHeaders
