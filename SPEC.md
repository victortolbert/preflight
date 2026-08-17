# Preflight v1 — Specification

> **Status:** Decision-complete. Ready for an implementation session.
> **Scope:** what to build and why. It does not prescribe code structure, and does not authorize work beyond v1.

This specification is the output of a structured planning effort: an audit of the shared configuration surface across several private Nuxt projects, followed by six decisions taken one at a time. The detailed decision record is kept privately; the reasoning that matters is reproduced here.

---

## 1. What Preflight is

**Preflight is the foundational project-setup layer** — the safeguards a project should have before feature work begins — extracted from an existing project template into a package that consuming repos install.

"Preflight" names *the layer*, not any broader initiative.

It is delivered as **one npm package**: `@victortolbert/preflight`.

### The problem it solves

Not "new repos are tedious to set up." The measured problem is subtler and more common: a template repo was extracted from a working application, and material subsequently flowed in **both** directions — so neither repo was authoritative. Eighteen shared configuration files diverged with nothing able to detect it.

Preflight exists to give that shared surface a source of truth.

---

## 2. What v1 ships

**Three files.** Every one configures a tool that is actually installed and running — verified by measurement rather than assumed.

| File | Mechanism | Consumed as |
|---|---|---|
| `taze.config.ts` | preset | `@victortolbert/preflight/taze` |
| `.nvmrc` | CLI-written | `preflight sync` |
| `axe-linter.yml` | CLI-written | `preflight sync` |

Two files were cut after measurement, both on the same test.

`skills.json` configures `skillman`, which appears in neither consuming repo's dependencies or lockfile. See §7 and [ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md).

`skills-npm.config.ts` went during implementation, when its contents were finally extracted rather than described. The file is the tool's published README example **verbatim** — not one line in it that is not in the README, and the only edits are eight deleted lines of placeholder examples. `source` and `agents` had been read as real settings because they differ from the tool's defaults; they are the README's values. Nothing in either repo invokes `skills-npm`, so a config nobody wrote configures a tool nobody runs. This is the case ADR-0003 anticipated and named the precedent for.

### The principle: ship the agreement, defer the disputes

v1 takes only what the consuming repos already agree on. Agreed files are not the most valuable — they are consensus with **nothing currently preserving it**, which makes them what drifts next.

Deferring the disputes is not avoidance. Adjudicating lint rules that two repos have settled in *opposite* directions is real work that will make one repo worse before it makes it better. Doing that *through a mechanism nobody trusts yet* compounds two risks better taken one at a time.

**A dividend of this choice:** adoption is effectively a **no-op** for the existing repos. All three files were confirmed byte-identical across both consumers, so adoption changes no effective configuration and surfaces zero violations.

This is now demonstrated rather than argued. `preflight sync`, run against each consuming repo's real `.nvmrc` and `axe-linter.yml`, reports "Managed files are up to date. Nothing to do." and writes nothing but the lock. The templates are byte-identical to both.

One honest caveat remains: adopting a **preset** always rewrites the consumer's config file — from inline options to an import. The *bytes* change; the effective configuration does not.

---

## 3. Package shape

```jsonc
{
  "name": "@victortolbert/preflight",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "publishConfig": { "access": "public" },   // REQUIRED — scoped packages default to restricted
  "bin": { "preflight": "./dist/cli.mjs" },
  "exports": {
    ".": "./dist/index.mjs",                 // definePreflightConfig
    "./taze": "./dist/presets/taze.mjs",
    "./package.json": "./package.json"
  },
  "peerDependencies": {
    "taze": ">=19"
  },
  "files": ["dist", "templates"]
}
```

**One package, not several.** Multiple packages could drift out of version-sync *with each other*, recreating inside Preflight the exact failure it exists to fix.

**Subpaths are tool-named and framework-silent** — `/taze`, never `/nuxt/taze`. Every v1 file is framework-independent, and namespacing them under a framework would both mislead and misname the package for the plain-JavaScript projects that are the likeliest second consumer.

**The root export exists to type `preflight.config.ts`.** `definePreflightConfig` (§6) needs an address, and both peer dependencies expose their `defineConfig` from the package root — so `import { definePreflightConfig } from '@victortolbert/preflight'` is the line these repos already write. §3's tool-named rule was about avoiding *framework* namespacing; it was never an argument against a root.

**ESM-only, `.mjs` output.** Both consuming repos and both peer dependencies are `type: module`, the config files are TypeScript, and the floor is Node 24. A CJS build would have no consumer.

**The exports map is hand-written, not generated.** `publint` fails CI on any path that does not resolve, so the map cannot silently disagree with what was built — and `package.json` stays a reviewable source file rather than a build output. See §12.

---

## 4. The two mechanisms

**Assignment rule — *if the tool has a native composition point, it is a preset; otherwise the CLI writes it.***

Neither mechanism is novel to the consuming codebases, which is the reason to choose them over a third invention: config files there are already `defineConfig({ … })` modules importing from a published package, and a file-distributing CLI is already a dependency in both repos — `skills-npm` exposes exactly the surface Preflight's CLI needs, including `.gitignore` handling, dry-run, and confirmation prompts.

> **Correction.** Earlier drafts described preset consumption as `extends: [...]`. Neither `taze` nor `skills-npm` has an `extends` key; both take a plain options object. The mechanism is import-and-compose. The conclusion is unchanged — the composition point is native either way — but the shape below is what actually gets written.

### Preset shape

A preset is a **typed options object**, not a finished `defineConfig()` result:

```ts
// consumer with no local policy
export { default } from '@victortolbert/preflight/taze'

// consumer with a local addition, declared at the point of divergence
import { defineConfig } from 'taze'
import preflightTaze from '@victortolbert/preflight/taze'

export default defineConfig({
  ...preflightTaze,
  exclude: [...preflightTaze.exclude, '@internal/*'],
})
```

Exporting a finished `defineConfig()` result would be more inert, but the only way to diverge from it is to abandon the preset outright — which is residual risk #2 (§9), one level deeper and just as undetectable. §6 argues that a mechanism which cannot express legitimate divergence will be worked around; the CLI-written files get `unmanaged` as their escape hatch, and presets get composition as theirs.

**Presets are low drift surface, not zero.** They are consumed by reference, so their policy lives in the package. A consumer can still override a spread key, and nothing detects that — the same class of gap as residual risk #2. Only the two CLI-written files are drift surface that `preflight check` actually sees.

### Rejected

- **Nuxt Layers** — framework-native, and the current consumers are Nuxt. But neither repo uses `extends` in `nuxt.config.ts`, and that config is dominated by project-specific workarounds. The layer would carry almost none of the shared surface and still miss editor config, CI, and git hooks.
- **A single CLI owning everything** — discards the ecosystem's own composition points, turning a one-line import into a generated file that then needs its own drift detection.
- **Copy-once scaffolding** — this is the mechanism that produced the drift in the first place.

---

## 5. CLI surface

```
preflight sync     Write managed files, showing a diff first.
                   Skips anything listed in `unmanaged`.
preflight check    Exit non-zero on drift in a managed, non-opted-out file.
```

### Upgrade is explicit

Version bump, then a deliberate `preflight sync`. **Rejected: automatic sync on install**, despite a direct precedent for it in the consuming repos. The reasoning is about trust rather than mechanism — v1's job is to earn confidence in a new dependency, and an install step that silently rewrites tracked files erodes that fastest.

---

## 6. Drift control

### State — `preflight-lock.json`

A hash per CLI-written file:

```json
{ "version": 1, "files": { ".nvmrc": { "computedHash": "…" } } }
```

| Local file | Lock hash | Meaning |
|---|---|---|
| matches lock | matches package | in sync |
| differs from lock | matches package | local edit — drift or override |
| matches lock | differs from package | upstream moved; sync available |

This table specifies the mechanism, and stays as written. The implementation distinguishes five states rather than three — it also covers a file with no lock entry at all, which the table assumes away, and a file absent because Preflight began managing it *after* a project's last sync, which is news rather than drift. See [ADR-0010](./docs/adr/0010-the-version-contract.md) and `src/check.ts`'s `CheckState`.

### Escape hatch — declared opt-out

```ts
// preflight.config.ts
export default definePreflightConfig({
  unmanaged: ['.nvmrc'],
})
```

The file stops being checked and Preflight stops writing it. This makes divergence a **recorded, reviewable decision** — visible in a diff, greppable across repos. Some divergence is legitimate: database configuration, for instance, *should* differ per project. A mechanism that cannot express that will be worked around.

**Rejected:** marker comments (`# preflight:unmanaged`) — two of the three managed files are `.nvmrc` and a `.json` file, and neither format supports comments. **Rejected:** a `sync --accept` that records the local hash — divergence would then appear in review as an opaque hash change with no stated reason.

### Enforcement — `preflight check` fails in CI

CI is the only gate that cannot be skipped and that sees every change.

**Rejected: warn-only**, as functionally identical to the status quo — the eighteen drifted files were always visible to anyone who looked, and nobody looked. **Rejected: a pre-commit hook**, as bypassable with `--no-verify` and mismatched in cadence; this drift unfolds over months, not commits.

---

## 7. Deliberately excluded from v1

| Excluded | Why |
|---|---|
| Commit-lint and style-lint configuration | **Dead config** — neither tool is installed in either consuming repo (see §8) |
| `skills.json` | **Dead config**, found by measurement during implementation planning. It is owned by `skillman`, which is in neither repo's `package.json` nor either lockfile. The two skills tools that *are* installed — `skilld` and `skills-npm` — contain zero references to the file. Same test as the row above, applied consistently. See [ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md) |
| `skills-npm.config.ts` | **Dead config**, found during implementation by reading the file rather than describing it. It is the tool's README example verbatim, and nothing in either repo runs the tool. Same test again. See §2 and [ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md) |
| Ambient TypeScript declarations | Declare *application* domain types. Byte-identical only because of the original copy |
| Content-collection config | A four-line shim importing project-local schemas |
| `LICENSE` | Legal boilerplate, not a safeguard |
| Deploy configuration | Encodes a hosting choice. **Accepted cost:** its security headers are now uncovered |
| Database configuration | Legitimately per-project — centralizing it would be actively wrong |
| eslint, markdownlint, tsconfig, vitest, playwright, git hooks, CI, release automation, editor config, agent-instruction files | Disputed, asymmetric, or vapor — see the v2 backlog |

---

## 8. Evidence base

Findings that justify the decisions above, from an audit of the shared surface.

**Provenance.** The template repo was extracted from a mature application repo as a single squashed commit, after which the application began importing *back* from the template. Bidirectional flow, no source of truth.

**Config drift.** 33 shared files: 13 identical, 18 drifted, and one — the editor config — **0 bytes in both**.

**"Drift" is five distinct phenomena** — and must not be solved as one:

1. *Formatting noise* — a `tsconfig.json` differing only in JSON indentation.
2. *Version skew* — a tool pinned one patch apart.
3. *Real disagreement* — lint configs drifted in **opposite** directions.
4. *Legitimate divergence* — database config differing by target. It should.
5. *Capability gaps* — one repo running three pre-commit hooks to the other's one.

**Version skew is not a defect.** Across all 69 skewed packages, one repo was newer in **69** cases and the other in **0**. Deliberate pinning produces a mix; a clean sweep in one direction is an update tool having been run in one repo and not the other.

**The template is not a foundation.** It bundles a full application stack — calendar, rich-text editor, code editor, cloud SDK, nine font families — around the tooling. Preflight is a *subset*.

**The template can be behind its own consumer.** The application repo SHA-pins its CI actions, noting the floating tag ran on a deprecated Node version; the template still uses the floating tag. Extraction cannot mean "take what the template has."

### Two cautions for the implementation session

**Byte-identity can mean consensus, or it can mean nothing is running.** Of 13 identical files, **five signified nothing** — three identical merely from the original copy, and two because they are dead: their tools are absent from both repos' dependencies, no lockfile entries exist, no hook or script invokes them. An old dependency snapshot shows the tools were installed once, removed, and their configs orphaned.

**A retracted inference.** That the commit-lint config had propagated unchanged to three of four repos was initially read as evidence that cheap policies adopt well. In fact it propagated because it is **inert**; dead files cannot drift. It is not evidence of anything.

---

## 9. Residual risks

Accepted for v1, recorded so they are not rediscovered as surprises.

1. **v1 requires a CI step it does not ship.** CI workflows are deferred, so each consumer hand-adds `preflight check` — and that step can be deleted, silently disabling enforcement. The strongest argument for CI leading v2.
2. **Preset abandonment is undetectable.** Replace a preset import with inline config and nothing notices; the dependency is still installed and the lockfile still valid. Because presets are spreadable options objects (§4), the weaker form is undetectable too: a consumer can override an individual key and nothing reports it.
3. **`preflight.config.ts` is unmanaged by construction.** Nothing prevents a repo opting out of everything and passing. The check is an honesty aid, not a control.
4. ~~**v1 is small.**~~ **Revisited, as this entry asked.** Three files, two configured tools — one preset, two CLI-written. It proves the mechanism honestly; whether that is a satisfying debut is a judgement call, worth revisiting once the mechanism lands. v1 has now shrunk four times, every time on measurement rather than nerve — and the last one only because implementation went and read a file the planning had only described.

    The mechanism has landed: installed, consumed by reference, and `preflight check`-enforced in CI in both consuming repos, across three releases with provenance. Taking that as the cue to cut 1.0.0 turned out to be wrong, and measuring is what said so — a newly managed file failed `check` in a repo that had chosen nothing, and preset changes reach consumers with no lock, no sync, and no check at all. Since `^0.2.0` does not admit `0.3.0`, the 0.x range was quietly doing the safety work that 1.0.0 would have removed. So the answer to "is small a satisfying debut" is that size was the wrong axis: what the debut lacked was a stated contract, not more files. See [ADR-0010](./docs/adr/0010-the-version-contract.md), which sets that contract and gates 1.0.0 on §11's migration item.

---

## 10. v2 backlog, in priority order

1. ~~**The accessibility gap.**~~ ~~The consuming repos disagree substantially on accessibility lint enforcement — the only divergence found with user-facing consequence.~~ **Done — and rescoped by measuring.** The disagreement is mostly not one. Stripping each repo's `vue-a11y` overrides and running eslint: all 13 of the application repo's suppressions fire (233 hits over 801 files), and all 3 of the template's do (25 hits over 500 files) — **each repo suppresses exactly the rules its own content trips, and no more.** The 13-vs-3 gap is a component showcase the template lacks, not a policy dispute: 127 of the hits sit in `app/pages/cwds/` and `app/pages/examples/`. Two further findings shrink it again — **87 of 92 `no-aria-hidden-on-focusable` hits are `aria-hidden="false"`**, which hides nothing (the rule tests attribute presence, never value, and declares `schema: []`, so it cannot be tuned), and the template has already tuned `label-has-for` with a written rationale, which takes its own hits 21→0 and the application repo's 96→46. What that leaves is a **three-rule preset** — `no-autofocus` and `media-has-caption`, held identically in both, plus the template's tuned `label-has-for`. See [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md). Ranked first and genuinely cheap to check, as this entry claimed; it was the conclusion that was wrong, not the ranking. **Shipped** as `@victortolbert/preflight/vue-a11y` in [#16](https://github.com/victortolbert/preflight/pull/16) (`406cf03`, 2026-08-07) and **adopted in both consumers** on 2026-08-09 (`396bb5ff`, `3eec7f8`) — the same two commits §10.3 below calls "the last preset adoption." This sentence read "what remains to ship" until 2026-08-15, six days after the work was consumed in both repos, which is the same stale-prose failure §10.3 records and a reminder that this section describes the code less reliably than the code does.
2. ~~**Revive commit linting.**~~ **Done — and reframed by measuring.** Conventional commits were indeed in use and enforced by nothing, and the dependency and `commit-msg` hook were indeed needed. What the item got wrong was its purpose. Linting 1,472 commits found the convention already followed at 95/100 recent commits with zero enforcement, and **all six deviations were the stock config being wrong about this project** — four acronym-initial subjects (`SHA-pin`, `WCAG`, `Chromium`) and two uses of a real `content` type. Enforcement would have caught nothing worth catching and blocked six valid commits. So the deliverable is the *tuned ruleset*, not the guardrail: the `commitlint.config.cjs` both repos carried was stock `@commitlint/config-conventional`, never run, and wrong. Shipped as an opt-in preset — see [ADR-0007](./docs/adr/0007-commitlint-presets-are-consumed-via-extends.md) for why it is consumed via `extends`, and [ADR-0008](./docs/adr/0008-commit-linting-is-opt-in.md) for why it is not mandatory.
3. **CI workflows and action SHA-pinning.** Also closes residual risk #1. **Blocked, not merely deferred** — measured after v1 shipped and found to have no agreement to centralize: **as measured then**, the application repo pinned 11 of 19 action references and floated 8, with three actions appearing both ways inside it, while the template pinned none of 7. **That has since changed — as of 2026-08-11 both repos SHA-pin every action reference** (uxlab 6, nuxt-kickstart 4). The pinning half of this item is therefore settled; what remains blocked is *sharing the workflow files*, since one carries a 52-line `e2e` job the other has no use for. ~~ADR-0006's precondition — that the pins survive a few dependency bumps — is also still unmet: **no dependency version has changed in either repo since the last preset adoption** (`396bb5ff` in uxlab, `3eec7f8` in nuxt-kickstart). Neither lockfile has been touched since; the only `package.json` edits are two `scripts` entries in uxlab, which exercise nothing.~~ **Re-measured 2026-08-16, after nuxt-kickstart adopted `0.4.0`. The pinning half is now met more strongly than ADR-0006 asked — and it still unblocks nothing, for a reason the precondition does not cover.**

*The pinning.* All three repos SHA-pin **every** action reference — uxlab 19 of 19 (was 11), nuxt-kickstart 7 of 7 (was 0), preflight-pkg 6 of 6 — and not merely by the same convention but at **identical SHAs**: `actions/checkout@d23441a4`, `actions/setup-node@24997072`, `actions/upload-artifact@043fb46d` and `pnpm/action-setup@0977fd99` are byte-identical everywhere they appear, each with a trailing `# vX.Y.Z` comment. ADR-0006's sharpest illustration of the skew — `pnpm/action-setup` at three different versions across three repos — is gone; all three are `v6.0.10`.

*The bumps.* Fewer than the pinning suggests, and unevenly spread. Since the reference commits: **two in nuxt-kickstart** (`@antfu/eslint-config` 9.3.0 in `21b6e11`, and `@victortolbert/preflight` `^0.4.0` in `a603be1`) and **one in uxlab** (`@antfu/eslint-config` 9.3.0 in `c2df87dd`). uxlab's four *other* `package.json` commits since `396bb5ff` are `scripts` entries with the lockfile untouched — the same finding as the struck sentence above, now four commits rather than two, and still exercising nothing. "A few" is met marginally at best, and mostly by one repo.

*Why it changes no conclusion anyway.* Two reasons, neither of them about the count. First, ADR-0006 also holds that **the files could not be shared even if the pinning agreed**, because of the 52-line `e2e` job the template has no use for — that is SPEC §8's legitimate divergence, permanent rather than pending. What the precondition gates is only the *reusable-workflow* option, which §4 forecloses as a third distribution mechanism and which ADR-0006 itself calls a scope decision about what Preflight is, explicitly not to be taken in order to close a risk. Second, and newer: the precondition is phrased over **two repos' agreement**, and `uxlab` is no longer a validation consumer (see [`CONTEXT.md`](./CONTEXT.md)). Identical SHAs across three repos one person maintains is at least as easily inheritance as convergence — which is [ADR-0013](./docs/adr/0013-markdownlint-ships-seven-rules-as-json-via-extends.md)'s finding about carried-and-edited files, and [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md)'s about reading silence as consensus, arriving here a third time. **The pins agreeing is evidence about the maintainer, not about the repos.** See [ADR-0006](./docs/adr/0006-ci-workflows-are-not-yet-shareable.md).
4. ~~**eslint** — requires settling style questions the repos have answered in opposite directions.~~ **Closed by measuring. The sentence was true and nothing ships.** Diffing `eslint --print-config` between the repos: on `nuxt.config.ts`, **358 of 361 rules are identical and zero severities disagree**; on `app/app.vue`, 487 of 517. Reading that as *settled* would be this section's own error again — the residue is small but it is precisely the disputed part. **The dispute is two rules**: `vue/component-name-in-template-casing` (application repo `PascalCase`, template `kebab-case`) and `vue/block-order` (`template, style, script` vs `template, script, style`). Both are set explicitly in both repos, and both stay local — the template's `kebab-case` makes its snippets read as HTML, which is what a starter is for, while the application repo matches the Vue style guide and the Nuxt UI docs its components are written against. Converging either way rewrites ~90% of the losing repo's Vue files to make them read worse. Deferral was not a delay here; it was the answer. Ten of the eleven severity disagreements are the `vue-a11y` suppressions already owned by item 1 and [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md). The eleventh, `vue/html-self-closing`, is **not** a dispute — the application repo never sets it and takes the default; only the template does, for a CDN-snippet reason that does not transfer. Separately, `@antfu/eslint-config` 9.1.0 scoped its unicorn block to `files: [GLOB_SRC]`, which excludes `.vue`, so 15 rules silently stopped applying to the application repo's SFCs at upgrade — **0 violations in either repo**, re-checked 2026-08-15 across every `.vue` file including the six ADR-0011's denominator excludes, upstream did it deliberately, and a preset guarding nothing is what [ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md) exists to prevent. Both consumers move to 9.3.0 to close the skew. See [ADR-0011](./docs/adr/0011-the-eslint-style-dispute-is-two-rules-and-both-stay-local.md).
5. ~~**Deploy security headers**, reclaimed host-independently.~~ **Done — and the first item measuring made *bigger*.** The entry reads as a tidy-up. Measured, the headers are not host-*specific* but host-*absent*: both repos' `netlify.toml` header blocks are **byte-identical** (five rules — the cleanest agreement in this section, with no dispute to defer), both `vercel.json` are byte-identical and carry **no headers at all**, and **neither file is invoked by anything** — neither repo still has a Netlify site or a Vercel project. The application repo is live on Railway, which reads neither, and a request to production returned **no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`, no HSTS and no CSP**. Resolving the five rules against production rather than counting them: three are unenforced, `/_nuxt/*` immutable caching is present but **set by Nitro rather than by that file**, and `/img/*` is unenforced *and* a hazard — `public/` filenames carry no content hash, so `immutable` there ignores a replaced image for a year. So three ship, as a `routeRules` fragment at `@victortolbert/preflight/security-headers`; the mechanism was already present in both repos, used only for redirects. No HSTS or CSP: neither repo sets either anywhere, and ADR-0009 is the ADR about reading silence as consensus. See [ADR-0012](./docs/adr/0012-security-headers-are-reclaimed-as-route-rules.md), which also records that the subpath is content-named rather than tool-named, and that this is the first preset that is *not* framework-independent — a real narrowing of what §3 claims for the package.
6. ~~**markdownlint** — a substantial set of rules in dispute.~~ **Done — and the dispute does not exist.** The configs share 8 entries and diverge on 14, which reads as the substantial dispute claimed. Measuring: the application repo's 9 suppressions are **exactly** the 9 rules that fire in it (6,727 hits over 750 files under stock defaults) and it exits clean; the template's 21 include **9 that fire nowhere**, miss **5 rules that do fire** (281 hits), and it has no `lint:md` script, no CI step and no hook — markdownlint there is dead config by `CONTEXT.md`'s definition. **These files are carried between projects and edited rather than authored**, so the overlap is inheritance, not consensus — ADR-0009's silence-is-not-agreement lesson in a new costume. The criterion that replaces "both disable it": a rule ships only if it **fires in both repos** *and* **survives `markdownlint --fix`**. That is 7 — `MD013`, `MD024`, `MD025`, `MD033`, `MD036`, `MD040`, `MD060`. It drops `MD034` (disabled in both, but 100% auto-fixable) and `MD041` (fires in one repo only). `MD013` is disabled rather than tuned because tuning was measured: even at `line_length: 160` with tables and code excluded it leaves 1,292 standing violations. Shipped as **JSON** at `@victortolbert/preflight/markdownlint` and consumed via markdownlint's own `extends` — ADR-0007's shape a second time — because markdownlint auto-discovers no JavaScript config form and `extends` **silently ignores** an ESM target. A preset rather than a managed file, so it stays additive under ADR-0010. See [ADR-0013](./docs/adr/0013-markdownlint-ships-seven-rules-as-json-via-extends.md).
7. ~~**Editor config** — needs *writing*, not extracting.~~ **Done — right about the file, wrong about the scope.** `.editorconfig` is **0 bytes in both** repos and at every commit in its history, and nothing in either reads it (no `editorconfig` dependency), so §203's v1 finding holds. But "editor config" in these repos is `.vscode/`, which this entry never considered: `extensions.json`, `launch.json` and `mcp.json` are **byte-identical** across the repos and `settings.json` differs by **one line** — ~4.6 KB, 99.6% the same. Almost none of it ships. `launch.json` is a **Python `debugpy` profile** in two repos containing no Python; `extensions.json` recommends a linter that replaces the one both repos run and a PostCSS extension neither depends on; `prettier` is installed in both with no config, no script, and `prettier.enable: false`; and `mcp.json` carried a **credential**, since rotated (see #30). Inherited files, exactly as ADR-0013 found for markdownlint. The genuinely shared part — the `eslint.*` block in `settings.json` — **cannot ship at all**: VS Code settings have no composition mechanism, and a managed file owns the whole file, which would clobber each repo's local keys. What ships is `.editorconfig`, and it is **derived rather than written**: both repos' computed eslint config is byte-identical on `style/indent` (2, spaces), `style/eol-last` (always) and `style/no-trailing-spaces`, which is four keys. `end_of_line` and `charset` are omitted — `style/linebreak-style` is set in neither repo, and ADR-0009 is the ADR about reading silence as agreement. Both objections were checked: **0 MD009 violations** in either repo's authored Markdown, so trimming breaks no hard line breaks, and every leading tab in either repo is in vendored `.md` under `.claude/` or `public/`. **This is a managed file, so it is the first breaking release — `0.4.0`** — the cost ADR-0010 predicted for this item by name. See [ADR-0014](./docs/adr/0014-the-editor-config-is-derived-from-eslint.md).
8. ~~**tsconfig, vitest, playwright** — and with them, the version-pinning and catalog questions return with real weight, since these are tools whose version differences change results silently rather than loudly.~~ **Closed by measuring. Nothing ships, and the entry is wrong about the mechanism.** The only entry to predict a *failure mode* rather than a disagreement, and something here is indeed silently wrong — but not the versions. **Installed** versions: `typescript` **6.0.3 in both**, and every other gap (`vitest` 4.1.10/4.1.8, `@playwright/test` 1.62.1/1.60.0, `vue-tsc` 3.3.9/3.3.5, `happy-dom` 20.11.1/20.10.3) sits inside overlapping caret ranges — lockfile age, not policy, exactly as ADR-0011 found for eslint. **Catalogs are not a question either repo has asked**: both have `pnpm-workspace.yaml`, neither defines a `catalog` key, and zero dependencies use `catalog:`. The real silence is in `vitest.config.ts`, where **two settings in the application repo are inert**: `teardownTimeout` sits inside a project block, which Vitest's own `NonProjectOptions` type excludes (`ProjectConfig = Omit<InlineConfig, NonProjectOptions | …>`), and the `e2e` branch of its `include` glob matches zero files because its specs live at `./e2e`. **The template's test config is more correct than the application's** — in the repo that does *not* run e2e in CI. As for sharing: `tsconfig.json` is a Nuxt-generated stub whose 17-line diff carries one semantic difference and 16 lines of formatting; `playwright.config.ts` is genuinely divergent (115 lines vs 43, different `testDir`, five specs and a CI job vs one spec and no runner); and `vitest.config.ts` is ~93% identical but the shared part is **module-level structure, not options data** — a `structuredClone` monkey-patch and an alias built from `import.meta.url`, neither of which survives ADR-0004's definition of a preset. See [ADR-0015](./docs/adr/0015-the-test-toolchain-ships-nothing-and-the-silence-was-elsewhere.md).

**This ordering was reasoned, not measured.** Item 3 was ranked from an audit that characterized its drift correctly but never counted it; counting reversed the conclusion (ADR-0006). The remaining items were ordered by the same method, so each should be re-measured before being taken up rather than promoted on the strength of its position here.

Item 2 is the second data point, and it fell the other way: measuring **confirmed** the item was worth doing while **changing what it was for**. The caution is not "the backlog overstates things" — it is that these entries describe files nobody counted, so measuring can reverse an item, rescope it, or vindicate it, and which of the three is not predictable from the entry.

Item 1 is the third, and it did a fourth thing: it was **reinterpreted**. This paragraph previously predicted that the accessibility agreement was "nested, not absent" — that the template's silenced rules were a subset of the application repo's — and measurement confirmed exactly that, so the prediction was sound. What it did not anticipate is that the *nesting itself* has a mundane cause: each repo silences precisely the rules its own content trips, so the template's set is a subset because the template is smaller, not because the two repos negotiated. Nor did counting settle it — the same 233 hits read as "thirteen live suppressions" until each hit was resolved to the attribute value that triggered it, at which point 87 turned out to be a rule firing on `aria-hidden="false"`. **Counting was necessary and not sufficient**; the count had to be read one hit at a time. That is a sharper caution than §247's for the items still unmeasured, since a plausible total is exactly what stops someone looking further. See [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md).

**All eight are now measured, and not one was confirmed as written.** The running tally above stops here because there is nothing left to add to it:

| | Item | What measuring did |
|---|---|---|
| §10.1 | accessibility | **reinterpreted** — 13 suppressions, 3 shippable, and 87 hits were a rule bug |
| §10.2 | commit linting | **reframed** — the item was worth doing, for a different reason than it gave |
| §10.3 | CI + SHA-pinning | **reversed** — ranked on an audit that never counted; still blocked |
| §10.4 | eslint style | **closed, nothing shipped** — the sentence was true |
| §10.5 | deploy headers | **grew** — not host-specific but absent from production entirely |
| §10.6 | markdownlint | **dissolved** — no dispute; one repo had never run the tool |
| §10.7 | editor config | **right about the file, wrong about the scope** |
| §10.8 | tsconfig/vitest/playwright | **wrong about the mechanism** — the silence was real and elsewhere |

The tempting summary — *the backlog overstates itself* — is wrong, and §10.5 is the counter-example: it understated. So is the summary that entries shrink when measured; §10.6 dissolved and §10.7 doubled in scope. **The one thing true of all eight is duller and more useful: every entry described a file, and every entry was written by someone who had not opened it.** Four items turned on evidence that took minutes to gather — an invocation check, a `git log`, a request to production, a type definition. That is the failure this package exists to catch, and §10 is its largest instance in the project's own documentation.

### Postscript: what the first non-no-op adoption confirmed

Items 5, 6 and 7 each shipped something and each predicted what adopting it would do. `nuxt-kickstart` adopted all three at `0.4.0` on 2026-08-16 ([#15](https://github.com/victortolbert/nuxt-kickstart/pull/15), `a603be1`) — the first adoption in this project that was **not** a no-op — so those predictions can now be checked rather than trusted.

| | Predicted | On adoption |
|---|---|---|
| §10.6 | 281 standing hits → **5** after `markdownlint --fix` | Exactly 5 remained; all five were fixes the fixer cannot make. `markdownlint .` now exits **0** with 0 hits |
| §10.7 | a managed file, therefore the **first breaking release** | `0.4.0`, and the caret range moved by hand. `.editorconfig` was 0 bytes, so this is also the first managed file whose adoption writes real content |
| §10.5 | headers reach production only when a consumer spreads them into `routeRules` | Present on `/` and on a nested route, which is what `/**` buys over `/*`. **uxlab still serves none** — it remains on `^0.3.0` |

**This does not overturn the note above.** Those eight entries were written before anyone opened the files; these three predictions were made *from* the measurement, which is a different and much easier claim to get right. The reading that survives is the same one: the entries that had been measured held to the unit, and the entries that had not held nowhere.

One thing adoption added that no entry predicted: **`.markdownlintignore` is a precondition, not a nicety.** Without it `markdownlint .` walks `node_modules`, and the 725 vendored agent-skill docs under `.claude/` dwarf the ~148 files the repo authors. §10.6 measured the rule set carefully and never asked whether the command could be run at all.

Added during implementation planning:

<!--
  MD029 off for this list only. These are items 9 and 10 of the backlog above,
  separated from it by the closing note and the postscript, so markdownlint reads
  them as a new list that ought to start at 1. The numbering is load-bearing —
  this document, the ADRs, the handoffs and several commit messages all cite
  "§10.9" and "§10.10" — and `markdownlint --fix` renumbers them to 1 and 2
  without comment, which is how this was found.
-->
<!-- markdownlint-disable MD029 -->

9. **A skills manifest tool.** `skills.json` was cut from v1 as dead config (§7). Reviving it is the same shape of problem as item 2 — it needs a dependency and something that runs it, not just a config file. **Re-measured 2026-08-16, and it has moved the wrong way.** Half the prerequisite now exists: `skills-npm` is **installed in both** consumers (`^1.2.0` and `^1.1.1`), where at [ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md) it was installed in neither. The other half still does not — **no script, no CI step and no hook invokes it in either repo**, and `skills.json` remains byte-identical at 312 bytes. So the file is no longer *merely* dead config: it is dead config that has acquired a dependency, which is precisely the hazard [ADR-0008](./docs/adr/0008-commit-linting-is-opt-in.md) refused to create for commitlint — "a tool installed and invoked by nothing" — arrived by another route. ADR-0003's conclusion stands and its reasoning now applies with more force, not less.
10. **Make CI read `.nvmrc`.** Both consuming repos hardcode `node-version: 24` in their workflows and reference `.nvmrc` nowhere, so v1 will manage a file that nothing enforces. Folds naturally into item 3. ~~**Re-measured 2026-08-16: still true, and understated.** Neither repo references `.nvmrc` in any workflow. Worse, the drift is not merely unenforced but *live* — one application-repo workflow pins **`node-version: "22"`**, disagreeing with `.nvmrc` (`v24`), with its own two other workflows (`24`), and with the package's Node floor. So Preflight manages a file that one CI job actively contradicts.~~ **Done — and the "live drift" half of that was wrong.** The base claim held: neither repo referenced `.nvmrc` anywhere, so the managed file was enforced by nothing. But the Node 22 pin is **not drift**. Opening the file rather than grepping it: that step sits in a `recap` job which provisions a separate PR-recap CLI from its own checkout, and never builds or tests the project — its Node version is that tool's business. The claim was made from a `grep node-version` without reading the surrounding job, **which is precisely the failure this section's closing note describes**, committed in the same pass that wrote the note. It is left struck through rather than deleted for that reason. Fixed in the five jobs that genuinely build or test: `node-version-file: .nvmrc` in the application repo's `test`, `e2e` and `release` jobs and the template's `test` and `release`. `.nvmrc` is `v24` and every job already pinned 24, so no resolved version changes — the point is that it can no longer stop matching without saying so. As predicted, this did not wait on item 3.

<!-- markdownlint-enable MD029 -->

---

## 11. Open beyond v1

Deliberately never scoped by the planning effort, and likely to arise early in implementation:

- ~~**How Preflight proves it works.**~~ **Resolved** — see §12. It was two questions wearing one name. The self-test half is settled there; the other half turned out to be a non-question: there is no notion of "Preflight-compliant" beyond what `preflight check` already asserts. See [ADR-0002](./docs/adr/0002-compliance-is-exactly-preflight-check.md).
- **Whether the source template survives** — rebased onto Preflight, or retired.
- ~~**Migration for partially-adopted repos** — several projects carry a subset of the tooling.~~ **Resolved by measuring, and it wanted no CLI surface.** The sentence was true and counted nothing: 8 of the 31 repos in `~/Projects` carry at least one managed file with Preflight uninstalled. Opening them splits that into three groups — **two real candidates** (`cwds`, `ams-cloud-eds`: active, pnpm, eslint, commitlint, Nuxt, structurally indistinguishable from the repos already onboarded), **two active npm repos with no Vue** for which most presets are inert, and **four that are not candidates** — three untouched since 2023–2024. So this is not a feature; it is two adoptions.

    What measuring did add, in the direction §10.5 did rather than §10.6: **not one of the eight matches what Preflight ships on any file it carries**, so zero would land in `unrecorded` — the benign state SPEC §2's adoption dividend depends on. Adoption was a no-op in the two consuming repos by construction, and is a no-op nowhere else.

    Running a real migration rather than reasoning about one found the mechanism sufficient — `sync` diffs before writing and refuses without confirmation, and `unmanaged` expresses "keep mine" — and found exactly one defect, which was vocabulary: `check` called a never-adopted repo's files **drift**, a word [`CONTEXT.md`](./CONTEXT.md) defines as divergence *from a declared agreement*, which a migrating repo has never made. Fixed as a `not-adopted` state with the exit code deliberately unchanged. See [ADR-0016](./docs/adr/0016-migration-needs-no-new-cli-surface.md), which also records why the per-file `sync` prompt is **not** contract surface — the sentence that lets 1.0.0 proceed without building it — and [ADR-0014](./docs/adr/0014-the-editor-config-is-derived-from-eslint.md)'s addendum, where a third repo answered two questions that ADR had read as silence.

    **This closes [ADR-0010](./docs/adr/0010-the-version-contract.md)'s gate on 1.0.0.**

---

## 12. Build, test, and release

Settled during implementation planning. Recorded here because it shapes the first tickets; the reasoning is in [ADR-0001](./docs/adr/0001-build-and-release-toolchain.md).

### Build — `tsdown`

`taze` and `skills-npm` are both built with it (`"build": "tsdown"` in each), and they are the two published packages structurally closest to Preflight — CLI binary, `defineConfig` export, config-file consumption. This is §4's "nothing novel here" argument applied to the toolchain: choosing `unbuild` or `tsup` would mean diverging for no measured reason. The argument was made when both were peer dependencies; `skills-npm` has since been cut (§2), which weakens the second example but not the conclusion — `taze` remains the closest published neighbour, and it still builds with tsdown.

Three entries, matching §3's exports map one-to-one: `index`, `cli`, `presets/taze`.

### Test — two layers, plus packaging

- **Unit** — pure logic: hashing, diffing, and §6's three-state lock table.
- **Integration** — `sync` and `check` run against real temporary directories, importing source. Nearly all of Preflight's behaviour is filesystem side-effects and exit codes; a mocked-`fs` suite would verify the mocks.
- **Packaging** — `publint` and `@arethetypeswrong/cli` in CI.

That third layer is not incidental. This is the first package published from these repos, and the characteristic first-publish failure is not a logic bug — it is a missing `files` entry, a subpath that resolves locally and 404s from the registry, or an absent `.d.ts`. Unit and integration tests catch none of those. Running the packaging checks is cheaper than a pack-and-install test suite and covers the same class.

### Release

1. Publish `0.1.0` by hand, to create the package and exercise the path once.
2. Then wire a tag-triggered GitHub Actions workflow using **npm trusted publishing (OIDC)** — no long-lived credential stored on a public repo, and provenance attestation comes free. `bumpp` for the version-and-tag step, as both peer dependencies use.

The manual step comes first because npm generally requires a package to exist before a trusted publisher can be configured against it. Verify before relying on it.

`publishConfig: { access: "public" }` is mandatory (§3). Scoped packages default to restricted, and omitting it fails the first publish.

**This is not the CI that §9.1 defers.** That risk is about the `preflight check` step *consumers* must add. Preflight's own release pipeline is a different thing, and v1 cannot ship without one.
