# Preflight

The foundational project-setup layer — the safeguards a project should have before feature work begins — distributed as an installed package rather than copied by a scaffold.

## Language

**Preset**:
Configuration consumed by reference through a subpath export, via whatever native composition point the tool provides. Its policy lives in the package. The composition point differs by tool and is not part of the term: `taze` takes a typed options object the consumer spreads, while commitlint is named in the consumer's `extends`, because a commitlint config carries references that only resolve where it lives.
_Avoid_: extended config — and do not assume the composition point. Saying a preset is "extended" implies every tool has an `extends` key; neither `taze` nor `skills-npm` does. Name the tool's own mechanism.

**Managed file**:
A file the CLI writes into a consuming repo and tracks by hash in `preflight-lock.json`. Distinct from a preset, which is never written into the consumer.
_Avoid_: generated file, synced file

**Unmanaged**:
A managed file a consumer has explicitly opted out of, declared in `preflight.config.ts`. A recorded, reviewable decision — the legitimate counterpart to drift.
_Avoid_: ignored, excluded, overridden

**Drift**:
Divergence in a managed file that has not been declared. What `preflight check` fails on, and the only thing it fails on.
_Avoid_: conformance, compliance, non-compliance — these imply a broader property than Preflight asserts, and they invite the question of whether presets are wired or CI is present. Preflight does not check either. Say *drift*.

**Unrecorded**:
A managed file that matches what Preflight ships but has no entry in `preflight-lock.json`. Nothing has diverged, so it is not drift and does not fail `preflight check` — but nothing recorded the agreement either, so the check reports it. A file with no lock entry that does _not_ match is drift.
_Avoid_: untracked, unsynced — the first is git's word for something else, and the second suggests `preflight sync` was never run, which is only one of the ways this happens.

**Dead config**:
A configuration file whose tool is not installed, or is installed but invoked by nothing. It is byte-identical everywhere it appears, which reads as consensus and is inertia. Dead config cannot drift, so its stability is not evidence of anything.
_Avoid_: orphaned config, legacy config
