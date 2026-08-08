# Handoff — Preflight & consumers, 2026-08-07

Replaces `2026-08-06-commitlint-preset-shipped.md`, deleted in the same commit. Everything from it that was still live is inlined below — do not go looking for it in git history.

Primary working directory: `~/Projects/preflight-pkg`.

---

## Read these first, and do not re-derive them

| Artifact | What it settles |
|---|---|
| [uxlab#51](https://github.com/victortolbert/uxlab/pull/51) | commitlint adoption, with the end-to-end verification output |
| [nuxt-kickstart#7](https://github.com/victortolbert/nuxt-kickstart/pull/7) | same adoption, plus the `prepare` hook-install fix that repo still needed |
| [nuxt-kickstart#4](https://github.com/victortolbert/nuxt-kickstart/pull/4) | branch reconciliation — why the merge was safe |
| [nuxt-kickstart#5](https://github.com/victortolbert/nuxt-kickstart/pull/5) | why generated email HTML is not linted |
| `nuxt-kickstart/docs/adr/0004-commit-maizzle-build-output.md` | why that HTML is committed at all, and when to undo it |
| [ADR-0007](../adr/0007-commitlint-presets-are-consumed-via-extends.md), [ADR-0008](../adr/0008-commit-linting-is-opt-in.md) | preset consumed via `extends`; commit linting is opt-in |
| `AGENTS.md` → **Evidence**, and `docs/agents/evidence-grading.md` | the repo rule on empirical claims |
| `~/.claude/.../memory/consuming-repo-branch-models.md` | **nuxt-kickstart PRs → `main`; uxlab PRs → `develop`.** Deliberate asymmetry |

---

## State, measured 2026-08-07T20:25Z

| Repo | Branches | Checked out | In sync | Dirty |
|---|---|---|---|---|
| `preflight-pkg` | `main` only, at `v0.2.0` | `main` | yes | no |
| `uxlab` | `main`, `develop` | `develop` | yes | 1 file, see below |
| `nuxt-kickstart` | `main` only, at `2f81e4c` | `main` | yes | no |

`uxlab` is `develop` **+8** / `main` +2 (the two `main`-only are merge commits #45, #42). **Re-measure rather than trusting this table** — it has been wrong before, and this document's own claims were wrong twice in one day (see the method note):

```bash
git ls-remote --heads origin
git rev-list --count origin/main..origin/develop
git status --short && git log --oneline @{u}..HEAD
```

`uxlab`'s one dirty file is `.claude/settings.local.json`, rewritten by the `prepare` hook on every install. **Never commit it.** Its two stashes still exist, both `skilld` regenerations, almost certainly droppable, left alone because they are the user's.

---

## The live item: `uxlab` has 8 commits unreleased to `main`

```
9fb6173d chore(secrets): add 1Password service account wizard
559d4002 test(e2e): resolve GitHub OAuth credentials through 1Password
8c9ea477 fix(auth): register GitHub provider only when credentials are set
56dad286 fix(a11y): scope aria-allowed-attr past Nuxt UI accordion trigger
0f95be0d chore: adopt Preflight's commitlint preset (#51)
8e0006ab chore(skills): remove local duplicate Matt skills
1b4d4e77 fix: install git hooks on prepare (#50)
e5d60e5b fix(railway): resolve native bindings for every bundled copy (#49)
```

The convention is a `develop`→`main` PR (cf. #45, #42, #38). **Nobody has said this is a release point — do not open it unprompted.**

The top four were pushed **straight to `develop` with no PR**, by a session running in parallel with the one that produced this document. Every other recent change went through one. Not necessarily wrong, but it means those four have never been through CI on a pull request, and `/code-review` before any promotion is worth the time.

Incidental validation: all four pass the `commit-msg` hook installed by #51 — the preset holds against real unplanned commits, not just the test cases in #51's body.

---

## Gotchas, recorded nowhere else

### Carried forward from the 2026-08-06 handoff — still live

**`commitlint --from X --to Y` is unreliable.** The range form — the standard CI recipe — mangles commit bodies. Against `@commitlint/cli` 21.2.1 it inserted blank lines into bodies and reported **14 `body-max-line-length` errors on a corpus whose longest body line is 83 characters**, plus 6 spurious `footer-leading-blank` warnings. Linting the same commits one at a time via stdin reports zero of both. A conformance figure of 75/100 came from the range form; the true figure is 95/100. **If commit linting is ever wired into CI, do not use the range form without re-checking this.**

**`commitlint --edit <file>` needs a git root.** It fails with `Could not find git root` in a scratch directory. Use stdin (`commitlint < file`) for bulk checks. Parallelising is worth it — ~1.2s per invocation, so 100 commits sequentially exceeds a two-minute timeout.

### New this session

**`pnpm add` does not re-run `prepare`.** Adding `@commitlint/cli` installed the package but left `.git/hooks/commit-msg` absent in *both* repos; `pnpm exec simple-git-hooks` was needed explicitly. Consequence for the team: **anyone with an existing clone of either repo needs one `pnpm install` before the hook appears.** Fresh clones are fine. This is the first measured cost of ADR-0008's unresolved half.

**An installed hook file is not evidence that a repo installs hooks.** `nuxt-kickstart` had a `pre-commit` entry in `package.json` and a `pre-commit` file on disk, but its `prepare` was `skilld update -b` alone — nothing in the repo could have put that file there. Check `scripts.prepare`, not `.git/hooks/`.

**`@commitlint/types` is a phantom dependency in both repos.** It resolves through the pnpm store but is undeclared, and both run a strict layout with no `shamefully-hoist` (`nuxt-kickstart/docs/adr/0003`). Do not type `commitlint.config.ts` with `UserConfig`; both files carry a comment saying so. The same trap applies to any config tempted to import a transitive type package.

**A GitHub runner-allocation failure is indistinguishable from a test failure** in `gh pr checks`, which just prints `test fail`. The tell: `gh run view <id>` shows the annotation *"The job was not acquired by Runner of type hosted"*, the step list is empty, and `--log-failed` returns nothing. Fix is `gh run rerun <id> --failed`, not debugging. Cost ~20 minutes on nuxt-kickstart#6.

**`eslint --no-warn-ignored` suppresses the very message that proves a file is ignored**, so grepping for "ignored" gives a false "still linted". Verify ignore scope with the ESLint API instead:

```bash
node --input-type=module -e "import {ESLint} from 'eslint'
const e=new ESLint(); console.log(await e.isPathIgnored('path/to/file'))"
```

**zsh, per existing memory, bit twice more:** unquoted `--include=*.ts` globs fail with `no matches found`, and `${PIPESTATUS[0]}` is bash — zsh is `$pipestatus` (1-indexed). Prefer running the command plainly and reading `$?`.

---

## Open, genuinely undecided

- **`uxlab` `develop` → `main` promotion.** Eight commits, above. User's call.
- **ADR-0006's precondition is still half-met**, unchanged across three handoffs: both repos SHA-pin every action; neither has carried that through "a few dependency bumps."
- **ADR-0008's unresolved half, now with evidence.** Preflight can ship commit *policy* but cannot cause a *hook* to exist — `package.json` cannot be a managed file, so the `simple-git-hooks` entry sits outside both of SPEC §4's mechanisms. Any future item needing a hook hits the same wall. The `pnpm add` finding above is what that gap costs in practice.

### SPEC §10.1 — re-measured 2026-08-07T20:25Z

The 2026-08-06 handoff's figures **still hold exactly**. An intermediate draft of this document wrongly claimed they had gone stale; they had not.

| | `uxlab` | `nuxt-kickstart` |
|---|---|---|
| `vue-a11y/*` eslint overrides | **13**, all bare `'off'`, no comments | **3** — 2 `'off'`, 1 `'error'` with rationale |
| `a11y.axe.options` (runtime) | **1 scoped rule**, commented, upstream bug referenced | `{}` — empty |

The trap: `56dad286` added an **axe runtime rule** in `nuxt.config.ts`, which is `@nuxt/a11y`'s scanner — a *different mechanism* from `eslint-plugin-vuejs-accessibility`. It changed nothing about the 13.

So §10.1 gains a new divergence axis rather than losing one, and the asymmetry sharpens: `uxlab`'s single axe override is exactly the well-documented kind, while its thirteen eslint suppressions remain undocumented. Whether those thirteen are still needed is still unchecked, and is an `eslint` run rather than a reading exercise. **§10.1 still should not be taken next on its ranking.**

---

## Available and not yet done

**Preflight does not dogfood its own commitlint preset.** Measured: `preflight-pkg` has no `prepare` script, no `simple-git-hooks` block, no commitlint config, and no installed hooks — while both consuming repos now enforce the preset it ships. Whether that matters is a real question, not an oversight to fix on sight: ADR-0008 makes commit linting opt-in, and a package arguably need not opt in to itself. But the asymmetry is now visible and undiscussed.

---

## Recoverable by SHA only — carried forward once more

Three `uxlab` branches deleted in an earlier session, every commit verified already on `develop` by patch-id:

```
2ad70a6e7cc618495600089f500003831c8bb4ce  backup/pre-squash-2ad70a6e7
861a47dd0a4c7da88dbf86d74834e2cea0470d26  docs/skills-catalog-handoff
10d8abeb0c08dd9ac35767c6c3dd1aca756dbc1c  wip/stash-2026-07-27
```

---

## Method note worth carrying

Four times this session the obvious read was wrong, and only measuring caught it:

- The branch divergence *looked* like a risky merge where "merging the wrong way drops one side's work" — the file sets were disjoint and the merge conflict-free. There was no wrong way.
- The 58 lint errors *looked* like an `eslint --fix` — the files were build output, so autoformatting would have looked like a fix and silently regressed on the next `pnpm run build`.
- The §10.1 a11y figures *looked* stale after a new a11y commit landed — two different mechanisms, and the original numbers were untouched.
- `nuxt-kickstart` *looked* hook-capable — a `pre-commit` entry and a `pre-commit` file on disk. Its `prepare` could not install either.

**The last two were errors in earlier drafts of this very document**, and both survived until something re-measured them. A handoff is not a trusted source; it is a set of claims with timestamps. That is the same conclusion the 2026-08-06 handoff reached from §10.2, now with four more data points, and it is why the state table above says re-measure rather than read.

---

## Suggested skills

- **`/grill-with-docs`** — still the right entry point for "which item next, and why this one." Produced the §10.2 result and ADR-0007/0008.
- **`/code-review`** — before any `develop`→`main` promotion in `uxlab`; four of those eight commits never saw a PR review.
- **`/research`** — only if an item turns on external tool behaviour (Maizzle, Nitro presets, pnpm gating) rather than on repo contents.
- **`/run`** — if `uxlab`'s e2e/1Password work needs verifying in the real app.
- **Not `/prototype` or `/tdd`** — the open items are decisions and releases, not new code.

---

*No secrets are recorded here. The `.env.1password` / `.env.e2e.1password` files encountered contain `op://` references rather than credential values; their contents were not captured.*
