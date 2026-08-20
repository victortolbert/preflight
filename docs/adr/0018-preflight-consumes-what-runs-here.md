# Preflight consumes what runs here, which is two presets and none of its managed files

[ADR-0017](./0017-a-managed-file-must-name-what-reads-it.md) says a managed file ships only if Preflight can name what reads it. The repo that says so consumes none of its own managed files. This ADR records why, because the answer is a principle rather than an oversight, and because the one place it *is* an oversight is worth having written down.

**The rule is ADR-0003's death test, applied inward.** Preflight adopts what actually runs here, and nothing else. That is the same bar it holds every candidate file to, so the limit is not pragmatism — dogfooding for completeness would break the principle it is meant to demonstrate.

## What is consumed, measured

| | Consumed here | Why |
|---|---|---|
| `markdownlint` preset | **yes** | `.markdownlint.json` extends `./presets/markdownlint.json`; `Lint Markdown` runs it in CI |
| `commitlint` preset | **yes** | `commitlint.config.ts` re-exports `./src/presets/commitlint`; `Lint commit messages` runs it in CI |
| `taze` preset | no | no `taze.config.ts`, no script invoking it |
| `vue-a11y` preset | no | no eslint here at all — no config file, no eslint dependency |
| `security-headers` preset | no | a Nuxt `routeRules` fragment; this is not a Nuxt app |
| `.nvmrc` | **present, live, unmanaged** | `ci.yml:34` and `release.yml:37` read it via `node-version-file`; no lock entry, never synced |
| `.editorconfig` | no | absent |
| `axe-linter.yml` | no | absent |
| `preflight-lock.json` | no | this repo has never run `preflight sync` on itself |

Both presets are consumed **by relative path, not by subpath**, because the subpath form would need the package installed into itself — the reason `commitlint.config.ts` carries in a comment, recorded in [ADR-0013's addendum](./0013-markdownlint-ships-seven-rules-as-json-via-extends.md).

**`taze` is present for authoring, not for running.** It is a peer dependency at `>=19` and a devDependency at `19.17.1`, which is what lets the preset be typechecked and built. No config file consumes it and no script invokes it. That distinction is easy to lose — a dependency in `package.json` reads as adoption, and here it is the toolchain for producing the preset rather than a consumer of it.

## Where adopting would be actively wrong

`axe-linter.yml`, `vue-a11y` and `security-headers` have nothing to act on here: no Vue, no HTML or JSX, and no Nuxt app. Adopting any of them would install configuration nothing reads — manufacturing the precise failure ADR-0003 exists to cut, in the repo that cut two files on it. The absence is the principle working.

**`.editorconfig` looks like the easy win and is not.** In the consumers it is redundant-but-harmless, because ADR-0014 derived every key from an eslint rule those repos enforce, so the policy survives the file being unread. **That backstop does not exist here.** This repo has no eslint config and no eslint dependency of any kind; its only lint gate is `lint:md`. Adding `.editorconfig` here, with no `.vscode/extensions.json` either, would produce a file with *zero* readers — a worse instance of ADR-0017's finding than either file that prompted it, in the repo that wrote the criterion.

Adopting it would therefore mean creating `.vscode/extensions.json` first, which is a real change to this repo rather than a formality.

## The oversight, which is the useful part

`.nvmrc` is the one managed file whose reader is verifiably present here — CI reads it on every run of both workflows. It is not managed, and the cost of that is already visible:

```
this repo's .nvmrc:      24
templates/.nvmrc:        v24
```

**They differ, and [ADR-0005's addendum](./0005-shipped-template-content-is-provisional.md) is the ADR about that exact byte.** It records that the template originally said `24`, that the real consuming files say `v24`, that `24` had been *inferred from a CI workflow rather than read from the file*, and that shipping it would have turned Preflight's most confident template into a diff on first contact. The template was corrected. This repo's own copy was not, and nothing noticed, because nothing here checks.

Both values are valid and nothing is broken. That is what makes it the right example: it is drift, in the package whose entire purpose is catching drift, surviving unseen because the package does not run its own check on itself.

## Considered Options

- **Adopt everything, for symmetry.** Rejected — it installs dead config, which is the failure this package exists to detect.
- **Adopt nothing and say so.** The status quo. It is defensible for the presets and the two absent managed files, and it is not defensible for `.nvmrc`, which is live here.
- **Adopt `.editorconfig` as the visible gesture.** Rejected as written: with no eslint and no editor recommendation here, it would be the worst-supported managed file in the project.
- **Manage `.nvmrc`: run `preflight sync` here, commit `preflight-lock.json`, add a `preflight check` step to `ci.yml`** — identified as the candidate worth taking, and not taken in this ADR.

## Consequences

The asymmetry is recorded rather than implied, so "Preflight does not use its own output" reads as a measured position instead of an embarrassment nobody addressed.

**What the unclaimed option would buy, since it should not be lost.** Managing `.nvmrc` here would make this the first repo where `preflight check` runs against Preflight's own files on every push, exercising the CLI on a real repository rather than only on test fixtures. The stronger argument is the forcing function: change a template, and CI fails *here* until it is re-synced, so the cost an adopter pays is felt immediately rather than discovered in a third repo six days later. The `24`/`v24` drift is what that check would have caught.

It is not done here because adding a gate to this repo's CI is a change to how this repo is built, which is a separate decision from recording why the rest is absent.

**What would change the answer.** This package growing content that gives a currently-inert preset something to act on — HTML fixtures for `axe-linter.yml`, or eslint arriving for `vue-a11y` — would move that row from "wrong to adopt" to "should adopt," on the same test that excludes it today.
