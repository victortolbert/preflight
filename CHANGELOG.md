# Changelog

Written by hand, and organised around one question: **can this upgrade newly fail your build?**

That is [ADR-0010](./docs/adr/0010-the-version-contract.md)'s definition of breaking, and it is the thing a changelog is opened to answer. It is also a per-version judgement no commit-derived generator can make — three kinds of change here look additive and are not, and the commits that carry most of this project's substance are `docs:`, which a generator drops. So this file is curated rather than generated, deliberately.

Every entry says what the upgrade does to a repo that already depends on Preflight. The reasoning behind each decision is in the linked ADR.

## 1.0.0 — 2026-08-17

**Upgrading from `0.4.x`: safe, but read this — your caret now behaves differently.**

No behaviour changed. This release is a promise about the interface, not a change to it.

What changes is what your range admits. Under `^0.4.0`, minors did not flow and every breaking change needed a hand bump. Under `^1.0.0`, every `1.x` reaches you automatically — which is safe *because* the three deceptive cases below are classified as breaking rather than additive, so an automatic minor cannot newly fail your build.

- Covered by the contract: the `exports` map, preset values, CLI commands and flags, exit codes, the `PreflightConfig` and `ManagedFile` types, and the Node engine floor.
- Explicitly internal: the `preflight-lock.json` format.
- Treated as **breaking** despite looking additive: adding a managed file, adding or tightening an *enforcing* preset rule, raising the Node engine floor.

Gated on SPEC §11's migration question, which resolved by measuring rather than by building — see [ADR-0016](./docs/adr/0016-migration-needs-no-new-cli-surface.md). The per-file `sync` prompt is explicitly *not* contract surface, so it can still ship in a minor.

## 0.4.1 — 2026-08-17

**Upgrading from `0.4.0`: safe.** Output wording only; no exit code moved.

- `preflight check` no longer calls a never-adopted repo's files *drift*. A repo with no `preflight-lock.json` has no declared agreement to have diverged from, so it now reports `not adopted` with advice to adopt. **The gate is unchanged** — this still exits 1. ([ADR-0016](./docs/adr/0016-migration-needs-no-new-cli-surface.md))

## 0.4.0 — 2026-08-16

**Upgrading from `0.3.x`: BREAKING. `preflight check` will fail until you act.**

- **`.editorconfig` is now a managed file.** It arrives with no lock entry, so `check` reports it and exits non-zero in a repo that chose nothing. Run `preflight sync` to take it, or declare it in `unmanaged` to keep yours. This is the first release to add a managed file, and [ADR-0010](./docs/adr/0010-the-version-contract.md) predicted this item by name as the one that would cost a bump.
- Its contents are *derived*, not authored — every key restates a rule the consuming repos' eslint config already enforced. `end_of_line` and `charset` are deliberately absent. ([ADR-0014](./docs/adr/0014-the-editor-config-is-derived-from-eslint.md), and its addendum on the limits of that sample.)

## 0.3.2 — 2026-08-16

**Upgrading from `0.3.1`: safe.** New subpath; nothing existing changed.

- Adds `@victortolbert/preflight/markdownlint` — seven rules, shipped as JSON and consumed through markdownlint's own `extends`. A rule ships only if it fires in both consuming repos under stock defaults *and* survives `markdownlint --fix`. Adopting it is opt-in and changes nothing until you point a config at it. ([ADR-0013](./docs/adr/0013-markdownlint-ships-seven-rules-as-json-via-extends.md))

## 0.3.1 — 2026-08-15

**Upgrading from `0.3.0`: safe.** New subpath; nothing existing changed.

- Adds `@victortolbert/preflight/security-headers` — three headers as a Nitro `routeRules` fragment. Deliberately no HSTS and no CSP: neither consuming repo set either anywhere, and that is silence rather than consensus. This is the first preset that is *not* framework-independent, which narrows what the package claims for itself. ([ADR-0012](./docs/adr/0012-security-headers-are-reclaimed-as-route-rules.md))
- `fix(test)`: accept npm 12's changed `pack --json` shape.

## 0.3.0 — 2026-08-08

**Upgrading from `0.2.x`: safe.** Both behaviour changes are loosenings — this release is where the rule that makes that claim meaningful was written down.

- Adds `@victortolbert/preflight/vue-a11y` — three rules, which is what survived measuring a disagreement that looked substantial and mostly was not. ([ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md))
- **`check` no longer fails a file Preflight began managing after your last sync.** Previously such a file resolved to drift, reddening CI in a repo that had chosen nothing. The distinction that keeps it honest: a project that has *never* synced is not receiving news, and still fails.
- **`readLock` now validates `version`.** `LOCK_VERSION` was exported, documented as the field to bump, and read by nothing — a future v2 lock would have been parsed as v1. Only a *newer* lock is refused.
- The version contract is established here. ([ADR-0010](./docs/adr/0010-the-version-contract.md))

## 0.2.0 — 2026-08-06

**Upgrading from `0.1.x`: safe.** New subpath, opt-in, and inert until you wire it.

- Adds `@victortolbert/preflight/commitlint`, consumed through commitlint's own `extends` ([ADR-0007](./docs/adr/0007-commitlint-presets-are-consumed-via-extends.md)). Tuned to measured practice rather than shipped stock: linting 1,472 commits found the convention already followed at 95 of 100 recent commits, and all six deviations were the stock config being wrong about this project.
- **Deliberately not a required peer dependency.** A mandatory one would install commitlint into every consuming repo including those that never wire the hook — a tool installed and invoked by nothing, which is this project's own definition of dead config. ([ADR-0008](./docs/adr/0008-commit-linting-is-opt-in.md))

## 0.1.2 — 2026-08-05

**Upgrading from `0.1.1`: safe.** No package surface changed.

- Corrects an invented rationale in the taze preset's comments — a claim about the tool that had been reasoned rather than checked.
- Bumps `pnpm/action-setup` in this repo's own CI.

## 0.1.1 — 2026-08-05

**Upgrading from `0.1.0`: safe.** Same single subpath.

First automated release, published by the tag-triggered OIDC workflow with provenance attestation. `0.1.0` had to exist first, because npm configures trusted publishing only against a package that already exists. ([ADR-0001](./docs/adr/0001-build-and-release-toolchain.md), [`docs/releasing.md`](./docs/releasing.md))

## 0.1.0 — 2026-08-05

First publish, by hand.

- `preflight sync` writes managed files behind a diff, and never without confirmation.
- `preflight check` exits non-zero on drift in a managed, non-opted-out file.
- `definePreflightConfig`, and `unmanaged` as the declared escape hatch.
- Managed files: `.nvmrc` and `axe-linter.yml`.
- One preset: `@victortolbert/preflight/taze`.

A `skills-npm` preset was built and **cut before this release** rather than shipped — `skills.json` was byte-identical everywhere it appeared and invoked by nothing, which reads as consensus and is inertia. It has never appeared in a published version. ([ADR-0003](./docs/adr/0003-drop-skills-json-as-dead-config.md))
