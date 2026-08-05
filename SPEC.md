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

**Five files.** Every one configures a tool that is actually installed and running.

| File | Mechanism | Consumed as |
|---|---|---|
| `taze.config.ts` | preset | `@victortolbert/preflight/taze` |
| `skills-npm.config.ts` | preset | `@victortolbert/preflight/skills-npm` |
| `.nvmrc` | CLI-written | `preflight sync` |
| `axe-linter.yml` | CLI-written | `preflight sync` |
| `skills.json` | CLI-written | `preflight sync` |

### The principle: ship the agreement, defer the disputes

v1 takes only what the consuming repos already agree on. Agreed files are not the most valuable — they are consensus with **nothing currently preserving it**, which makes them what drifts next.

Deferring the disputes is not avoidance. Adjudicating lint rules that two repos have settled in *opposite* directions is real work that will make one repo worse before it makes it better. Doing that *through a mechanism nobody trusts yet* compounds two risks better taken one at a time.

**A dividend of this choice:** adoption is a **no-op** for the existing repos. They are byte-identical on all five files, so adopting v1 changes nothing and surfaces zero violations.

---

## 3. Package shape

```jsonc
{
  "name": "@victortolbert/preflight",
  "version": "0.1.0",
  "private": false,
  "publishConfig": { "access": "public" },   // REQUIRED — scoped packages default to restricted
  "bin": { "preflight": "./dist/cli.js" },
  "exports": {
    "./taze": "./dist/presets/taze.js",
    "./skills-npm": "./dist/presets/skills-npm.js"
  },
  "peerDependencies": {
    "taze": ">=19",
    "skills-npm": ">=1"
  },
  "files": ["dist", "templates"]
}
```

**One package, not several.** Multiple packages could drift out of version-sync *with each other*, recreating inside Preflight the exact failure it exists to fix.

**Subpaths are tool-named and framework-silent** — `/taze`, never `/nuxt/taze`. Every v1 file is framework-independent, and namespacing them under a framework would both mislead and misname the package for the plain-JavaScript projects that are the likeliest second consumer.

---

## 4. The two mechanisms

**Assignment rule — *if the tool has a native composition point, it is a preset; otherwise the CLI writes it.***

Neither mechanism is novel to the consuming codebases, which is the reason to choose them over a third invention: config files there already read `extends: [...]` from published presets, and a file-distributing CLI (`skills-npm`) already writes managed files into those repos, complete with `.gitignore` handling, dry-run, and confirmation prompts.

**Presets cannot drift.** They are consumed by reference, so their policy lives in the package. Only the three CLI-written files are real drift surface.

### Rejected

- **Nuxt Layers** — framework-native, and the current consumers are Nuxt. But neither repo uses `extends` in `nuxt.config.ts`, and that config is dominated by project-specific workarounds. The layer would carry almost none of the shared surface and still miss editor config, CI, and git hooks.
- **A single CLI owning everything** — discards the ecosystem's own composition points, turning a one-line `extends` into a generated file that then needs its own drift detection.
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
2. **Preset abandonment is undetectable.** Replace an `extends` with inline config and nothing notices; the dependency is still installed and the lockfile still valid.
3. **`preflight.config.ts` is unmanaged by construction.** Nothing prevents a repo opting out of everything and passing. The check is an honesty aid, not a control.
4. **v1 is small.** Five files, two configured tools. It proves the mechanism honestly; whether that is a satisfying debut is a judgement call, worth revisiting once the mechanism lands.

---

## 10. v2 backlog, in priority order

1. **The accessibility gap.** The consuming repos disagree substantially on accessibility lint enforcement — the only divergence found with user-facing consequence.
2. **Revive commit linting.** Conventional commits are demonstrably in use, enforced by nothing. Needs the dependency and a `commit-msg` hook, not just a config file.
3. **CI workflows and action SHA-pinning.** Also closes residual risk #1.
4. **eslint** — requires settling style questions the repos have answered in opposite directions.
5. **Deploy security headers**, reclaimed host-independently.
6. **markdownlint** — a substantial set of rules in dispute.
7. **Editor config** — needs *writing*, not extracting.
8. **tsconfig, vitest, playwright** — and with them, the version-pinning and catalog questions return with real weight, since these are tools whose version differences change results silently rather than loudly.

---

## 11. Open beyond v1

Deliberately never scoped by the planning effort, and likely to arise early in implementation:

- **How Preflight proves it works** — whether the layer carries its own tests or conformance checks, and what "this repo is Preflight-compliant" should assert.
- **Whether the source template survives** — rebased onto Preflight, or retired.
- **Migration for partially-adopted repos** — several projects carry a subset of the tooling.
