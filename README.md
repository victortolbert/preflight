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

| File | Mechanism | What it carries |
|---|---|---|
| `taze.config.ts` | preset | `exclude: ['@fortawesome/*']` |
| `.nvmrc` | CLI-written | `v24` |
| `axe-linter.yml` | CLI-written | `rules: { empty-heading: false }` |
| `commitlint.config.ts` | preset, **opt-in** | conventional commits, tuned to measured practice |

Every one of these was extracted from the consuming projects rather than chosen, and both CLI-written templates are byte-identical to what those projects already have. `preflight sync` run against either of them writes nothing and reports "Managed files are up to date" — the no-op adoption above, demonstrated rather than argued.

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

## Versioning

**Breaking means anything that can newly fail your build.** Three changes that look additive and are treated as breaking anyway:

- **adding a managed file** — it arrives absent from your repo and `preflight check` would fail on it
- **adding or tightening an enforcing preset rule** — presets are consumed by reference, so a change reaches you with no lock, no `sync`, and nothing in `check` that sees it
- **raising the Node engine floor** — it cannot fail at runtime, but it makes the package uninstallable

Covered by that promise: the `exports` map, preset values, CLI commands and flags, exit codes, the `PreflightConfig` and `ManagedFile` types, and the engine floor. The `preflight-lock.json` format is **internal** — Preflight generates it, nothing else reads it, and freezing it would price a format improvement at a major bump.

**While this package is 0.x, breaking changes go in the minor slot** — `0.4.0`, not `0.3.1`. A caret range is therefore safe as it stands: `^0.3.0` resolves `>=0.3.0 <0.4.0`, so no breaking change reaches you without a deliberate bump, patch releases included.

**1.0.0 ships when migration for partially-adopted repos is settled** (SPEC §11). That is the one open question that could still change the CLI surface, and 1.0.0 is a claim that it won't.

The covered surfaces are pinned in `test/stability.test.ts`, so a breaking change fails CI before it can be published rather than after. See [ADR-0010](./docs/adr/0010-the-version-contract.md).

## License

MIT © 2026 Victor Tolbert
