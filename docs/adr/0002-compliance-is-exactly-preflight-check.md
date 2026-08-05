# "Preflight-compliant" means exactly what `preflight check` asserts

SPEC §11 left open "what 'this repo is Preflight-compliant' should assert." The answer is: nothing beyond drift in a managed, non-opted-out file. There is no separate compliance concept, no additional assertion, and no new vocabulary — `preflight check` is the whole of it. The words *conformance* and *compliance* are removed from the project's language (see `CONTEXT.md`) precisely because they keep implying otherwise.

## Considered Options

- **Also fail on unwired presets** — would close residual risk #2, but costs SPEC §2's no-op adoption dividend: neither consuming repo imports a Preflight preset today, so a check demanding it would fail both repos the moment they installed.
- **Fail narrow, report wide** — exit code keyed to drift alone, with a non-failing coverage summary of presets, peer dependencies, and opt-outs. Rejected as v1 scope, not as a bad idea.

## Consequences

Residual risks #1 (a deletable CI step), #2 (undetectable preset abandonment), and #3 (`preflight.config.ts` is unmanaged by construction) remain accepted and route to v2 exactly as SPEC §9 records. This ADR does not reopen them; it declines to close them early.

`preflight check` is an honesty aid, not a control. That is a deliberate property of v1, whose job is to earn trust in a new dependency — not to be unbypassable.
