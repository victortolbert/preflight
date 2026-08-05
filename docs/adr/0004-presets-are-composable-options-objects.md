# Presets are composable options objects

A preset exports a typed options object that consumers import and spread, not a finished `defineConfig()` result they can only re-export whole. This also corrects a factual error in earlier drafts: they described preset consumption as `extends: [...]`, but neither `taze` nor `skills-npm` has an `extends` key. Both take a plain options object, so the real mechanism is import-and-compose.

## Considered Options

- **A finished `defineConfig()` result, re-export only** — maximally inert and closest to SPEC §4's original "presets cannot drift" claim. Rejected because the only way to diverge from it is to abandon the preset outright, which is residual risk #2 arriving one level deeper and just as undetectable.
- **A factory function taking overrides** — most controlled, and makes divergence visible at the call site. Rejected as a third invention, which is what SPEC §4 chose its two mechanisms specifically to avoid.

## Consequences

SPEC §4's "presets cannot drift" is softened to "low drift surface, not zero." A consumer can override a spread key and nothing reports it. That is the same class of gap as residual risk #2, and it is accepted for the same reason: SPEC §6 argues that a mechanism unable to express legitimate divergence will be worked around. The CLI-written files get `unmanaged` as their escape hatch; presets get composition as theirs.

`README.md`'s `extends` example is corrected. It was published on a public repo describing an API that does not exist.
