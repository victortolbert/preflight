# Preflight

[![npm](https://img.shields.io/npm/v/@victortolbert/preflight)](https://www.npmjs.com/package/@victortolbert/preflight)

The setup and safeguards a project should have **before** feature development begins — linting, type checking, tests, git hooks, commit conventions, dependency maintenance, CI, accessibility checks, and agent-facing project guidance — packaged so that projects share one source of truth instead of drifting copies.

> **Status: published.**
> Both presets, both commands, and the drift check are tested end to end from a packed install, against the real configuration of the projects Preflight was extracted from. Releases are published by GitHub Actions through npm trusted publishing, so every version carries a provenance attestation and no publish credential is stored anywhere — see [ADR-0001](./docs/adr/0001-build-and-release-toolchain.md).

```bash
pnpm add -D @victortolbert/preflight
```

## The problem

Most "starter template" approaches are copy-once: you scaffold a project, and from that moment the template and the project diverge with nothing able to detect it.

That failure was measured rather than assumed. Auditing two closely-related projects that began from a shared template found:

- **18 of 33** shared configuration files had drifted
- drift ran in **both** directions — the template had begun importing from its own consumer, so neither was authoritative
- two config files were configuring tools **that were no longer installed at all**

The last one is the interesting failure. Those files were byte-identical across every repo, which looks like consensus and is actually just inertia. Dead config cannot drift.

## The approach

Preflight is an **installed dependency**, not a scaffold — the only arrangement in which a fix can reach a project that adopted it a year ago.

It uses two mechanisms, split along a simple rule: **if a tool has a native composition point, ship a preset; otherwise write the file and track it.**

```ts
// consumed by reference — policy lives in the package
export { default } from '@victortolbert/preflight/taze'
```

```bash
# written into the repo, hashed in preflight-lock.json
preflight sync     # write managed files, diff first
preflight check    # fail CI on unexplained drift
```

`preflight check` is the enforcement point, and CI is the only gate that sees every change. v1 does not ship a workflow — you add the step:

```yaml
- name: Check for config drift
  run: pnpm exec preflight check
```

Divergence is often legitimate — database config *should* differ per project — so it is declared rather than detected:

```ts
import { definePreflightConfig } from '@victortolbert/preflight'

export default definePreflightConfig({
  unmanaged: ['.nvmrc'],
})
```

That turns divergence into a reviewable decision instead of an accident.

## Scope of v1

Three files, chosen on the principle **ship the agreement, defer the disputes**. v1 centralizes only what the consuming projects already agree on — not because those files are the most valuable, but because they are consensus with nothing preserving it, which makes them what drifts next.

Two more were cut for the same reason the dead files above are interesting: they configured tools that nothing installed or nothing ran. The check that catches that is the whole point, so they would have been poor things to ship.

Everything genuinely contested — lint rules the projects have settled in opposite directions — is deferred, so the mechanism can earn trust before it is used to settle arguments.

See [`SPEC.md`](./SPEC.md) for the full specification, the rejected alternatives and why, the residual risks, and the v2 backlog.

## What is actually in it

| File | Mechanism | What it carries | What reads it |
|---|---|---|---|
| `taze.config.ts` | preset | `exclude: ['@fortawesome/*']` | `taze`, a devDependency, via your own update script |
| `.nvmrc` | CLI-written | `v24` | `actions/setup-node`, via `node-version-file` |
| `axe-linter.yml` | CLI-written | `rules: { empty-heading: false }` | **an editor extension — see below** |
| `commitlint.config.ts` | preset, **opt-in** | conventional commits, tuned to measured practice | `commitlint`, via the `commit-msg` hook |
| `.editorconfig` | CLI-written | indent, final newline, trailing whitespace — derived from eslint | **an editor extension — see below** |

**The last column is a rule, not a courtesy: a managed file ships only if Preflight can name what reads it.** Two of these are read by an editor extension whose presence a repo cannot confirm, and Preflight does not check for either — so this is where you find out, before adopting rather than after.

- **`axe-linter.yml` needs `deque-systems.vscode-axe-linter`.** axe Linter also ships a GitHub Action and a CI Connector that read the same file, but neither is used in any repo here, so in practice the extension is its only reader. Without it, `preflight sync` writes a configuration file nothing reads — which is the failure this package exists to catch, so it is worth adding the recommendation to `.vscode/extensions.json` when you adopt.
- **`.editorconfig` needs `EditorConfig.EditorConfig` in VS Code**, which has no built-in support. Its keys are derived from eslint rules you are already enforcing, so the policy survives the extension's absence even though the file does nothing.

See [ADR-0017](./docs/adr/0017-a-managed-file-must-name-what-reads-it.md) for why both ship anyway rather than being cut.

Every one of these was extracted from the consuming projects rather than chosen. For the v1 set that extraction was literal: `.nvmrc` and `axe-linter.yml` are byte-identical to what those projects already have, so `preflight sync` run against either writes nothing and reports "Managed files are up to date" — the no-op adoption above, demonstrated rather than argued.

**`.editorconfig` is the exception, and the first managed file that changes something.** Both repos carry one at 0 bytes, so there was nothing to extract from the file — but the agreement it encodes exists in `eslint.config.mjs`, byte-identical in both, and every key is derived from a rule they already enforce. Adopting it therefore writes a real file where an empty one sat, which is why it ships in a breaking release. See [ADR-0014](./docs/adr/0014-the-editor-config-is-derived-from-eslint.md).

**A fourth file was cut during implementation.** `skills-npm.config.ts` looked like shared policy: byte-identical across both projects, and carrying two settings that differ from the tool's own defaults. Reading it settled the matter — it is the tool's README example verbatim, every line of it, with eight lines of placeholder examples deleted. The two "settings" are the README's values. Nothing in either project runs the tool.

That is the third file cut from this scope on the same test, and the second one cut for looking like consensus when it was inertia. It is also the one that got furthest before anyone opened it: it survived a specification, a ticket, and an architecture decision record, all of which described the file rather than reading it. Preflight exists because configuration drifts when nobody looks; the same habit is what nearly shipped this.

## Commit linting

Opt-in, and the only preset that is. Adopting it takes three lines and one dependency:

```bash
pnpm add -D @commitlint/cli
```

```ts
// commitlint.config.ts
export default { extends: ['@victortolbert/preflight/commitlint'] }
```

```jsonc
// package.json
"simple-git-hooks": {
  "commit-msg": "pnpm exec commitlint --edit $1"
},
"scripts": {
  // git hooks are not installed until something runs simple-git-hooks
  "prepare": "simple-git-hooks"
}
```

Note the `extends`, rather than the re-export the taze preset uses. A commitlint config carries references that get resolved relative to wherever the config lives, so copying the object away from this package breaks them — see [ADR-0007](./docs/adr/0007-commitlint-presets-are-consumed-via-extends.md).

**It is opt-in because a mandatory one would manufacture the exact thing Preflight exists to catch.** Declared as a required peer, pnpm's `auto-install-peers` silently installs commitlint into every consuming repo — including any that never wire the hook, leaving a tool installed and invoked by nothing. That is dead config by this project's own definition, arriving invisibly. See [ADR-0008](./docs/adr/0008-commit-linting-is-opt-in.md).

The two rules that depart from stock `@commitlint/config-conventional` were measured, not chosen. Across 1,472 commits in the consuming repos, the stock config disagreed with practice six times and was wrong all six — four acronym-initial subjects it cannot distinguish from Sentence Case (`SHA-pin`, `WCAG`, `Chromium`), and two uses of a `content` type that is real in a content-driven repo. So `content` joins the enum, and `subject-case` drops to a warning. Nothing else changes.

## Accessibility rules

Three `vue-a11y` rules, spread into the `overrides` of `@antfu/eslint-config`'s `vue` block:

```ts
// eslint.config.mjs
import preflightVueA11y from '@victortolbert/preflight/vue-a11y'

export default antfu({
  vue: {
    a11y: true,
    overrides: { ...preflightVueA11y },
  },
})
```

No dependency to add — the plugin already runs inside `@antfu/eslint-config`. So this preset raises none of commit linting's opt-in question: there is no tool a consumer could install and leave unwired.

**Three rules, though one consuming repo carries thirteen.** Stripping each repo's overrides and running eslint shows none of them are stale — every rule each repo silences does fire in it. But each repo silences exactly what its own content trips, and the application repo trips ten more only because it holds a component showcase the template has no equivalent of. Ten rules the template has never had occasion to hold a view on are not agreement, so they stay where they are.

The rule worth having is `label-has-for`. The stock default demands *both* nesting and an `id`, which rejects `<label>Name <input></label>` — valid HTML that associates perfectly well. Switching to `some` takes the template from 21 hits to **0** and the application repo from 96 to **46**: it deletes the false positives and leaves the real ones. That is why it ships as an `error` rather than the blanket `off` one repo had settled on. See [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md).

Adopting this is **not** the no-op the v1 files were. A repo that currently disables `label-has-for` will see real violations on first run — that is the preset working, not a defect.

## Markdown rules

Seven `markdownlint` rules, consumed through markdownlint's own `extends`:

```json
{
  "extends": "@victortolbert/preflight/markdownlint",
  "MD041": false
}
```

Note the `extends`, as with commitlint — and here it is the *only* option. markdownlint auto-discovers no JavaScript config form, and `extends` pointing at an ESM module is **silently ignored**: no error, no rules applied. So this preset ships as JSON, and a local key on the same object overrides the preset, which is how a repo declares divergence at the point of divergence.

**Seven rules, though one consuming repo carries nine and the other twenty-one.** A rule ships only if it fires in *both* repos under stock defaults **and** survives `markdownlint --fix`. The second half matters more than it sounds: 26% of the template's violations are auto-fixable, and `MD034` — disabled in both repos — is fixable to **zero**. Disabling it is a decision to keep bare URLs rather than run the fixer once.

**The overlap between the two configs is not agreement.** One repo's config is calibrated — its nine suppressions are exactly the nine rules that fire, and it exits clean. The other's has never been run: nine of its twenty-one entries silence rules that fire nowhere, five rules fire that it does not silence, and nothing in the repo invokes markdownlint at all. These files are carried between projects and edited, so the shared entries are inheritance rather than consensus. See [ADR-0013](./docs/adr/0013-markdownlint-ships-seven-rules-as-json-via-extends.md).

`MD013` is disabled rather than tuned, and that was measured rather than assumed — at `line_length: 160` with tables and code blocks excluded it still leaves 1,292 standing violations in one repo. A rule nobody can get to zero is a permanent red, not a guard.

## Security headers

Three response headers, spread into Nitro's `routeRules`:

```ts
// nuxt.config.ts
import preflightSecurityHeaders from '@victortolbert/preflight/security-headers'

export default defineNuxtConfig({
  routeRules: {
    ...preflightSecurityHeaders,
    '/app': { redirect: '/dashboard' },
  },
})
```

Nothing to install, and unlike every other preset here this one is **not** a no-op on adoption: it adds headers that are currently absent.

**Reclaimed from `netlify.toml`, where both repos had agreed on them and neither was served them.** The header blocks are byte-identical in both consuming repos — the cleanest agreement Preflight has measured. They were also entirely inert: neither repo has a Netlify site or a Vercel project any more, and the one that is live serves from Railway, which reads neither file. A request to production returned no `X-Frame-Options`, no `X-Content-Type-Options` and no `Referrer-Policy`. `routeRules` is where the policy survives a change of host, which is what §10.5 meant by *host-independently*.

**Three headers, though the agreed block holds five.** The other two are `immutable` caching for `/_nuxt/*` and `/img/*`. Nitro already sets that header on `/_nuxt/*` itself, so restating it would guard nothing. `/img/*` serves `public/`, whose filenames carry no content hash — `immutable` there means a replaced image is ignored for a year, so that rule failing to reach production was luck, not design.

**No HSTS and no CSP**, which are the two a reader looks for first. Neither repo sets either, anywhere. That is silence rather than consensus, and both carry real deployment risk this package cannot judge from here. See [ADR-0012](./docs/adr/0012-security-headers-are-reclaimed-as-route-rules.md).

## Versioning

**Breaking means anything that can newly fail your build.** Three changes that look additive and are treated as breaking anyway:

- **adding a managed file** — it arrives absent from your repo and `preflight check` would fail on it
- **adding or tightening an enforcing preset rule** — presets are consumed by reference, so a change reaches you with no lock, no `sync`, and nothing in `check` that sees it
- **raising the Node engine floor** — it cannot fail at runtime, but it makes the package uninstallable

Covered by that promise: the `exports` map, preset values, CLI commands and flags, exit codes, the `PreflightConfig` and `ManagedFile` types, and the engine floor. The `preflight-lock.json` format is **internal** — Preflight generates it, nothing else reads it, and freezing it would price a format improvement at a major bump.

**Breaking changes go in the major slot.** `^1.0.0` admits every `1.x`, so a minor or a patch reaches you automatically — which is safe precisely because "additive" is defined above as *cannot newly fail your build*, and the three deceptive cases are treated as breaking rather than additive.

Until `1.0.0` this worked differently: breaking went in the *minor* slot (`0.4.0`, not `0.3.1`), because minors do not flow under a `0.x` caret. If you are still on a `^0.x` range, that is what your range promises, and moving to `^1.0.0` is a deliberate bump.

**1.0.0 shipped once migration for partially-adopted repos was settled** (SPEC §11) — that was the one open question that could still have moved the CLI surface, and this version is the claim that it won't. It resolved by measuring rather than by building: see [ADR-0016](./docs/adr/0016-migration-needs-no-new-cli-surface.md).

The covered surfaces are pinned by tests, so a breaking change fails CI before it can be published rather than after — the exports map, managed-file list, engine floor and preset values in `test/stability.test.ts`, and the CLI's exit codes in `test/cli-check.test.ts` and `test/cli-sync.test.ts`. See [ADR-0010](./docs/adr/0010-the-version-contract.md).

## License

MIT © 2026 Victor Tolbert
