# `skills.json` dropped from v1 as dead config

`skills.json` was cut, taking v1 from five files to four. It is owned by `skillman`, which appears in neither consuming repo's `package.json` nor either lockfile. The two skills tools that *are* installed — `skilld` and `skills-npm` — contain zero references to the file; this was checked by unpacking all three published tarballs and grepping them, not inferred from their descriptions. SPEC §7 already excluded commit-lint and style-lint config on exactly this test; applying it consistently reaches `skills.json` too.

## Consequences

SPEC §2's claim that every shipped file "configures a tool that is actually installed and running" is now true by measurement rather than by assertion. Keeping the file would have meant Preflight's first act was distributing an orphaned config — the precise failure SPEC §8 documents and the tool exists to detect.

v1 is now four files, two CLI-written. This is its third shrink, all three on evidence.

Reviving a skills manifest tool moves to the v2 backlog, next to "revive commit linting" — the same shape of problem, needing a dependency and something that runs it rather than just a config file.

**A neighbouring finding, deliberately not acted on the same way.** `skills-npm` is genuinely installed in both repos, but no script, CI step, or git hook invokes it, and its config file is the tool's own README boilerplate — the placeholder `@some/package` listed under both `include` and `exclude`. It fails one of SPEC §8's three death criteria but not the others, so the preset ships with those two placeholder keys stripped and the real settings kept. If it later turns out nothing runs `skills-npm` either, this ADR is the precedent for cutting it.

## Addendum — what the preset actually shipped

The `skills-npm` preset shipped carrying **no settings at all**, which is less than "the real settings kept" above describes. The consuming repos' values have not been extracted into this public repo, and SPEC §2 takes only what those repos already agree on, so there was nothing measured to keep. The subpath, its build entry, and its type are real; the policy behind them is not there yet.

Recorded here rather than left as a silent override, and it sharpens the question this ADR already asks. Two of the eight keys in the README example — `include` and `exclude` — hold placeholders. Four more (`recursive`, `gitignore`, `yes`, `dryRun`) are set to the values `CommandOptions` documents as its own defaults, so they configure nothing wherever they appear. That leaves `source` and `agents` as the only keys that could carry a real choice. If extraction shows the consuming configuration is those six inert keys and nothing else, then the file is boilerplate end to end, and cutting the preset becomes the same call this ADR made about `skills.json`.

SPEC §2's caveat and the paragraph above both still describe a preset with settings in it. Neither has been amended, because that is a scope decision rather than an implementation one.
