# Handoff — Preflight & consumers, 2026-08-08

Replaces `2026-08-07-commitlint-adopted-in-both-repos.md`, deleted in the same commit. That document's live item — "`uxlab` has 8 commits unreleased to `main`" — is **done**, and its gotchas that still apply are inlined below. Do not go looking for it in git history.

Primary working directory: `~/Projects/preflight-pkg`.

---

## Read these first, and do not re-derive them

| Artifact | What it settles |
|---|---|
| [ADR-0009](../adr/0009-the-accessibility-gap-is-three-rules.md) | why the a11y gap is three rules, not thirteen — the measurement in full |
| SPEC §10.1 and the paragraph after §10.8 | the rescoped backlog item, and why counting alone was not enough |
| [preflight#16](https://github.com/victortolbert/preflight/pull/16) | the shipped preset, and why adoption is not a no-op |
| [preflight#14](https://github.com/victortolbert/preflight/pull/14) | why commit linting is in CI rather than a hook |
| [uxlab#53](https://github.com/victortolbert/uxlab/pull/53), [uxlab#52](https://github.com/victortolbert/uxlab/pull/52) | the promotion, and the review findings fixed before it |
| `AGENTS.md` → **Evidence**, `docs/agents/evidence-grading.md` | the repo rule on empirical claims |
| `~/.claude/.../memory/consuming-repo-branch-models.md` | nuxt-kickstart PRs → `main`; uxlab PRs → `develop` |

---

## State, measured 2026-08-08T02:55Z

| Repo | Branches | Ahead | Dirty | Open issues / PRs |
|---|---|---|---|---|
| `preflight-pkg` | `main` only | — | no | **none** |
| `uxlab` | `main`, `develop` | develop **+0** over main | `.claude/settings.local.json` only | none |
| `nuxt-kickstart` | `main` only | — | no | none |

**The board is empty.** Every issue in all three repos is closed and nothing is in flight. Re-measure rather than trusting this table — it has been wrong before:

```bash
git ls-remote --heads origin && git status --short
gh issue list --state open && gh pr list --state open
```

`uxlab`'s dirty file is rewritten by the `prepare` hook on every install. **Never commit it.** Its two stashes still exist, both `skilld` regenerations, left alone because they are the user's.

---

## The live item: shipped code that cannot be adopted yet

`main` carries the `vue-a11y` preset (`406cf03`), but **npm still serves 0.2.0**, whose exports map has no `./vue-a11y`. So the preset exists and nothing can consume it.

Unblocking it needs a **release**, and the version number is not a formality:

- **SPEC §9.4 is explicitly due.** It says v1 being small is "a judgement call, worth revisiting **once the mechanism lands**." It has landed — adopted and `preflight check`-enforced in both repos, three releases, provenance attestation. Nobody has taken that decision, and it is where the 1.0.0 question lives. Cutting an unconsidered `0.3.0` silently answers it.
- **The user reserved this decision.** It was deliberately left for them, not deferred by accident.

### Then a second gate, measured

Both consuming repos run pnpm 11's default **24h `minimumReleaseAge`**. A freshly published version cannot be installed until it ages out. Neither repo currently lists `@victortolbert/preflight` in `minimumReleaseAgeExclude` — earlier adoptions did not need it, because the versions had already aged.

`nuxt-kickstart/pnpm-workspace.yaml:26-31` documents both exclude forms and prefers the versioned one (`name@version`), because it stops applying the moment the package moves on. So the choice on release day is: **wait 24h, or add one versioned exclude entry.** Decide deliberately; do not discover it as an install failure.

---

## Adoption is not a no-op — the one number to carry

SPEC §2's dividend ("adoption changes no effective configuration") **does not hold for this preset.** Measured 2026-08-07:

| Repo | Effect of adopting `/vue-a11y` |
|---|---|
| `nuxt-kickstart` | **exact no-op** — already runs precisely these three rules |
| `uxlab` | **surfaces 46 real `label-has-for` errors** |

Adopt in the template first: it proves the preset at zero cost. **The application repo is separate work** — either fix the 46 or declare a local `'off'` at the point of divergence — and was deliberately kept out of #16.

---

## Gotchas, recorded nowhere else

### New this session

**`no-aria-hidden-on-focusable` cannot be tuned.** Its rule source declares `schema: []`, so it takes no options — `'off'` is the only lever. And it tests the *presence* of `aria-hidden`, never its value, so it fires on `aria-hidden="false"`, which hides nothing. That was 87 of 92 hits in `uxlab`. If enforcing it ever comes up, the cheap path is upstream: a one-line value check in the plugin.

**A plausible total is what stops you looking.** The same 233 eslint hits read as "thirteen live suppressions" until each was resolved to the attribute value that triggered it. Counting was necessary and not sufficient. This is the sharpest form of the caution SPEC §247 already carries, and it applies to every unmeasured backlog item.

**`cp` is aliased to `cp -i` on this machine.** It prompts and defaults to *not overwriting*, so a scripted restore silently does nothing and reports success. Use `git checkout --` to restore a tracked file; it is exact and needs no alias-dodging. (Existing memory covers aliased `rm`; this is the same class.)

**GitHub deployment environments here are not all Railway.** On `uxlab`, `Production` on a `main` SHA is Vercel; `uxlab / production` on a `develop` SHA is Railway. Railway still builds `develop` only, so promoting to `main` does not trigger a Railway production deploy.

### Carried forward — still live

**`commitlint --from X --to Y` is unreliable.** The range form mangles commit bodies: against `@commitlint/cli` 21.2.1 it reported 14 false `body-max-line-length` errors on a corpus whose longest body line is 83 characters, plus 6 spurious `footer-leading-blank` warnings. Preflight's own CI (`.github/workflows/ci.yml`) now lints **one commit at a time via stdin** for this reason, with the reasoning in the workflow comment so it does not get "simplified" back.

**`commitlint --edit <file>` needs a git root.** Use stdin (`commitlint < file`) for bulk checks. ~1.2s per invocation, so parallelise beyond a handful.

**`pnpm add` does not re-run `prepare`.** Anyone with an existing clone of either consuming repo needs one `pnpm install` before the `commit-msg` hook appears. Fresh clones are fine.

**`@commitlint/types` is a phantom dependency in both consuming repos.** Do not type a consumer's `commitlint.config.ts` with `UserConfig`. The same trap is why `src/presets/vue-a11y.ts` declares its own `RuleEntry` union instead of importing plugin types.

**A GitHub runner-allocation failure is indistinguishable from a test failure** in `gh pr checks`. The tell: `gh run view <id>` shows *"The job was not acquired by Runner of type hosted"*, an empty step list, and `--log-failed` returns nothing. Fix is `gh run rerun <id> --failed`.

**`eslint --no-warn-ignored` suppresses the message that proves a file is ignored.** Verify ignore scope with the API instead:

```bash
node --input-type=module -e "import {ESLint} from 'eslint'
const e=new ESLint(); console.log(await e.isPathIgnored('path/to/file'))"
```

---

## Open, genuinely undecided

- **The release, and its version number.** Above. The user's call, and entangled with §9.4.
- **`uxlab` adopting the a11y preset**, with 46 real violations behind it.
- **ADR-0006's precondition is still half-met**, unchanged across four handoffs: both repos SHA-pin every action; neither has carried that through "a few dependency bumps." Nothing to do but wait for bumps.
- **ADR-0008's unresolved half.** Preflight can ship commit *policy* but cannot cause a *hook* to exist in a consumer — `package.json` is beyond both of SPEC §4's mechanisms. Preflight's own repo sidestepped this by using CI (#14); a consumer cannot be made to.
- **SPEC §10.4–10.8** were ordered by reasoning, not measurement. Two of the three items measured so far were reframed by measuring. Re-measure before promoting any of them.

---

## Loose ends, small

- **Five genuine `aria-hidden="true"` defects on focusable elements in `uxlab`**, unfiled: `app/pages/cwds/50-50-media-callout.vue`, `utility-nav.vue`, `video-player.vue`. Found incidentally by ADR-0009's measurement.
- **~150 lines of unused wizard boilerplate** in `uxlab/scripts/setup-op-service-account.sh` (`ask`, `write_env`, `set_secret`, `ENV_FILE`), and a `finish()` summary that can only ever print nothing. The file header calls it untouchable skill boilerplate, so removing it is a decision, not a fix. Deliberately left in #52.

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

- **`/grilling`** — for the §9.4 / 1.0.0 decision. It is a judgement call the SPEC itself scheduled, and the kind that benefits from being stress-tested rather than reasoned alone.
- **`/code-review`** — before any further `develop`→`main` promotion in `uxlab`. It earned its keep this session: four commits that had bypassed PR review carried two documentation defects and a temp-file hazard.
- **`/research`** — only if an item turns on external tool behaviour rather than repo contents.
- **Not `/prototype` or `/tdd`** — the open items are a release decision and a measurement, not new code.

---

*No secrets are recorded here. The `.env.1password` / `.env.e2e.1password` files encountered contain `op://` references rather than credential values; their contents were not captured.*
