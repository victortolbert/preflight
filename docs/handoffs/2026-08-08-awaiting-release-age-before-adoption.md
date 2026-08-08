# Handoff — Preflight & consumers, 2026-08-08

Replaces `2026-08-08-a11y-preset-shipped-awaiting-release.md`, deleted in the same commit. Its live item — *"shipped code that cannot be adopted yet… npm still serves 0.2.0"* — was overtaken within hours: `0.3.0` is published. Everything from it that is still live is inlined below.

Primary working directory: `~/Projects/preflight-pkg`.

---

## The state, in one line

**Everything is landed and nothing is in flight. The only open item is a clock.**

---

## The live item: wait, then adopt

`@victortolbert/preflight@0.3.0` published **2026-08-08T11:07Z** (verified on the registry: `./vue-a11y` resolves, SLSA provenance attached).

Both consuming repos run pnpm 11's default **24h `minimumReleaseAge`** and neither lists this package in `minimumReleaseAgeExclude`. So installs of `0.3.0` fail until roughly **2026-08-09T11:07Z**. Waiting was chosen deliberately over committing an exclude entry — don't add one now without deciding that afresh.

After the clock clears, in order:

1. **Adopt in `nuxt-kickstart`** — an **exact no-op**, measured. It already runs precisely the three rules the preset ships. Its purpose is to prove the preset, not to change anything.
2. **Adopt in `uxlab`** — **also a no-op now.** It was 46 `label-has-for` violations; uxlab#54 cleared them. Re-measure rather than trusting this sentence.
3. **Only then**, weigh adding `controlComponents` to the preset.

### Why item 3 is deliberately last

`eslint-plugin-vuejs-accessibility`'s `label-has-for` has a `controlComponents` option that the shipped preset does not set, so `<label><UCheckbox/></label>` — correct nesting — fires anyway. Measured in `uxlab`: it accounts for **3 of 46**, which is thin evidence for changing a shipped preset. The decision was to gather evidence from *both* repos after adoption.

It is also a **loosening**, so under [ADR-0010](../adr/0010-the-version-contract.md) it is a `0.3.1`, not breaking — and cutting it before adoption means adopting twice and waiting out two 24h clocks.

---

## What landed this session

| Where | What |
|---|---|
| preflight #13 | ADR-0009 — the a11y gap is three rules, not thirteen |
| preflight #14 | Preflight lints its own commits in CI, resolving a dead `@commitlint/cli` devDependency |
| preflight #16 | the `vue-a11y` preset (issue #15) |
| preflight #18 | **ADR-0010, the version contract** — plus two fixes it exposed |
| preflight `v0.3.0` | published, provenance verified |
| uxlab #52, #53 | review fixes, then the `develop`→`main` promotion (9 commits) |
| uxlab #54 | 46 `label-has-for` violations cleared |

`uxlab` is `develop` **+1** over `main` (just #54). No promotion has been asked for — **do not open one unprompted**; that is the convention (#45, #42, #53 were all deliberate).

---

## Two corrections this session produced

**The "five genuine `aria-hidden="true"` defects" are zero.** Four are inside pasted Video.js DOM; the fifth (`uxlab/app/pages/cwds/utility-nav.vue:113`) is an empty `<a href="#" style="display:none">` — not focusable, so `aria-hidden` there is redundant rather than harmful, and the rule does not evaluate CSS. The claim is still written into [ADR-0009](../adr/0009-the-accessibility-gap-is-three-rules.md) and several merged PR bodies. **Do not action it.**

**`cp`/`mv` are aliased to the `-i` form on this machine.** They prompt, default to *not* overwriting, and a scripted swap therefore no-ops **while reporting success**. This produced a verification run that reported "0 violations remaining" when the config had never been swapped and the rule was still `off`. Use `git checkout --` to restore a tracked file, or `eslint --config <path>` to lint under an alternate config. Never a scripted `cp` to swap config in and out.

---

## Gotchas still live

**`commitlint --from X --to Y` is unreliable** — the range form mangles bodies; against `@commitlint/cli` 21.2.1 it reported 14 false `body-max-line-length` errors on a corpus whose longest body line is 83 characters. Preflight's own CI lints **one commit at a time via stdin** for this reason, with the rationale in `.github/workflows/ci.yml` so it is not "simplified" back.

**`pnpm run release -- <version> --yes` does not forward `--yes`** — bumpp prompts and the command blocks. Use `pnpm exec bumpp <version> --yes`. `docs/releasing.md` still documents the form that hangs; worth a one-line fix.

**`pnpm add` does not re-run `prepare`** — an existing clone of either consuming repo needs one `pnpm install` before the `commit-msg` hook appears.

**`@commitlint/types` is a phantom dependency in both consuming repos.** The same trap is why `src/presets/vue-a11y.ts` declares its own `RuleEntry` union rather than importing plugin types.

**A GitHub runner-allocation failure looks exactly like a test failure** in `gh pr checks`. The tell: `gh run view <id>` shows *"The job was not acquired by Runner of type hosted"*, an empty step list, and `--log-failed` returns nothing. Fix is `gh run rerun <id> --failed`.

**`no-aria-hidden-on-focusable` declares `schema: []`** — it takes no options and cannot be tuned; `'off'` is the only lever. It tests attribute *presence*, never value, so it fires on `aria-hidden="false"`, which hides nothing.

**Not every `uxlab` GitHub deployment is Railway.** `Production` on a `main` SHA is Vercel; `uxlab / production` on a `develop` SHA is Railway, which still builds `develop` only.

---

## Open, genuinely undecided

- **`controlComponents` on the preset**, after adoption. Above.
- **1.0.0** — gated by ADR-0010 on SPEC §11's *"migration for partially-adopted repos"* resolving, the one open item that could still move the CLI surface. SPEC §9.4 is marked revisited; this is its successor.
- **ADR-0006's precondition**, unchanged across five handoffs: both repos SHA-pin every action; neither has carried that through "a few dependency bumps." Nothing to do but wait for bumps.
- **SPEC §10.4–10.8** were ordered by reasoning, not measurement. Three items have now been measured and **all three were reframed** — item 3 reversed, item 2 rescoped, item 1 reinterpreted. Assume the rest need the same check.
- **`uxlab`'s two pasted Video.js DOM files** (`50-50-media-callout.vue`, `video-player.vue`, ~1,200 lines each) are now eslint-ignored. The real fix is mounting a player rather than embedding a snapshot of one. Nobody has asked for it.
- **~150 lines of unused wizard boilerplate** in `uxlab/scripts/setup-op-service-account.sh`. The file header calls it untouchable skill boilerplate, so removing it is a decision, not a fix.

---

## Method note worth carrying

The sharpest lesson this session was **counting is necessary and not sufficient**, now recorded in SPEC §10's ordering caution. The same 233 eslint hits read as "thirteen live suppressions" until each was resolved to the attribute value that triggered it — at which point 87 turned out to be a rule firing on `aria-hidden="false"`. A plausible total is exactly what stops someone looking further.

It happened again inside the same session at a smaller scale: 46 `label-has-for` violations looked like 46 missing `for` attributes, and were in fact four different problems wanting four different fixes, only 13 of which were the obvious one.

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

- **`/code-review`** — before any `develop`→`main` promotion in `uxlab`. It earned its keep this session: four commits that had bypassed PR review carried two documentation defects and a temp-file hazard.
- **`/grilling`** — for the 1.0.0 decision when SPEC §11 resolves. It produced ADR-0010 and found two consumer-breaking hazards that a straight read would have missed.
- **Not `/prototype` or `/tdd`** — the open items are a wait, a measurement, and a decision.

---

*No secrets are recorded here. The `.env.1password` / `.env.e2e.1password` files encountered contain `op://` references rather than credential values; their contents were not captured.*
