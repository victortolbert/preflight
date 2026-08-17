# Migration for partially-adopted repos needs no new CLI surface

[ADR-0010](./0010-the-version-contract.md) gates 1.0.0 on one thing: *"1.0.0 ships when SPEC §11's 'migration for partially-adopted repos' resolves. That is the one open item that plausibly wants CLI surface."* Measured, it does not want any. **What migration needed was one word changed in the output.** The gate is discharged and 1.0.0 is due.

This ADR also records that §11's population was three different things wearing one sentence, and that the mechanism was tested against a real repo rather than reasoned about.

## The population, which §11 described without counting

SPEC §11 read: *"several projects carry a subset of the tooling."* True, and — like every §10 entry before it — written by someone who had not opened them. Surveying all 31 directories in `~/Projects`, 8 carry at least one managed file with Preflight uninstalled:

| Repo | Last commit | Stack | `.nvmrc` | `.editorconfig` |
|---|---|---|---|---|
| `cwds` | 2026-07-26 | pnpm, eslint, commitlint, Nuxt | `22` | 188 B |
| `ams-cloud-eds` | 2026-07-24 | pnpm, eslint, commitlint, Nuxt | `22` | 188 B |
| `aem-eds` | 2026-07-28 | **npm**, eslint, no Vue | — | 48 B |
| `eds-block-lab` | 2026-07-31 | **npm**, eslint, no Vue | — | 48 B |
| `llm-viz` | 2026-06-17 | pnpm, no eslint/commitlint | `22` | — |
| `starter-kit` | **2024-01-21** | pnpm, eslint, commitlint | — | 190 B |
| `victortolbert.com` | **2024-04-16** | pnpm, eslint, Vue | `20` | 188 B |
| `vticonsulting.com` | **2023-11-29** | pnpm, eslint, Vue | `20` | 188 B |

**Not one of the eight matches what Preflight ships, on any file it carries.** Zero would land in `unrecorded` — the benign no-op state SPEC §2's adoption dividend depends on. Every one of them fails on first contact. That is the reverse of the two consuming repos, where adoption *was* a no-op by construction, and it is the sense in which §11 understated rather than overstated: the subset these repos carry does not merely differ in coverage, it disagrees in content.

But three groups hide in that table:

- **Two real candidates** — `cwds` and `ams-cloud-eds`, active and structurally indistinguishable from the repos already onboarded.
- **Two active repos on npm with no Vue**, for which most presets are inert. Out of scope; see Consequences.
- **Four that are not candidates** — three untouched since 2023–2024, one with essentially no tooling.

So the item is not a feature. **It is two adoptions**, of repos that look exactly like the two done already.

## What a migration actually does, run rather than reasoned

`cwds`'s files were copied into a scratch directory and the CLI run against them.

`preflight check` reported three failures and exit 1. `preflight sync` printed a full unified diff of all three — `.nvmrc` `22` → `v24`, `.editorconfig` 188 B → 986 B, `axe-linter.yml` created — and then **refused to write**, because there was no TTY to confirm at. Every affordance a migration needs was already there: the diff comes first, nothing is written unasked, and the per-file advice names both remedies.

Two frictions surfaced, and only one is a defect.

**Not a defect: the confirmation is all-or-nothing.** Keeping your `.nvmrc` while taking `axe-linter.yml` means aborting, writing `preflight.config.ts`, and re-running. A per-file prompt would collapse that into one pass. It is worth building if a migration ever proves annoying; two repos is not that evidence, and building it now would be inventing surface to satisfy a gate.

**A defect: `check` called it drift.** `CONTEXT.md` defines **drift** as *"divergence in a managed file that has not been declared"* — which presumes an agreement to have diverged from. A repo mid-migration never made one. In its CI, `drift` reads as *you broke something*; what happened is *you have not adopted yet*. The tool was accusing the one audience it should have been orienting, using a word its own vocabulary document defines against that use.

Fixed by splitting a `not-adopted` state out of `drifted`, keyed on the absence of a lock file entirely. **The gate is deliberately unchanged** — same exit 1, and ADR-0010's reasoning for it stands: a project with no lock has not been set up, so a managed file that is absent or different is worth failing on. Only the wording moved.

## Considered Options

- **Build `preflight adopt`.** Rejected. It would be a third command whose whole job is what `sync` already does with a diff and a prompt, justified by a population of two. SPEC §4 rejected inventing mechanisms where the ecosystem provides one; this is the same argument one level up.
- **Add per-file selection to the `sync` prompt.** Not rejected — deferred, and explicitly declared *not contract surface* below, which is what lets 1.0.0 go ahead without it.
- **Add flags (`--only`, `--except`).** Rejected more firmly than the prompt. Flags **are** covered by ADR-0010's contract, so adding them after 1.0.0 is cheap but removing them is a major. `preflight.config.ts`'s `unmanaged` already expresses "keep mine" as a recorded, reviewable decision, which SPEC §6 argues is better than a flag precisely because it survives the invocation.
- **Ship migration surface, then cut 1.0.0.** Rejected as backwards: it builds to satisfy a gate rather than a need, and the gate exists to prevent exactly that kind of unforced surface.
- **Leave §11 open and stay 0.x.** Rejected. ADR-0010 already rejected zerover on the grounds that the costs of being public are paid; leaving a resolved item nominally open to avoid the decision would be the same evasion with extra steps.

## Consequences

**1.0.0 is unblocked, and "resolve" meant decide.** ADR-0010's gate was ambiguous between *build the migration surface* and *decide it needs none*. It is the latter, because the gate's purpose was to stop the CLI moving after a major froze it — and a reasoned "it needs nothing," written down, discharges that as well as building would.

**The per-file prompt is not contract surface, and this is the load-bearing sentence.** ADR-0010 covers *"CLI commands and flags · exit codes."* An interactive prompt adds no command, no flag, and changes no exit code. So the one plausible future migration change **does not need a major's permission**, and 1.0.0 does not have to wait for a decision about it.

**`CheckState` gained a state, and it is not public.** `src/index.ts` exports `ManagedFile`, `PreflightConfig` and `definePreflightConfig` — nothing else. `CheckState` is internal, so `not-adopted` is not a contract change and this ships as a patch. The internal `hasDrift`/`driftedFiles` pair became `hasFailures`/`failingFiles`, with `driftedFiles` and `notAdoptedFiles` naming the two halves; collapsing them under drift's name would have put the same vocabulary error into the API that this ADR fixes in the output.

**The npm repos are a named non-goal, not an oversight.** `aem-eds` and `eds-block-lab` are active and technically unblocked — nothing in `src/` requires pnpm, and the two `pnpm` mentions there are comments explaining why presets declare types locally, which makes the code *more* portable rather than less. But neither has Vue or commitlint, so most presets are inert for them, and neither has a `.nvmrc` to check the `node >=24` floor against. Adopting them would be testing the package's portability under cover of a migration item. Worth doing deliberately, as its own question.

**ADR-0014's sample has a measured limit**, found here and recorded there rather than in this ADR, because that is where someone checks the `.editorconfig` reasoning. `cwds` sets `charset` and `end_of_line` — the two keys ADR-0014 omitted as unmeasured silence — and `[*.md] trim_trailing_whitespace = false`, the opposite of what Preflight ships. The shipped file does **not** change; see that addendum for why the evidence turned out thinner than it first read.

**A second consumer outside the original pair remains untested.** ADR-0010 wanted one to check *"whether the contract describes the package or just this pair."* This ADR read eight and adopted none. What it establishes is that the *mechanism* handles them; what it cannot establish is that the *presets* do. That test arrives when `cwds` or `ams-cloud-eds` actually adopts.

**What would change the answer.** A migration that the all-or-nothing prompt makes genuinely painful — at which point the per-file prompt ships, in a minor, costing nothing. Or a candidate repo whose divergence cannot be expressed by `unmanaged`, which would mean the escape hatch is too coarse and is a real gap rather than an ergonomic one.
