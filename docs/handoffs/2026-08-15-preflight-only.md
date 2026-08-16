# Handoff — Preflight, 2026-08-15

Replaces `2026-08-12-post-spec-10-4.md`, deleted in the same commit. That handoff
**mixed two projects' backlogs**: three of its five Open items were `uxlab`'s own
work, not Preflight's. This one is Preflight-only, and the scope rule it follows
is now written down as **Consumer** in [`CONTEXT.md`](../../CONTEXT.md).

Working directory: `~/Projects/preflight-pkg`.

---

## The state, in one line

**SPEC §10.1–10.5 are closed, `main` is clean, and what remains is three
unmeasured backlog items plus a version gate — but §10.5 shipped a preset that
changes behaviour, and the consumer that needs it has a live production gap until
it adopts.**

---

## The scope correction, because it caused a wrong claim

Preflight is the subject. `nuxt-kickstart` and `uxlab` are **instruments** — they
are measured, and their own product work is their own. The replaced handoff
listed `uxlab`'s credential rotation, its in-flight ADR-0002 PR and its
`develop` → `main` promotion as Preflight Open items. They were never Preflight's.
All three have since been resolved in `uxlab` anyway, which is the point: that
repo does not need Preflight's session to make progress.

The one real coupling runs the other way. §10 items close by **measuring** the
consumers, so consumer *state* is an input. Measured 2026-08-15:

- `uxlab` is 7 commits ahead of `main` on a podcasts run touching `server/`,
  `drizzle/`, `app/`, `test/`, `shared/`, `content/` — and **none** of
  `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `.github/workflows/`,
  `commitlint.config.cjs`, `.nvmrc`. Its `.vue` count is 307 now and 307 across
  all 25 most recent commits.
- `nuxt-kickstart` has not moved since `21b6e11`.

So the churn is invisible to every surface Preflight reads. **Pausing consumer
work would not protect a measurement; it would stall ADR-0006's precondition,**
which is waiting on dependency bumps that only consumer activity produces.

---

## §10.1 was already done, and SPEC said otherwise for six days

The `vue-a11y` preset shipped as `@victortolbert/preflight/vue-a11y` in
[#16](https://github.com/victortolbert/preflight/pull/16) (`406cf03`,
2026-08-07) and was adopted in **both** consumers on 2026-08-09 (`396bb5ff`,
`3eec7f8`) — the same two commits §10.3 already called "the last preset
adoption." Both import it and both are on `^0.3.0`.

SPEC §10.1 nonetheless still read *"What remains to ship is a three-rule
preset"* until this commit. **A session picking up from SPEC's prose would plan
work that was already consumed in production six days earlier** — and one did,
which is how this was found. Corrected in §10.1, including the staleness itself,
because §10.3 records the identical failure mode.

**Method note, since this is now the fifth instance.** §10's own §247 warns that
its ordering was reasoned rather than measured. This is a different failure:
the ordering was fine and the *status* was wrong. Read §10 as a description of
intent, never of the code. `git log -- src/presets/` answers "did it ship" in
one command; the prose does not answer it at all.

---

## Open

- **The application repo serves no security headers in production, and this
  release does not change that.** Shipping the preset is not deploying it. Until
  that repo spreads `@victortolbert/preflight/security-headers` into its
  `routeRules` and redeploys, `uxlab.designcoder.net` continues to return no
  `X-Frame-Options`, no `X-Content-Type-Options` and no `Referrer-Policy`.
  **That is the consumer's item, not Preflight's** — but it is the only open
  finding here with a live effect, and it does not need to wait for a release:
  four lines in its own `routeRules` close it today. See [ADR-0012](../adr/0012-security-headers-are-reclaimed-as-route-rules.md).
- **A release is needed before either consumer can adopt.** `0.3.0` is published;
  the preset is on `main` and nowhere else. §10.5's deliverable is inert until
  then, unlike every v1 file, which changed nothing on adoption by design.
- **Adopting the markdownlint preset changes both consumers, oppositely.** The
  template goes from 281 standing hits to 5 (after `markdownlint --fix`); the
  application repo **loses clean status** unless it carries `MD041: false`
  locally — 37 hits without it. Neither repo runs markdownlint in CI and the
  preset does not change that. Consumers' call, both of them.
- **A credential was committed in both consumers' `.vscode/mcp.json`**, found while
  measuring §10.7 — byte-identical, pushed to both remotes, uxlab since
  2026-01-23. **Rotated.** This repo was never affected and now ignores the file
  (#30). Two things remain, both consumer-side: the dead value is still in `HEAD`
  of both (a normal edit and commit — *not* a history rewrite, which buys nothing
  once rotated), and neither private repo has secret scanning, which needs the
  paid add-on. The vendor's endpoint needs **no key at all**, so the block can be
  deleted rather than replaced.
- **SPEC §10.8 remains unmeasured** — tsconfig, vitest, playwright. Seven for
  seven, measuring has moved the item rather than confirming it, and in every
  direction: §10.5 got **bigger**, §10.6 **dissolved**, §10.7 was **right about
  the file and wrong about the scope**. "The backlog overstates itself" is the
  tempting read and it has been wrong three times running.
- **§10.8 is the one item whose own entry warns about itself** — "version
  differences change results silently rather than loudly." Given §10.7 found a
  Python debug profile and a credential riding along in byte-identical files,
  treat byte-identity as the *start* of a measurement there, not the end of one.
- **ADR-0006's precondition is one bump of "a few."** Both repos SHA-pin every
  action and both survived the `@antfu/eslint-config` 9.3.0 bump. The clock is
  running and it is the consumers' activity that advances it.
- **1.0.0** — gated by SPEC §11's "migration for partially-adopted repos", per
  ADR-0010. Unchanged.

### Resolved: the 301 vs 307 denominator

**301 is the `.vue` files eslint lints under `app/`.** `uxlab` tracks 307, of
which 303 are under `app/`, and eslint ignores 2 of those as vendored Video.js
DOM snapshots — 303 − 2 = 301. The remaining 4 are one stray `error-1.vue` at the
repo root and three inside `uxlab-eds-starter/prototype/`, a nested prototype.
Labelled in ADR-0011 and SPEC §10.4; nothing was wrong, only unlabelled.

Two guesses were checked and both were wrong, which is why this needed measuring
rather than reasoning:

- **"The count grew after the ADRs."** No — `uxlab`'s `.vue` count has been 307
  for at least 120 commits, so 307 was the state when both ADRs were written.
- **"301 is eslint's linted count."** Not quite — eslint ignores only 2 of the
  307, so its global linted count is **305**. The `app/` scoping is the other
  half, and it was the half nobody wrote down.

**Why it hid.** `nuxt-kickstart`'s 159 is simultaneously its tracked count, its
linted count and its `app/` count — all three coincide, because every `.vue` file
it has is under `app/` and none are ignored. So checking the template's figure
against `git ls-files` confirms it, and the same check on `uxlab` does not. **A
denominator that validates in one repo and not the other is the tell.**

Two things closed while resolving it:

- **ADR-0011's "15 unicorn rules" is now reproducible.** The config enables 16 on
  a plain `.ts` file; exactly one, `unicorn/filename-case`, still applies to
  `.vue` via a separate block. 16 − 1 = 15.
- **The 0-violations finding does not depend on the scoping.** Re-running all 15
  rules over the 6 excluded `.vue` files finds **0**, so it holds across all 307.

`ADR-0009` was also miscited here as carrying the 301 figure — it does not
mention it. Only ADR-0011 and SPEC §10.4 did.

---

## Gotchas worth carrying

**Preflight's own tooling**

- **`npm pack --json` changed shape in npm 12** — an array became an object keyed
  by package name. `test/packaging.test.ts` accepts both and throws on a third.
- **Local `npm` is ahead of CI's.** `npm` here is `~/.vite-plus/bin/npm`
  (vite-plus Node 24.19.0, npm 12.0.2); `setup-node` installs a Node 24 whose npm
  is still 11.x. Treat a local-only failure as early warning, not noise.
- **`pretest` runs `build`.** `pnpm test` is build-then-vitest; there is no
  `test:run`. Baseline as of this handoff: **18 files, 118 tests, no type
  errors.**

**Measuring the consumers**

- **`pnpm exec <tool>` prints `Already up to date` on stdout**, which corrupts
  anything piped into a JSON parser. Strip to the first `{` or `[`.
- **`commitlint --from X --to Y` is unreliable** — lint one commit at a time via
  stdin.
- **`@commitlint/types` is a phantom dependency in both consumers**, and the same
  strict pnpm layout is why `src/presets/vue-a11y.ts` declares `RuleEntry`
  locally instead of importing it.
- **`@antfu/eslint-config` 9.1.0 taught `unicorn/filename-case` to report
  directory names separately.** Both repos now carry the same anchored
  `'^\\[([a-zA-Z0-9]+)\\]$'` ignore for route-param directories. The anchoring is
  load-bearing: `ignore` entries test **every path segment**, so an unanchored
  version also matches any file merely containing brackets.
- **`pnpm add` does not re-run `prepare`.**
- A runner-allocation failure looks exactly like a test failure
  (`gh run rerun <id> --failed`).
- zsh expands `--include=*.ts` before git/grep see it — quote it. `rm` is aliased
  to prompt; `timeout` is not installed.

---

## Suggested skills

- **`/grilling`** for §10.5–10.8 and for 1.0.0. It produced ADR-0002 and
  ADR-0011, and the backlog has been wrong about its own contents five times now.
- **Not `/code-review`** — nothing is in flight here.

---

*No secrets are recorded here. `~/.npmrc` holds a live npm auth token. The
`uxlab` credential exposure the previous handoff documented was closed in that
repo on 2026-08-14 (rotation ledger 33 of 33); it is recorded there, and it is
not Preflight's item.*
