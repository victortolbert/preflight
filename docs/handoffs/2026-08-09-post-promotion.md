# Handoff — Preflight & consumers, 2026-08-09

Replaces `2026-08-08-awaiting-release-age-before-adoption.md`, deleted in the same commit. That handoff is **fully spent**: its single live item was a clock, and every "next" item queued behind it is done.

Primary working directory: `~/Projects/preflight-pkg`. Consumers: `~/Projects/nuxt-kickstart`, `~/Projects/uxlab`.

---

## The state, in one line

**Everything landed and promoted. No open PRs in any of the three repos. Nothing is blocked.**

---

## What happened, by reference

The PR bodies carry the measurements and the reasoning; this table is an index, not a summary.

| Repo | PR | What |
|---|---|---|
| nuxt-kickstart | [#8](https://github.com/victortolbert/nuxt-kickstart/pull/8) | `vue-a11y` preset adopted — an **exact no-op**, proven by byte-identical `--print-config` |
| nuxt-kickstart | [#9](https://github.com/victortolbert/nuxt-kickstart/pull/9) | eslint runs in CI |
| uxlab | [#55](https://github.com/victortolbert/uxlab/pull/55) | preset adopted (a real tightening: `label-has-for` off → error, 0 violations) |
| uxlab | [#59](https://github.com/victortolbert/uxlab/pull/59) | 60 standing eslint errors → **0** |
| uxlab | [#57](https://github.com/victortolbert/uxlab/pull/57) | four labelling defects found by review of #54 |
| uxlab | [#58](https://github.com/victortolbert/uxlab/pull/58) | eslint runs in CI |
| uxlab | [#60](https://github.com/victortolbert/uxlab/pull/60) | promotion `develop` → `main` |

`uxlab` `main` is `d9150944`; `develop` is content-identical (0 ahead). `nuxt-kickstart` `main` is `485c956`. Both `main` CI runs: success. **This repo was not touched** — still `v0.3.0`.

---

## Two things the previous handoff got wrong

**1. The 24h release-age wait was never a decision.** It framed waiting as *"chosen deliberately over committing an exclude entry."* Measured: `pnpm config get minimumReleaseAge` returns `undefined`. Nothing sets it in either repo, `~/.npmrc`, `~/.config/pnpm/rc`, or `~/.pnpmrc` — it is pnpm 11's built-in default (1440 min), inherited with an upgrade. Both repos now exempt `@victortolbert/preflight` by **bare name**; rationale is in each `pnpm-workspace.yaml`.

Two facts recorded in those comments so a later tidy-up doesn't undo them: the built-in default is **non-strict** (`minimumReleaseAgeStrict` defaults to `false` unless `minimumReleaseAge` is set explicitly, so writing `minimumReleaseAge: 1440` would make it *stricter*), and the policy runs as a **lockfile verification pass**, not only as resolution steering.

**2. The `controlComponents` case got weaker after adoption, not stronger.** The previous handoff deferred it expecting evidence from both repos to accumulate. It did the opposite: uxlab#54 had already resolved all three sites with an explicit `for`/`id` pair, and nuxt-kickstart has none. **Closed for now.** Revisit only if the pattern recurs — uxlab is a design-system lab, so a future `<label><UControl/></label>` pays the same tax.

---

## Gotchas discovered this session

**Stacked PRs: retarget dependents *before* merging the parent.** Merging with `--delete-branch` deletes the base branch, which **auto-closes** every PR stacked on it — and GitHub will not reopen a PR whose base is gone (`Could not open the pull request`). This cost a PR: #56 had to be reopened as #59.

**A stacked PR runs almost no CI.** Both consumers' `test.yml` triggers only on PRs targeting `main`/`develop`, so a PR based on a feature branch gets Gate + Vercel and nothing else. Verify locally, or retarget before trusting a green tick.

**`pnpm exec eslint` corrupts `--format json` in uxlab** — pnpm prints `Already up to date` to **stdout**. Use `./node_modules/.bin/eslint` directly.

**`unicorn/filename-case` cannot express "directory only."** It early-returns for the *whole file* when any path segment matches `ignore` (`rules/filename-case.js` tests `pathSegments`, which includes the basename), so filenames under `[podcastId]/` go unchecked however the pattern is anchored. Anchoring still matters: unanchored, it also matched stray files and made the two patterns above it dead config.

**`UCheckbox` has no default slot.** It renders only `props.label` / `slots.label` / `props.description`, so `<UCheckbox>Some text</UCheckbox>` never renders that text. Only two call sites in uxlab use the `label` prop; assume others may be silently nameless.

**`vue/define-macros-order` explains the "unrelated reordering" in #54.** Adding `useId()` declarations pushes `defineProps` down and `--fix` moves it back up. Review flagged it as scope creep; it is mechanical. Declare new consts *after* the macros.

**Carried forward, still true:** `commitlint --from X --to Y` is unreliable — lint one commit at a time via stdin, rationale in this repo's `.github/workflows/ci.yml`. `pnpm run release -- <version> --yes` does not forward `--yes`; use `pnpm exec bumpp <version> --yes` — **`docs/releasing.md` still documents the form that hangs, and is worth a one-line fix.** `pnpm add` does not re-run `prepare`. `@commitlint/types` is a phantom dependency in both consumers. A GitHub runner-allocation failure looks exactly like a test failure (`gh run rerun <id> --failed`).

---

## The method lesson, twice more

SPEC §10's ordering caution records that **counting is necessary and not sufficient**. It recurred twice this session, and both times the tell was the same: **a green rule standing in for a resolved name.**

A two-axis review of the promotion payload found four defects in uxlab#54 — a PR whose entire purpose was improving accessibility — **three of which made a screen reader's experience worse than before it**. A checkbox group announced as the wrong heading; a `<label>` deleted rather than associated; two `aria-labelledby` values landing on roleless divs. All of them consistent with `label-has-for` passing.

The same shape appeared in this session's own work: the `unicorn` ignore pattern written for #59 was over-broad, and only the review caught it. Worth carrying: **fixing findings rather than filing them is what surfaced the `define-macros-order` explanation** — the review's "scope creep" finding was wrong, and only reproducing the error showed why.

---

## Open, genuinely undecided

- **`[podcastId]` → `[podcast-id]`** in uxlab server routes. Would delete the filename-case ignore entirely, but renames the route params those directories declare across ~96 references. A route-surface change, not a lint fix. `[episode-id]` in the same tree is already kebab, so the convention is inconsistent today.
- **Duplicated `useId()` / `role="group"` blocks** shared by `uxlab/app/components/appearance-panel.vue` and `app/pages/appearance.vue`, ~8 each. A component extraction; review called it a judgement call.
- **1.0.0** — still gated by SPEC §11's *"migration for partially-adopted repos"*, per [ADR-0010](../adr/0010-the-version-contract.md). Unchanged.
- **ADR-0006's precondition** — both consumers SHA-pin every action (verified in the workflows), but neither has carried that through "a few dependency bumps." The eslint CI step was therefore **duplicated per repo on purpose** rather than shared as a Preflight-managed file. Nothing to do but wait for bumps.
- **SPEC §10.4–10.8** were ordered by reasoning, not measurement. Every item measured so far has been reframed. Assume the rest need the same check.
- **uxlab's two pasted Video.js DOM files** remain eslint-ignored; the real fix is mounting a player rather than embedding a snapshot of one.
- **~150 lines of unused wizard boilerplate** in `uxlab/scripts/setup-op-service-account.sh`. Removing it is a decision, not a fix.

---

## Recoverable by SHA only — carried forward once more

Three `uxlab` branches deleted in an earlier session, every commit verified already on `develop` by patch-id:

```
2ad70a6e7cc618495600089f500003831c8bb4ce  backup/pre-squash-2ad70a6e7
861a47dd0a4c7da88dbf86d74834e2cea0470d26  docs/skills-catalog-handoff
10d8abeb0c08dd9ac35767c6c3dd1aca756dbc1c  wip/stash-2026-07-27
```

---

## Suggested skills

- **`/code-review`** before any future `develop` → `main` promotion in uxlab. It earned its keep decisively: four real defects, three of them regressions, in a payload every existing check called green. Run it against the **full promotion payload** (`origin/main`), not just what sits on `develop`.
- **`/grilling`** for the 1.0.0 decision when SPEC §11 resolves, and for the `[podcastId]` rename if it is picked up — both are judgement calls with a hidden blast radius. It produced ADR-0010.
- **Not `/tdd` or `/prototype`** — the open items are a rename, a refactor, and two decisions. Nothing here is built test-first.

---

*No secrets are recorded here. Note that `~/.npmrc` holds a live npm auth token; it was read incidentally while checking pnpm configuration and its value is deliberately absent from this document and from every commit and PR body of this session. Rotating it is cheap if the session transcript is retained.*
