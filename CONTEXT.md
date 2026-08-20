# Preflight

The foundational project-setup layer — the safeguards a project should have before feature work begins — distributed as an installed package rather than copied by a scaffold.

## Language

**Preset**:
Configuration consumed by reference through a subpath export, via whatever native composition point the tool provides. Its policy lives in the package. The composition point differs by tool and is not part of the term: `taze` takes a typed options object the consumer spreads, while commitlint is named in the consumer's `extends`, because a commitlint config carries references that only resolve where it lives.
*Avoid*: extended config — and do not assume the composition point. Saying a preset is "extended" implies every tool has an `extends` key; neither `taze` nor `skills-npm` does. Name the tool's own mechanism.

**Managed file**:
A file the CLI writes into a consuming repo and tracks by hash in `preflight-lock.json`. Distinct from a preset, which is never written into the consumer.
*Avoid*: generated file, synced file

**Unmanaged**:
A managed file a consumer has explicitly opted out of, declared in `preflight.config.ts`. A recorded, reviewable decision — the legitimate counterpart to drift.
*Avoid*: ignored, excluded, overridden

**Drift**:
Divergence in a managed file that has not been declared. What `preflight check` fails on, and the only thing it fails on.
*Avoid*: conformance, compliance, non-compliance — these imply a broader property than Preflight asserts, and they invite the question of whether presets are wired or CI is present. Preflight does not check either. Say *drift*.

**Unrecorded**:
A managed file that matches what Preflight ships but has no entry in `preflight-lock.json`. Nothing has diverged, so it is not drift and does not fail `preflight check` — but nothing recorded the agreement either, so the check reports it. A file with no lock entry that does *not* match is drift.
*Avoid*: untracked, unsynced — the first is git's word for something else, and the second suggests `preflight sync` was never run, which is only one of the ways this happens.

**Consumer**:
A repo Preflight is measured against and adopted by. They are Preflight's *evidence*, not its scope: a §10 backlog item closes when measuring them says what it says, and their own product work, releases and incidents are theirs and do not belong on Preflight's backlog.
*Avoid*: downstream, dependent — both imply Preflight's changes reach them on Preflight's schedule. Adoption is the consumer's decision and has lagged a release by days more than once.

**Repo roles**:
The consuming repos are referred to by **role**, never by name — **the template**, **the application repo**, **the independent adopter**, and **the surveyed candidate**. Two collective terms go with them, and are the two most used: **the consuming repos** for all of them, and **the extraction pair** for the two Preflight was extracted from. *The consumer*, singular and unqualified, is not a role — say which. The roles carry every argument the names did: what the measurements turn on is the relationship between repos, not their identities. A role must never be bound to a name in a table or an aside; one such binding travels with the reader into every other document. See [`docs/agents/publishing.md`](./docs/agents/publishing.md) and [ADR-0019](./docs/adr/0019-this-repo-represents-its-author-not-an-employer.md).
*Why it matters*: this repo is public and its consumers are not. Naming them exposes work that is not this project's to publish, and the names decode further than they look.

**Validation consumer**:
The repos Preflight is currently measured against — **the template** and **the independent adopter**, as of 2026-08-19. The application repo remains a consumer and is not a validation target: it carries concurrent agent sessions, and Preflight work branching in it collided with them. How it consumes is a question deferred, not answered.
*Why it matters more than a scheduling note*: SPEC §2 is "ship the agreement, defer the disputes," and every ADR from [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md) onward measured agreement *between two repos*. The pair was briefly one, between 2026-08-16 and the independent adopter taking `1.0.0`, and during that window a finding could only be "what the template does."
*What is new about the current pair*: the application repo and the template **share ancestry** — one began from the other — and [ADR-0013](./docs/adr/0013-markdownlint-ships-seven-rules-as-json-via-extends.md) found their byte-identical configs to be inheritance rather than consensus, a caution [ADR-0009](./docs/adr/0009-the-accessibility-gap-is-three-rules.md) and [ADR-0011](./docs/adr/0011-the-eslint-style-dispute-is-two-rules-and-both-stay-local.md) each raised independently. The independent adopter does not descend from the template. So agreement between the current pair can no longer be explained by an inherited file, which is a real gain and one no measurement before 2026-08-19 could claim.
*What has not changed*: it is still not evidence about the package. SPEC §10.3 named the remaining confound while measuring the SHA pins — **"the pins agreeing is evidence about the maintainer, not about the repos."** All of these repos have one maintainer, so shared conventions outlive shared ancestry. What improved is narrow and worth stating exactly: a finding can no longer be a *copied file*; it can still be one person's habit, arrived at twice.
*Two cautions follow.* The pair is now a template and an application, so a finding may describe a *kind* of repo rather than either specific one. And agreement remains weaker evidence than it reads as, until a repo Preflight's maintainer does not own adopts it. Say which in the finding rather than assuming it away.
*Avoid*: "the consumers" as a plural standing in for measurement, and any repository name at all. Name the **role** a finding was measured against — the application repo is a consumer and is not one of the current pair, and that distinction is exactly what the plural loses.

**Dead config**:
A configuration file whose tool is not installed, or is installed but invoked by nothing. It is byte-identical everywhere it appears, which reads as consensus and is inertia. Dead config cannot drift, so its stability is not evidence of anything.
A file whose only reader is an editor extension is dead by this definition too, and `axe-linter.yml` is: a `.vscode/extensions.json` recommendation is not an installation, since acceptance is per-developer and leaves no trace in the repo. It ships anyway, which is why a managed file must name what reads it — see [ADR-0017](./docs/adr/0017-a-managed-file-must-name-what-reads-it.md).
*Avoid*: orphaned config, legacy config
