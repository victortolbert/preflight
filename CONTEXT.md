# Preflight

The foundational project-setup layer — the safeguards a project should have before feature work begins — distributed as an installed package rather than copied by a scaffold.

## Language

**Preset**:
Configuration consumed by reference through a subpath export, as a typed options object the consumer imports and composes. Its policy lives in the package.
_Avoid_: extends, extended config — neither peer dependency has an `extends` key, and the word implies a mechanism that does not exist here.

**Managed file**:
A file the CLI writes into a consuming repo and tracks by hash in `preflight-lock.json`. Distinct from a preset, which is never written into the consumer.
_Avoid_: generated file, synced file

**Unmanaged**:
A managed file a consumer has explicitly opted out of, declared in `preflight.config.ts`. A recorded, reviewable decision — the legitimate counterpart to drift.
_Avoid_: ignored, excluded, overridden

**Drift**:
Divergence in a managed file that has not been declared. What `preflight check` fails on, and the only thing it fails on.
_Avoid_: conformance, compliance, non-compliance — these imply a broader property than Preflight asserts, and they invite the question of whether presets are wired or CI is present. Preflight does not check either. Say *drift*.

**Dead config**:
A configuration file whose tool is not installed, or is installed but invoked by nothing. It is byte-identical everywhere it appears, which reads as consensus and is inertia. Dead config cannot drift, so its stability is not evidence of anything.
_Avoid_: orphaned config, legacy config
