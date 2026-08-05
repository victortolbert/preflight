# `skills.json` dropped from v1 as dead config

`skills.json` was cut, taking v1 from five files to four. It is owned by `skillman`, which appears in neither consuming repo's `package.json` nor either lockfile. The two skills tools that *are* installed — `skilld` and `skills-npm` — contain zero references to the file; this was checked by unpacking all three published tarballs and grepping them, not inferred from their descriptions. SPEC §7 already excluded commit-lint and style-lint config on exactly this test; applying it consistently reaches `skills.json` too.

## Consequences

SPEC §2's claim that every shipped file "configures a tool that is actually installed and running" is now true by measurement rather than by assertion. Keeping the file would have meant Preflight's first act was distributing an orphaned config — the precise failure SPEC §8 documents and the tool exists to detect.

v1 is now four files, two CLI-written. This is its third shrink, all three on evidence.

Reviving a skills manifest tool moves to the v2 backlog, next to "revive commit linting" — the same shape of problem, needing a dependency and something that runs it rather than just a config file.

**A neighbouring finding, deliberately not acted on the same way.** `skills-npm` is genuinely installed in both repos, but no script, CI step, or git hook invokes it, and its config file is the tool's own README boilerplate — the placeholder `@some/package` listed under both `include` and `exclude`. It fails one of SPEC §8's three death criteria but not the others, so the preset ships with those two placeholder keys stripped and the real settings kept. If it later turns out nothing runs `skills-npm` either, this ADR is the precedent for cutting it.

## Addendum — the `skills-npm` preset was cut too

The paragraph above set a test and named its consequence: *if extraction shows the consuming configuration is inert keys and nothing else, the file is boilerplate end to end, and cutting the preset becomes the same call this ADR made about `skills.json`.* Extraction was done. It is.

The consuming `skills-npm.config.ts` is the tool's published README example **verbatim** — every line of it appears in the README, and the only edits are eight deleted lines of wildcard placeholder examples. Both consuming repos carry it byte-identically, which had read as consensus.

That resolves the two keys this ADR could not rule on. `source: 'package.json'` and `agents: ['cursor', 'windsurf']` were the candidates for real policy, on the reasoning that they differ from the tool's documented defaults. They are the README's own values. Nobody chose them; they arrived with the copy.

So the file fails the test on every count now available: the tool is invoked by no script, CI step, or git hook in either repo, and the configuration was never written, only pasted. The preset, its subpath, its build entry, and the `skills-npm` peer dependency are all removed. v1 ships three files.

**What this cost, and what it is worth.** The claim that `source` and `agents` were real settings survived a specification, a ticket, and this ADR's own addendum, and it was wrong the whole time — because every one of those described the file instead of opening it. That is the same failure SPEC §8 documents in the audit it came from, arriving one level up. The general lesson is cheap to state and evidently hard to apply: read the file.
