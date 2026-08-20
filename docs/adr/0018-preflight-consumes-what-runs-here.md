# Preflight consumes what runs here, which is two presets and one of three managed files

[ADR-0017](./0017-a-managed-file-must-name-what-reads-it.md) says a managed file ships only if Preflight can name what reads it. Until this ADR, the repo that says so consumed *none* of its own managed files. This records why most of that absence is a principle rather than an oversight — and closes the one part of it that was an oversight, which had already cost something.

**The rule is ADR-0003's death test, applied inward.** Preflight adopts what actually runs here, and nothing else. That is the same bar it holds every candidate file to, so the limit is not pragmatism — dogfooding for completeness would break the principle it is meant to demonstrate.

## What is consumed, measured

| | Consumed here | Why |
|---|---|---|
| `markdownlint` preset | **yes** | `.markdownlint.json` extends `./presets/markdownlint.json`; `Lint Markdown` runs it in CI |
| `commitlint` preset | **yes** | `commitlint.config.ts` re-exports `./src/presets/commitlint`; `Lint commit messages` runs it in CI |
| `taze` preset | no | no `taze.config.ts`, no script invoking it |
| `vue-a11y` preset | no | no eslint here at all — no config file, no eslint dependency |
| `security-headers` preset | no | a Nuxt `routeRules` fragment; this is not a Nuxt app |
| `.nvmrc` | **yes, now managed** | `ci.yml:34` and `release.yml:37` read it via `node-version-file`; synced and locked by this ADR |
| `.editorconfig` | no — **declared unmanaged** | nothing here reads it; see below |
| `axe-linter.yml` | no — **declared unmanaged** | nothing here to lint; see below |
| `preflight-lock.json` | **yes** | written by this ADR's sync; one entry |

The two declines are **declared in `preflight.config.ts` rather than merely absent**, which is what SPEC §6's escape hatch is for and the difference between a reviewable decision and drift nobody looked at. It also means this repo now demonstrates the opt-out mechanism as well as the check.

Both presets are consumed **by relative path, not by subpath**, because the subpath form would need the package installed into itself — the reason `commitlint.config.ts` carries in a comment, recorded in [ADR-0013's addendum](./0013-markdownlint-ships-seven-rules-as-json-via-extends.md).

**`taze` is present for authoring, not for running.** It is a peer dependency at `>=19` and a devDependency at `19.17.1`, which is what lets the preset be typechecked and built. No config file consumes it and no script invokes it. That distinction is easy to lose — a dependency in `package.json` reads as adoption, and here it is the toolchain for producing the preset rather than a consumer of it.

## Where adopting would be actively wrong

`axe-linter.yml`, `vue-a11y` and `security-headers` have nothing to act on here: no Vue, no HTML or JSX, and no Nuxt app. Adopting any of them would install configuration nothing reads — manufacturing the precise failure ADR-0003 exists to cut, in the repo that cut two files on it. The absence is the principle working.

**`.editorconfig` looks like the easy win and is not.** In the consumers it is redundant-but-harmless, because ADR-0014 derived every key from an eslint rule those repos enforce, so the policy survives the file being unread. **That backstop does not exist here.** This repo has no eslint config and no eslint dependency of any kind; its only lint gate is `lint:md`. Adding `.editorconfig` here, with no `.vscode/extensions.json` either, would produce a file with *zero* readers — a worse instance of ADR-0017's finding than either file that prompted it, in the repo that wrote the criterion.

Adopting it would therefore mean creating `.vscode/extensions.json` first, which is a real change to this repo rather than a formality.

## The oversight, which is the useful part

`.nvmrc` is the one managed file whose reader is verifiably present here — CI reads it on every run of both workflows. It was not managed when this ADR was written, and the cost of that was already visible:

```
this repo's .nvmrc:      24
templates/.nvmrc:        v24
```

**They differ, and [ADR-0005's addendum](./0005-shipped-template-content-is-provisional.md) is the ADR about that exact byte.** It records that the template originally said `24`, that the real consuming files say `v24`, that `24` had been *inferred from a CI workflow rather than read from the file*, and that shipping it would have turned Preflight's most confident template into a diff on first contact. The template was corrected. This repo's own copy was not, and nothing noticed, because nothing here checks.

Both values were valid and nothing was broken. That is what makes it the right example: it was drift, in the package whose entire purpose is catching drift, surviving unseen because the package did not run its own check on itself. It is fixed in this ADR's own change — see Consequences.

## Considered Options

- **Adopt everything, for symmetry.** Rejected — it installs dead config, which is the failure this package exists to detect.
- **Adopt nothing and say so.** The status quo. It is defensible for the presets and the two absent managed files, and it is not defensible for `.nvmrc`, which is live here.
- **Adopt `.editorconfig` as the visible gesture.** Rejected as written: with no eslint and no editor recommendation here, it would be the worst-supported managed file in the project.
- **Manage `.nvmrc`: run `preflight sync` here, commit `preflight-lock.json`, add a `preflight check` step to `ci.yml`** — **chosen.**

## Consequences

The asymmetry is recorded rather than implied, so "Preflight does not use its own output" reads as a measured position instead of an embarrassment nobody addressed.

**`.nvmrc` is now managed, and `ci.yml` gains a `Check for config drift` step.** This is the first place `preflight check` runs against a real repository rather than a test fixture. The step runs last and invokes `node dist/cli.mjs` rather than the `bin` name, because resolving the bin would need the package installed into itself — the same constraint the two consumed presets work around.

The stronger argument for it is the forcing function rather than the check: change `templates/.nvmrc`, and CI fails *here* until the change is re-synced, so the cost an adopter pays is felt on the same push instead of being discovered in a third repo six days later. **Its reach is that one file.** The other two managed files are declared `unmanaged` above, and `check` short-circuits them before any comparison, so their templates can change without failing anything here.

**The drift is fixed.** `preflight sync` rewrote `.nvmrc` from `24` to `v24` and wrote a one-entry `preflight-lock.json`. Verified before and after: `check` exited 1 on `not adopted .nvmrc`, and exits 0 reporting `in sync` with the two opt-outs listed as `unmanaged`.

**What would change the answer.** This package growing content that gives a currently-inert preset something to act on — HTML fixtures for `axe-linter.yml`, or eslint arriving for `vue-a11y` — would move that row from "wrong to adopt" to "should adopt," on the same test that excludes it today.
