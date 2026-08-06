# Handoff — Preflight, 2026-08-06 (evening)

Replaces the earlier handoff of the same date, which is now spent. Its subject — *pick the next v2 item, measuring it first* — was carried out: SPEC §10.2 was measured, reframed, built, released as **0.2.0**, and its prerequisite fixed in `uxlab`.

Next session's obvious candidate: **SPEC §10.1, the accessibility gap** — partly measured already, see below.

Primary working directory: `~/Projects/preflight-pkg`.

---

## Read these first

1. [ADR-0007](../adr/0007-commitlint-presets-are-consumed-via-extends.md) and [ADR-0008](../adr/0008-commit-linting-is-opt-in.md) — the two decisions from this session.
2. `SPEC.md` §10.2 (rewritten) and the caution paragraph closing §10.
3. `AGENTS.md` → **Evidence**. The "read the file, don't reason about it" lesson that previous handoffs kept restating is now a repo rule in `docs/agents/evidence-grading.md`. It does not need repeating here.

Do not re-derive what those say. This document covers only what is **not** in them.

---

## State, measured at 2026-08-06T14:15Z

| Repo | Branches | Checked out |
|---|---|---|
| `preflight-pkg` | `main` only, at `v0.2.0` | `main` |
| `uxlab` | `develop` +2, `main` +2 — diverged | `develop` |
| `nuxt-kickstart` | `develop` +3, `main` +3 — diverged | `main` |

`uxlab`'s two `main`-only commits are merge commits (#45, #42); the two `develop`-only are #49 (Railway) and #50 (hook install). Nothing was released to `main` this session.

Re-run rather than trusting the table — this has been wrong before:

```bash
git ls-remote --heads origin
git rev-list --count origin/main..origin/develop
```

---

## The one time-boxed item

**`@victortolbert/preflight@0.2.0` published `2026-08-06T13:57:58Z`. Its 24-hour pnpm gate lifts `2026-08-07T13:57:58Z`.**

`uxlab` still pins `^0.1.1` (`package.json:134`) and excludes `@victortolbert/preflight@0.1.1` (`pnpm-workspace.yaml:106`). After the gate lifts, adoption is: bump the pin to `^0.2.0`, update that exclude entry to `@0.2.0` **or drop it** — check whether it is still load-bearing before deleting, since `^0.2.0` will then resolve to an aged-out version — and add three things Preflight cannot write:

```bash
pnpm add -D @commitlint/cli
```
```ts
// commitlint.config.ts   (delete the existing dead commitlint.config.cjs)
export default { extends: ['@victortolbert/preflight/commitlint'] }
```
```jsonc
// package.json
"simple-git-hooks": { "commit-msg": "pnpm exec commitlint --edit $1" }
```

`"prepare": "skilld update -b && simple-git-hooks"` is already in place as of #50, so the hook installs on the next `pnpm install` with no manual step.

Adopting *before* the gate needs a `minimumReleaseAgeExclude` bypass, which the standing preference is to avoid — wait and pin exactly instead.

---

## Two gotchas that cost real time, and are not recorded anywhere else

**`commitlint --from X --to Y` is unreliable.** The range form — the standard CI recipe — mangles commit bodies. Against `@commitlint/cli` 21.2.1 it inserted blank lines into bodies and reported **14 `body-max-line-length` errors on a corpus whose longest body line is 83 characters**, plus 6 spurious `footer-leading-blank` warnings. Linting the same commits one at a time via stdin reports zero of both. A conformance figure of 75/100 came from the range form; the true figure is 95/100. **If commit linting is ever wired into CI, do not use the range form without re-checking this.**

**`commitlint --edit <file>` needs a git root.** It fails with `Could not find git root` in a scratch directory. Use stdin (`commitlint < file`) for bulk checks. Parallelising is worth it — ~1.2s per invocation, so 100 commits sequentially exceeds a two-minute timeout.

---

## §10.1, if it is next — what is already counted

The two repos **agree** on accessibility far more than SPEC §10.1 implies: identical `@nuxt/a11y` (`1.0.0-alpha.1`), identical `eslint-plugin-vuejs-accessibility` (`^2.5.0`), byte-identical `axe-linter.yml`, and `a11y: true` at line 30 of both `eslint.config.mjs`.

The divergence is *only* which rules get silenced:

- `uxlab` — **13** `vue-a11y/*` overrides, all bare `'off'`, **no comment on any of them**
- `nuxt-kickstart` — **3**: two `'off'`, one `'error'` with a written rationale

`nuxt-kickstart`'s two (`no-autofocus`, `media-has-caption`) are a **subset** of `uxlab`'s thirteen, so the agreement is nested, not absent. The asymmetry that matters: the template's block reads as policy, the application's reads as undocumented debt suppression on a real codebase. "Ship the agreement" therefore has a real but small answer — the nested pair — and the interesting question is whether `uxlab`'s other eleven are still needed, which nobody has checked. That check is `eslint` runs, not reading.

This is written down because it is measured, not because §10.1 should be taken next on its ranking. It should not.

---

## Open, and genuinely undecided

- **`nuxt-kickstart`'s branch divergence.** 14 files, 3 commits each way. `main` has the Preflight adoption, the action SHA-pinning, and the `minimumReleaseAgeExclude` correction; `develop` has three email/lockfile commits and **has never received Preflight** — no `preflight-lock.json`, and `taze.config.ts` still holds inline config. Which branch is authoritative is not answerable from the repo, and merging the wrong way drops one side's work. This blocks adopting the commitlint preset there.
- **ADR-0006's precondition is still half-met.** Both repos SHA-pin every action; neither has yet carried that through "a few dependency bumps."
- **ADR-0008's unresolved half.** Preflight has no mechanism to cause a git hook to exist — `package.json` cannot be a managed file, so the `simple-git-hooks` entry is outside both of SPEC §4's mechanisms. Any future item needing a hook hits the same wall.

---

## Small and concrete

- **`README.md` line 5 says "Status: built, not yet published."** Four releases stale. Left alone deliberately — it is a claim about release status, not part of the commitlint work.
- **`uxlab` carries two stashes**, both `skilld` regenerations the `prepare` hook rebuilds on every install. Almost certainly droppable; left alone because they are the user's.

  ```
  stash@{0}  On develop: skilld regeneration on develop
  stash@{1}  On pin-ci-actions: skilld regeneration
  ```
- **`uxlab` shows three permanently-modified files** under `.claude/skills/`. The `prepare` hook rewrites them on every install. Not your changes; do not commit them.
- **Three `uxlab` branches were deleted in an earlier session**, every commit verified already on `develop` by patch-id. Recoverable by SHA only, so they are carried forward once more:

  ```
  2ad70a6e7cc618495600089f500003831c8bb4ce  backup/pre-squash-2ad70a6e7
  861a47dd0a4c7da88dbf86d74834e2cea0470d26  docs/skills-catalog-handoff
  10d8abeb0c08dd9ac35767c6c3dd1aca756dbc1c  wip/stash-2026-07-27
  ```

---

## What this session shipped

Read the PRs rather than re-deriving; each body carries what was measured.

| Repo | PR | What |
|---|---|---|
| preflight | [#9](https://github.com/victortolbert/preflight/pull/9) | opt-in commitlint preset + ADR-0007, ADR-0008 |
| preflight | — | `v0.2.0` published via OIDC, provenance verified from the registry |
| uxlab | [#50](https://github.com/victortolbert/uxlab/pull/50) | install git hooks on `prepare` |

**The shape of the §10.2 result is worth carrying forward as a pattern.** The backlog entry described a missing guardrail. Measuring found the convention already followed at 95/100 with no enforcement at all, and all six deviations were the *stock config* being wrong rather than the commits — so the deliverable became the tuned ruleset, and enforcement a side benefit. That is the second data point against §10's ordering, and it fell the *opposite* way from ADR-0006: measuring vindicated the item while changing what it was for. Neither outcome is predictable from a backlog entry, which is the actual argument for measuring first.

---

## Suggested skills

- **`/grill-with-docs`** produced this session's result and both ADRs. It remains the right entry point for "which v2 item, and why this one."
- **`/research`** if an item turns on external tool behaviour rather than on what the repos contain.
- **`/code-review`** before merging anything non-trivial into the consuming repos.
