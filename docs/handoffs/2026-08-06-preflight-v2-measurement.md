# Handoff — Preflight, 2026-08-06

Written at the end of a long session. Next session's focus: **pick the next v2 item for Preflight, measuring it first.**

Primary working directory: `~/Projects/preflight-pkg`.

---

## Read these first, in order

1. `SPEC.md` — decision-complete for v1. §10 is the v2 backlog and carries the caution that its ordering was reasoned, not measured.
2. `docs/adr/0006-ci-workflows-are-not-yet-shareable.md` — most recent decision; shapes what's next.
3. `CONTEXT.md` — the glossary. Use its vocabulary (*preset*, *managed file*, *unmanaged*, *drift*, *unrecorded*, *dead config*).

Do not re-derive what those files say. This document only covers what is **not** in them.

---

## The standing lesson

**Read the file; don't reason about it.** Five confident claims in this project have turned out to be inferences — see the addendum to ADR-0003, the resolution in ADR-0005, and ADR-0006's closing caution. Two more happened in this session:

- A proposed Dockerfile fix was derived from a *truncated* log line. It was wrong, and only a local test caught it. Reading the resolver source gave the right answer.
- A failing GitHub check named `uxlab - uxlab` was twice described as "Vercel" without opening its target URL. It was Railway — the production deploy.

Both were cheap to check and expensive to assume.

---

## Current state — verify before trusting

Two claims made late in the last session were wrong by the end of it. Re-run these rather than believing the table.

```bash
git ls-remote --heads origin              # in each repo
git rev-list --count origin/main..origin/develop
git rev-list --count origin/develop..origin/main
```

### uxlab (`~/Projects/uxlab`)

- Origin has exactly `main` + `develop`. No stray branches.
- `develop` = `e5d60e5b`, `main` = `8c0da3dd`.
- **`develop` is 1 commit ahead of `main`** — the Railway fix (#49) landed *after* the release PR (#45) merged. They were content-synced at the moment #45 merged and are not any more. Releasing that one commit to `main` is an open decision, not a task.
- Railway is green again. First success since 2026-07-23.

### nuxt-kickstart (`~/Projects/nuxt-kickstart`)

- Origin has `main` + `develop`.
- **`main` and `develop` have genuinely diverged — 3 commits each way, trees differ.** This was missed in the last session and stated incorrectly as "clean, same shape as uxlab."
  - On `main` only: the Preflight adoption (#1), the action SHA-pinning (#2), the `minimumReleaseAgeExclude` comment correction (#3).
  - On `develop` only: three email / lockfile commits (Resend test sender defaulting, a docs note, a stale lock file removal).
  - So **`develop` has never received the Preflight adoption** — no `preflight-lock.json`, and `taze.config.ts` still holds inline config rather than the preset import.
- Reconciling this is probably the highest-value small task available, and it is a genuine decision (merge which direction? is `develop` even the working branch here?) rather than a mechanical one.

---

## Work completed last session

All merged; read the PRs rather than re-deriving. Each has a body explaining what was measured.

| Repo | PR | What |
|---|---|---|
| nuxt-kickstart | [#2](https://github.com/victortolbert/nuxt-kickstart/pull/2) | SHA-pin every GitHub Action |
| nuxt-kickstart | [#3](https://github.com/victortolbert/nuxt-kickstart/pull/3) | Correct the `minimumReleaseAgeExclude` note |
| uxlab | [#48](https://github.com/victortolbert/uxlab/pull/48) | Dependency update + the two typecheck breaks it surfaced |
| uxlab | [#47](https://github.com/victortolbert/uxlab/pull/47) | SHA-pin every GitHub Action |
| uxlab | [#46](https://github.com/victortolbert/uxlab/pull/46) | Adopt `@victortolbert/preflight` |
| uxlab | [#45](https://github.com/victortolbert/uxlab/pull/45) | Release `develop` → `main` (225 commits) |
| uxlab | [#49](https://github.com/victortolbert/uxlab/pull/49) | Railway: resolve native bindings for every bundled copy in `.output` |

Three uxlab branches were deleted after verifying every commit was already on `develop` by patch-id. Recoverable by SHA if ever needed:

```
2ad70a6e7cc618495600089f500003831c8bb4ce  backup/pre-squash-2ad70a6e7
861a47dd0a4c7da88dbf86d74834e2cea0470d26  docs/skills-catalog-handoff
10d8abeb0c08dd9ac35767c6c3dd1aca756dbc1c  wip/stash-2026-07-27
```

Two stashes remain in the uxlab checkout, both `skilld` regenerations that the `prepare` hook rebuilds on every install. Almost certainly droppable; left alone because they are the user's.

---

## Dated facts

**`minimumReleaseAgeExclude` for `@victortolbert/preflight`.** Both repos pin `^0.1.1`; **nothing is on 0.1.2 yet.** 0.1.2 was published `2026-08-05T23:28:32Z`, so its 24h gate lifts **2026-08-06 23:28 UTC**. The exclude entries stay load-bearing until something bumps to 0.1.2 *and* that version has aged out. Dropping them earlier breaks installs in both repos.

Measured last session against pnpm 11.20.0: both bare (`pkg`) and versioned (`pkg@version`) exclude entries match. A repo comment claiming otherwise was corrected in nuxt-kickstart #3.

---

## Open questions, not tasks

- **ADR-0006's precondition is half-met.** Both repos now SHA-pin every action. The ADR also requires that the pinning *survive a few dependency bumps* before it counts as shared policy rather than one person's half-finished migration. Only the first half happened.
- **`vite` is in uxlab's production server bundle** (2.8 MB), pulled in by `@maizzle/framework`, which `server/utils/maizzle.ts` imports to render emails per request. #49 makes it work correctly. Whether a bundler belongs in a runtime path is unmeasured.
- **Nothing verifies uxlab's production build except Railway.** `test`, `e2e`, Vercel and Netlify were all green on the commit whose container would not boot. #49 adds a build-time boot check inside the Dockerfile, which is the only gate that covers this class.

---

## Environment gotchas (uxlab / Railway)

Also saved as a memory (`uxlab-railway-verification`). Each cost real time to rediscover.

- **The Railway CLI is not on `PATH`** in Claude Code sessions. It is at `/Users/victortolbert/.railway/bin/railway`, and auth already lives on disk, so the absolute path works with no login. (Do not read or share `~/.railway/config.json` — it holds the token.)
- **Railway builds `develop` and only `develop`** — 20 of 20 deployments. A PR branch gets no Railway build, so *merging is the verification*. Weigh that before suggesting "just open the PR."
- **Local Docker builds `linux/arm64`; Railway builds `linux/amd64`.** pnpm installs only the optional platform package matching the build arch, so anything hardcoding a platform triple passes on Railway and fails locally. A green local build is strong evidence, not proof.
- **The build asks Node for an 8 GB heap; Docker Desktop has 7.7 GB**, so `pnpm run build` gets OOM-killed (exit 137) unpredictably. Prune build cache first.
- Every Dockerfile edit invalidates `COPY . .`, so each iteration is a full ~8-minute rebuild. Batch changes.

Also: `pnpm install` triggers a `prepare` hook running `skilld update -b`, which rewrites files under `.claude/skills/`. They will show as modified constantly. Not your changes; do not commit them.

---

## Suggested skills

- **`/grill-with-docs`** — the main-flow entry point for sharpening a decision against an existing codebase, and it leaves a paper trail in `CONTEXT.md` and ADRs. The right tool for "which v2 item, and why this one." This project's decisions have consistently been improved by being interrogated before being acted on.
- **`/research`** — if a v2 item turns on external facts (a tool's actual behaviour, a config format) rather than on what the repos contain.
- **`/domain-modeling`** — if the work produces a decision worth an ADR, or if `CONTEXT.md`'s vocabulary needs extending. Every significant call in this project so far has landed as an ADR.
- **`/code-review`** — before merging anything non-trivial into the consuming repos.
- Avoid `/ask-matt` for routing here; the flow is already known.

---

## Suggested opening move

Do **not** promote a v2 item on the strength of its position in SPEC §10. Item 3 was ranked from an audit that characterised the drift correctly but never counted it, and counting reversed the conclusion (ADR-0006). Items 1, 2, and 4–10 were ordered by the same method.

Pick a candidate, then measure it against both consuming repos before committing to it — the same test ADR-0003 applied to dead config: *is the tool installed, and does anything invoke it?*

The two cheapest measurable candidates:

- **§10.1, the accessibility gap** — named as the only divergence with user-facing consequence. Count it.
- **§10.2, revive commit linting** — needs a dependency and a `commit-msg` hook, not just a config file. Check whether either repo has either.

And one non-Preflight task that may be worth doing first because it is small, concrete, and currently wrong: **reconcile nuxt-kickstart's `main` and `develop`.**
