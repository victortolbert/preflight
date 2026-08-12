# Handoff — Preflight & consumers, 2026-08-12

Replaces `2026-08-09-post-promotion.md`, deleted in the same commit.

Primary working directory: `~/Projects/preflight-pkg`. Consumers: `~/Projects/nuxt-kickstart`, `~/Projects/uxlab`.

---

## The state, in one line

**A live data exposure was found and closed in `uxlab`. All three repos are clean, one PR is open (`preflight#21`), and hosting is consolidated onto Railway.**

---

## What happened

A session that began "read the handoff and recommend next actions" ended up finding **73 colleague email addresses publicly served on three URLs**. Everything below follows from that.

### The exposure

Nuxt Content writes one gzipped SQL dump per collection to `.output/public/__nuxt_content/<collection>/sql_dump.txt` and serves it as a **static asset with no authorization of any kind**. `visibility: private` is an ordinary schema field the module never reads.

The `people` dump decoded to 73 work emails across 7 employer domains, plus names, roles, orgs and teams for 67 real colleagues. Fetchable unauthenticated from:

| URL | Closed by |
|---|---|
| `uxlab.designcoder.net` (Vercel) | domain removed from project |
| `uxlab-sooty.vercel.app` | removed with it (307 redirect to the above) |
| `uxlab-dev.netlify.app` + `main--` alias | site deleted |

**No credentials, customer or patient data** — checked specifically. Repo was always private. Nothing archived (Wayback confirmed empty), nothing linked, and `robots.txt` was 502ing throughout so crawlers were backing off.

### uxlab PRs, all merged

| PR | What |
|---|---|
| [#63](https://github.com/victortolbert/uxlab/pull/63) | Index payloads *withheld* private content instead of hiding it; 9 of 18 unguarded detail routes closed; `useContentAccess` fixed |
| [#64](https://github.com/victortolbert/uxlab/pull/64) | ⌘K palette → `/api/search`; it was shipping every person's role/org/team to any browser that opened it |
| [#65](https://github.com/victortolbert/uxlab/pull/65) | 67 colleague records out of Nuxt Content into `server/data/people/`; all contact details stripped |
| [#66](https://github.com/victortolbert/uxlab/pull/66) | `tech` + `skills` public by default; **`reference` deliberately not flipped** |
| [#67](https://github.com/victortolbert/uxlab/pull/67) | Per-platform dump blocks + in-app middleware |
| [#68](https://github.com/victortolbert/uxlab/pull/68) | `postbuild` deletes dumps from build output |
| [#70](https://github.com/victortolbert/uxlab/pull/70) | `nitro.prerender.ignore` so dumps are never generated; routes 404 not 500 |
| #69, #71 | promotions `develop` → `main` |

`uxlab` `main` is `ed0ef598`; `develop` is identical (0 ahead). **`nuxt-kickstart` was not touched.**

[ADR-0002](https://github.com/victortolbert/uxlab/blob/main/docs/adr/0002-confidentiality-is-enforced-by-location.md) records the decision: **`visibility` is editorial state and may ship; confidentiality is enforced by location** — anything genuinely sensitive is not a Nuxt Content collection.

---

## Two things the plan got wrong, both caught by measuring

**1. "Disable the client-side content DB" does not exist.** No `clientDB` flag at any version of `@nuxt/content` (3.15.2). A `private: boolean` *does* exist on the resolved collection and correctly gates dumps — but it is hardcoded `private: name === 'info'`, with the spread applied before the override, so passing it to `defineCollection` is **silently discarded**. Un-prerendering removes the static file but leaves a live handler on the same route.

**2. The invariant chosen in grilling was unachievable as stated.** "No non-public row in any build artifact" fails on **323 legitimate draft files across 24 collections**. It was re-aimed at *confidentiality* (enforced by location) rather than *visibility* (editorial). The problem was never 845 rows — it was **67 person records** wearing a schema default: `reference` is 331/331 private because nothing ever set it.

**3. `reference` was left private on purpose.** The plan was to flip it with `tech` and `skills`. Measuring first found **71 of its 331 docs are employer-specific** (AbbVie/IVY/AEM, including verbatim corporate text and internal design-system docs). Flipping would have published them. Decision: leave private, curate forward into a new public collection if ever wanted. Not a keyword-triageable set — employer content bleeds into docs matching no keyword.

---

## Gotchas discovered this session

These cost real time. Most are the same shape: **a control that looks enforced and isn't.**

**Nuxt Content**

- Blocking the `/__nuxt_content/` **prefix** also blocks `POST /__nuxt_content/<collection>/query`, the SSR query API — takes every server-side content query down. Scope to `/sql_dump.txt`.
- `routeRules: { '/__nuxt_content/**': { prerender: false } }` is **ignored**; the module registers those prerender routes itself. `nitro.prerender.ignore: ['/__nuxt_content/']` **is** the working lever.
- Server middleware returning 404 works in `nuxt dev` and **does nothing in a production build** — Nitro serves `.output/public` from its static handler *before* middleware. Verified only by testing the deployed artifact.
- Dumps are cached in visitors' `localStorage` as `content_collection_<name>` — unretractable once fetched.

**Nuxt/Vue**

- **`$fetch` does not forward request cookies during SSR.** Every rewired page silently degraded to a guest view — admins got 404s while `curl` with the same cookie worked. Use `useRequestFetch()`.
- `authClient.useSession()` is a reactive client store, **empty during SSR**. Reading it in a guard denies content to admins as well as guests, and a 404 for the owner looks exactly like the protection working. Use `fetchSessionIdentity()` (app) / `getRequestViewer(event)` (server).
- **`[field: string]: unknown` on a handler return type collapses the whole response to `never`** at every call site — Nuxt wraps returns in `Serialize<>` and `unknown` is not serialisable. 31 errors pointing nowhere near the cause. Enumerate the fields.

**CI / tooling**

- uxlab's CI `test` job runs **lint + test:unit + typecheck + test:coverage**, plus `preflight check`. `pnpm test` is vitest only — running it alone and pushing will fail CI on typecheck.
- `vercel.json` rejects unknown keys: a `$comment` invalidates the whole file. The Vercel check then fails with a link to the project-configuration docs — that link *means* "invalid config".
- `.output/server/index.mjs` will not boot locally: `rolldown` and `lightningcss` leak into the server bundle without their platform bindings. This is also why Netlify's SSR function was 502ing on every dynamic route for at least 3 days.

**Hosting**

- Netlify password protection on a project **does not protect a domain served by Vercel**. `uxlab.designcoder.net` showed as protected on a Netlify project that was not serving it.
- Vercel SSO protection defaults to `all_except_custom_domains` — every `*.vercel.app` gated, the custom domain wide open. That was the entire remaining leak.
- Vercel *Advanced Deployment Protection* (password) and Vercel Authentication for production are **plan-gated**; neither was available.
- **Cloudflare proxy on (orange cloud) blocks Railway cert issuance** — Railway can't see the CNAME resolve to itself. With SSL/TLS mode Flexible it also causes an **infinite redirect loop** (Cloudflare → HTTP → Railway 301s to HTTPS → repeat). Grey-cloud it.

**Carried forward, still true:** `commitlint --from X --to Y` is unreliable — lint one commit at a time via stdin. `pnpm add` does not re-run `prepare`. `@commitlint/types` is a phantom dependency in both consumers. A GitHub runner-allocation failure looks exactly like a test failure (`gh run rerun <id> --failed`). zsh expands `--include=*.ts` and `app/pages/*/[...slug].vue` before git/grep see them — quote them.

---

## The method lesson, five more times

SPEC §10's caution — counting is necessary and not sufficient — recurred all session, always as **a green check standing in for a property nobody verified**:

1. `label-has-for` passing while labels were wrong *(carried from the last handoff)*
2. `visibility` filtering in a computed, after the payload was already serialised
3. `useContentAccess` failing closed for admins
4. **`test/unit/use-content-access.test.ts`: 18 tests, 23 assertions, every one a `readFileSync` + `toContain` against the composable's source.** It passed throughout the period the composable 404'd every admin, and went red *only when the bug was fixed*. One case (`uses Better Auth session`) still passed against a comment explaining why we stopped using that API. Replaced with real behaviour tests of the extracted pure functions.
5. My own middleware — worked in dev, did nothing in production, "verified" against the wrong artifact.

**Test the thing that actually ships.** The `sql_dump` leak was invisible in dev and only appeared by decoding a production build.

---

## Infrastructure changes made

- **Netlify site `uxlab-dev` deleted.** Env vars archived first to `~/Archive/uxlab-netlify-env-2026-08/` (21 keys, chmod 600).
- **Vercel project `uxlab` deleted.** Archived to `~/Archive/uxlab-vercel-env-2026-08/` (43 prod / 43 preview / 23 dev).
- **`uxlab.designcoder.net` now served by Railway**, own Let's Encrypt cert, Cloudflare proxy off.
- Railway is now the **only** host. `/`, `/glossary`, `/people`, `/reference`, `/api/health/content` all 200; every `sql_dump.txt` 404 with 0 emails.

**18 secrets were duplicated across Vercel and Netlify** (`BETTER_AUTH_SECRET`, `NUXT_OAUTH_GITHUB_CLIENT_SECRET`, `TURSO_AUTH_TOKEN`, `TWILIO_AUTH_TOKEN`, `RESEND_API_KEY`, `NUXT_SESSION_PASSWORD`, …). Railway holds a third copy of most. **Deleting hosts removed copies and rotated nothing.**

---

## Open

- **`preflight#21`** — the only open PR. Docs: non-interactive release form (`pnpm exec bumpp <version> --yes`) + SPEC §10.3 re-measured (both consumers now SHA-pin everything). Green, unreviewed.
- **Secret rotation** — the 18 above are still live wherever configured. `NUXT_SESSION_PASSWORD` is the shipped-placeholder one. Delete both `~/Archive/*-env-2026-08/` backups once done.
- **The CI assertion from ADR-0002** (PR 5 of 5, never written) — scan built output for contact-detail patterns and confirm no confidential collection ships. Must also run against **preview** builds; every PR in this series produced a preview serving its own copy. Note a naive phone regex matches ISO dates (`2026-01-23`) — anchor it.
- **1.0.0** — still gated by SPEC §11's "migration for partially-adopted repos", per ADR-0010. Unchanged.
- **ADR-0006's precondition** — no commit has touched either consumer's `package.json` or lockfile since preset adoption, so the SHA-pins still have not survived a dependency bump.
- **SPEC §10.4–10.8** — §10.4 (eslint) was re-measured this session and **reverses**: 358/361 rules identical on `nuxt.config.ts`, 487/517 on `app.vue`, zero severity disagreements. The remaining divergence is `@antfu/eslint-config` version skew (9.0.0 vs 9.2.0), one content-driven `filename-case` entry, and the documented a11y suppressions. **There is no style dispute.** §10.5–10.8 remain unmeasured.
- **19 a11y hits outside uxlab's component showcase**, in 8 real shipping components — the config comment claims those 10 suppressions are "tripped only by the showcase", which measurement contradicts. Narrowing them to `app/pages/cwds/**` + `app/pages/examples/**` surfaces genuine defects. None is `no-aria-hidden-on-focusable` (the untunable one, 87 of 124, all in the showcase).
- **uxlab dump routes return 404 via `prerender.ignore`.** `scripts/strip-content-dumps.mjs` remains as a backstop and is now a no-op.

---

## Suggested skills

- **`/code-review`** before any `develop` → `main` promotion in uxlab. It has now earned its keep twice: four defects last time, and this time it was the *e2e suite* that caught a block rule which would have swapped a data leak for a site-wide outage.
- **`/grilling`** for the remaining SPEC §10 items and for 1.0.0. It produced ADR-0002 here, and its most valuable output was discovering that the invariant being proposed was unachievable.
- **Not `/tdd`** — the open items are a rotation, a CI check, and two decisions.

---

*No secrets are recorded here. Two archive directories under `~/Archive/` contain live secret values at chmod 600 and are deliberately outside any git repo; both carry READMEs saying so. `~/.npmrc` still holds a live npm auth token — rotating it is cheap if session transcripts are retained.*
