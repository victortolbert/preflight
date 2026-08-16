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

**Consumer**:
A repo Preflight is measured against and adopted by. They are Preflight's *evidence*, not its scope: a §10 backlog item closes when measuring them says what it says, and their own product work, releases and incidents are theirs and do not belong on Preflight's backlog.
_Avoid_: downstream, dependent — both imply Preflight's changes reach them on Preflight's schedule. Adoption is the consumer's decision and has lagged a release by days more than once.

**Validation consumer**:
The single repo Preflight is currently measured against — **`nuxt-kickstart`**, as of 2026-08-16. `uxlab` remains a consumer and is no longer a validation target: it carries concurrent agent sessions, and Preflight work branching in it collided with them. How it consumes is a question deferred, not answered.
_Why it matters more than a scheduling note_: SPEC §2 is "ship the agreement, defer the disputes," and every ADR from [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md) onward measured agreement *between two repos*. With one, there is no agreement to measure — a finding is "what `nuxt-kickstart` does," which is [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md)'s own caution that the sample cannot distinguish "describes this repo" from "describes the package." Say so in the finding rather than assuming it away.
_Avoid_: "the consumers" as a plural standing in for measurement — it was accurate through §10 and is not now.

**Dead config**:
A configuration file whose tool is not installed, or is installed but invoked by nothing. It is byte-identical everywhere it appears, which reads as consensus and is inertia. Dead config cannot drift, so its stability is not evidence of anything.
_Avoid_: orphaned config, legacy config
