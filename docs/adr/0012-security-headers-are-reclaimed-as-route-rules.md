# Security headers are reclaimed as route rules, and the backlog understated this one

SPEC §10.5 reads, in full: *"Deploy security headers, reclaimed host-independently."* It sounds like tidying — the headers exist, move them somewhere portable. Measuring found something else. The headers are not host-*specific*; they are host-*absent*. Both consuming repos agree on them byte-for-byte, neither repo is served them, and the live site has been running without them since it moved hosts.

**This is the first §10 item that got bigger when measured.** Items 3, 2, 1 and 4 were reversed, rescoped, reinterpreted and closed-with-nothing-to-ship respectively. SPEC §247's standing caution is that these entries were *reasoned, not measured*, and every instance so far has cut an item down. This one ran the other way, which matters more for the four items still unmeasured than another confirmation would have.

## The measurement

Taken 2026-08-15 against both consuming repos and live production.

### The agreement is total

Both repos' `netlify.toml` header block is **byte-identical** — 21 lines, five rules:

| Rule | Path | Value |
|---|---|---|
| `X-Frame-Options` | `/*` | `DENY` |
| `X-Content-Type-Options` | `/*` | `nosniff` |
| `Referrer-Policy` | `/*` | `strict-origin-when-cross-origin` |
| `Cache-Control` | `/_nuxt/*` | `public, max-age=31536000, immutable` |
| `Cache-Control` | `/img/*` | `public, max-age=31536000, immutable` |

Both `vercel.json` files are byte-identical too, and carry **no headers at all** — only `installCommand`, `buildCommand` and `framework`.

No other §10 item has agreed this cleanly. There is no dispute to defer.

### And it is entirely dead

Neither repo deploys to either host any more. Netlify has seven surviving sites and neither is one of them; Vercel has two projects across both scopes (`vticonsulting`, `vtolberts-projects`) and neither is one of them. Both files are **dead config** by the definition in `CONTEXT.md`: present, byte-identical, and invoked by nothing.

The application repo is live on a host that reads neither file, and its host config has no headers section. A request to production returned only the usual entity and caching headers plus that host's own request-id and trace headers — and **none of the five**. No `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`, no HSTS, no CSP. The template repo deploys nowhere at all, so for it the gap is theoretical; for the application repo it is live.

### Four of the five rules are unenforced, and the fifth is redundant

Resolving each rule against what production actually returns:

| Rule | In `netlify.toml` | Live |
|---|---|---|
| `X-Frame-Options: DENY` | ✓ | **absent** |
| `X-Content-Type-Options: nosniff` | ✓ | **absent** |
| `Referrer-Policy` | ✓ | **absent** |
| `/_nuxt/*` immutable | ✓ | present — **from Nitro, not this file** |
| `/img/*` immutable | ✓ | **absent** |

The split was verified directly rather than inferred. A hashed bundle under `/_nuxt/` returns `public, max-age=31536000, immutable` from a host that never reads `netlify.toml`, so Nitro sets it. An image under `/img/` returns `200` with **no `Cache-Control` at all**, so Nitro does not extend that to `public/`.

This is the same shape as ADR-0009's `aria-hidden="false"` finding: the count was not enough, and each rule had to be resolved against what it actually does. Five agreed rules read as one deliverable until each was checked, at which point they became three to ship, one to drop as redundant, and one to drop as a hazard.

### The mechanism already exists and is already in use

Both repos already declare `routeRules` in `nuxt.config.ts` — for redirects only. Nitro applies `routeRules[path].headers` on the Node preset Railway runs, and on the Vercel and Netlify presets too. Nothing needs installing and no new concept is introduced into either repo.

## Considered Options

- **Ship all five agreed rules.** Rejected on the table above. `/_nuxt/*` restates what Nitro already does, which is [ADR-0003](./0003-drop-skills-json-as-dead-config.md)'s case exactly. `/img/*` is worse than redundant: `public/` filenames carry no content hash, so `immutable` tells browsers to ignore a replaced image for a year. That rule never reaching production was luck, and Preflight is not the place to make a footgun reliable.
- **Ship HSTS and a CSP as well**, since a security-headers preset without them looks incomplete. Rejected for [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md)'s reason: neither repo sets either header anywhere, on any host. Two repos that have never had occasion to hold a view are silent, not agreed, and SPEC §2 ships agreement. Both also carry deployment risk this package cannot judge from here — a CSP strict enough to be worth setting breaks inline styles and third-party embeds, and HSTS is close to irreversible once a browser has pinned it.
- **Ship a managed `netlify.toml` / `vercel.json` instead.** Rejected: it is what SPEC §191 already declined, and the measurement is the argument. Those files encode a hosting choice, and the hosting choice changed — which is precisely how the headers went missing. A managed file would have kept two dead files byte-identical while production served nothing.
- **Fix the application repo directly and ship nothing.** Rejected as the wrong repo's decision, though it is the faster fix. The consumers are Preflight's evidence, not its scope (`CONTEXT.md`). Their production gap is theirs to close and does not need to wait for a release — but the *agreement* is Preflight's to carry, and leaving it in two dead files means the next host change loses it again.

## Decision

**Ship `@victortolbert/preflight/security-headers`** — a `routeRules` fragment carrying the three agreed security headers, spread by the consumer:

```ts
routeRules: {
  ...preflightSecurityHeaders,
  '/app': { redirect: '/dashboard' },
}
```

An options object per [ADR-0004](./0004-presets-are-composable-options-objects.md), not an `extends` — nothing here is resolved by name, so [ADR-0007](./0007-commitlint-presets-are-consumed-via-extends.md)'s exception does not apply. No peer dependency, as with `vue-a11y`: `routeRules` is already present in both repos, so there is no tool to install and leave unwired and therefore no [ADR-0008](./0008-commit-linting-is-opt-in.md) question.

## Consequences

**`/**`, not `/*`, and this is the one place the port is not mechanical.** Netlify's glob makes `for = "/*"` match every path at any depth. Nitro's matcher does not: there `/*` is a single segment. A literal translation would have covered `/about`, missed any route nested two levels deeper, and **failed open and silently** — every page still renders, and only the nested ones lose the header. Pinned in both `security-headers.test.ts` and the version-contract assertions in `stability.test.ts`, because narrowing that key would break coverage without failing anything else.

**The subpath is content-named, which SPEC §3 did not anticipate.** §3 says subpaths are tool-named and framework-silent. Here the tool — Nitro — is the delivery vehicle rather than the policy: the policy is three HTTP response headers, a web-platform thing that outlives any particular server. Naming it `/nitro` would also claim the whole of Nitro's config surface for one key inside `routeRules`. §3's actual prohibition is namespacing under a *framework*, and `/security-headers` does not do that. Worth flagging rather than burying: §3 asserts "every v1 file is framework-independent," and this preset is the first that is not — it is useless to a project not running Nitro. That is a real narrowing of the package's claimed audience, and the plain-JavaScript second consumer §3 imagines would find one of four subpaths inapplicable.

**Adoption is not a no-op, and that is now the second such preset.** ADR-0009 noted the `vue-a11y` preset would surface real violations on first run. This one adds headers where there were none. Both are departures from v1, where every managed file was byte-identical to what the repos already had and adoption changed nothing observable. The pattern to carry: *the presets worth shipping are increasingly the ones that change behaviour*, which raises the cost of a bad measurement in a way v1 never did.

**The application repo has a live gap that this release does not close.** Shipping the preset does not deploy it. Until that repo adopts it and redeploys, production continues to serve no security headers. Closing it there is four lines in its own `routeRules` and need not wait for a release — recorded here because the finding surfaced in Preflight's session, and the repo that has to act on it is not this one.

**What would change the answer.** Either repo adopting a CSP or HSTS, which would turn silence into a position and give the pair something to agree or disagree about. A consumer moving to a host that sets these at the edge, which would make the preset redundant there without making it wrong. Or Nitro extending its `Cache-Control` default to `public/`, which would settle the `/img/*` question by removing it.

**A method note.** This is the fifth backlog item measured and the first to grow. §247 warns that the §10 ordering was reasoned rather than measured; four consecutive shrinking results made "the backlog overstates itself" the natural reading, and it is the wrong lesson. The correct one is the one §247 actually wrote — that these entries describe files nobody counted, so measuring can move an item in *any* direction. An item ranked fifth of eight, phrased as a tidy-up in nine words, turned out to be the only one so far describing something absent from production.
