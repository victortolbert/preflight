# Build and release toolchain

Preflight is built with **tsdown**, ships **ESM-only** with a **hand-written** exports map verified by `publint`, and is published via **npm trusted publishing (OIDC)** after one manual `0.1.0` release. The deciding evidence is that both peer dependencies — `taze` and `skills-npm`, the two published packages structurally closest to Preflight — already build with tsdown, and both are `type: module`. This is SPEC §4's "choose nothing novel to the consuming codebases" argument applied to the toolchain rather than to the mechanisms.

## Considered Options

- **unbuild** — mature and capable, but no precedent among the packages Preflight sits beside.
- **tsup** — widest install base, and the tool tsdown was written to replace; adopting it means taking the older side of a migration this ecosystem has already made.
- **No bundler, `tsc` only** — viable given ESM-only and Node 24, but hand-rolls shebang handling and CLI packaging for no gain.
- **Generated exports map** (`tsdown`'s `exports: true`) — cannot disagree with the build, but makes `package.json` a build output, requiring either committed churn or a CI check that the committed copy is current. Rejected because `publint` already fails on an unresolvable path, so the drift is caught either way and `package.json` stays a source file.
- **`NPM_TOKEN` in Actions secrets** — simpler, but stores a long-lived publish credential on a public repository and forfeits provenance attestation.

## Consequences

The manual first publish exists because npm generally requires a package to exist before a trusted publisher can be configured against it. Verify this at implementation time rather than taking it on trust.

`publishConfig: { access: "public" }` is mandatory — scoped packages default to restricted, and omitting it fails the first publish.
