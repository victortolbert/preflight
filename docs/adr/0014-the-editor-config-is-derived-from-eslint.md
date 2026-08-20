# The editor config is derived from eslint, and `.vscode/` cannot ship at all

SPEC §10.7 reads: *"Editor config — needs **writing**, not extracting."* Both halves are worth testing, and they come apart. The `.editorconfig` claim is correct and has held for six months. The *scope* is wrong: "editor config" in these repos is not `.editorconfig`, it is `.vscode/`, which the entry never considered — and which turns out to be 99.6% identical across the two repos and almost entirely unshippable.

What ships is a four-key `.editorconfig`, **derived** rather than written: the agreement it encodes already exists, in `eslint.config.mjs`.

This is the seventh backlog item measured, and the first to cost a **breaking release**.

## The measurement

### `.editorconfig` is empty, as the entry says

0 bytes in both repos, and 0 bytes at every commit across its visible history. SPEC §203's v1 audit — *"one — the editor config — 0 bytes in both"* — still holds. Nothing in either repo reads it either: neither has an `editorconfig` dependency. So this is new enforcement, not extraction from the file.

### But `.vscode/` is nearly identical, and the entry never looked

| File | the application repo | the template | |
|---|---|---|---|
| `.editorconfig` | 0 B | 0 B | empty in both |
| `.vscode/extensions.json` | 698 B | 698 B | **byte-identical** |
| `.vscode/launch.json` | 290 B | 290 B | **byte-identical** |
| `.vscode/mcp.json` | 955 B | 955 B | **byte-identical** |
| `.vscode/settings.json` | 2,664 B | 2,698 B | differs by **one line** |

~4.6 KB, one line apart. On the "byte-identical means shared policy" reading used for the v1 files, nearly all of this qualifies. **Almost none of it should ship**, and the reasons are individually mundane and collectively a pattern:

- **`launch.json` is a Python `debugpy` configuration** — `"Python: Current File (uv)"` — carried byte-identically in two Nuxt/TypeScript repos that contain no Python.
- **`extensions.json` recommends tools neither repo installs**: a linter/formatter whose own inline comment describes it as an alternative to the linter both repos actually run, and a PostCSS extension where neither repo depends on PostCSS.
- **`prettier` is a dead dependency in both** — installed, no config file, no script, and `settings.json` sets `prettier.enable: false` alongside `editor.formatOnSave: false`. Installed and invoked by nothing, which is `CONTEXT.md`'s definition.
- **`mcp.json` carried a credential.** Committed in both repos, byte-identical, pushed to both remotes. It has since been rotated, and the vendor's endpoint turns out to require no key at all — an unauthenticated request returns the full tool list. See the `.gitignore` note added in #30; this repo was never affected, tracking no `.vscode/` at all.

**These files are inherited, not authored** — the same provenance [ADR-0013](./0013-markdownlint-ships-seven-rules-as-json-via-extends.md) established for `.markdownlint.json`. That ADR's caution was that a shared entry can be a common ancestor rather than a decision. Here the same inheritance carried a Python debug profile, two recommendations for uninstalled tools, an unused formatter, and a credential into two repos that needed none of them.

### `.vscode/settings.json` cannot ship even where it is genuinely shared

The one part that *is* real policy — `eslint.rules.customizations` silencing stylistic rules in-editor while keeping autofix, and `eslint.validate` across 21 languages — corresponds to a tool both repos run, and is byte-identical. It still cannot ship:

1. **VS Code settings have no composition mechanism.** No `extends`, no import. This is markdownlint's problem ([ADR-0013](./0013-markdownlint-ships-seven-rules-as-json-via-extends.md)) without markdownlint's escape hatch — there is no reference form to fall back to.
2. **A managed file owns the whole file.** The repos' settings carry genuinely local keys — differing i18n locale paths, one repo's vendored editor paths, and the one-line divergence between them. Managing it would clobber those, and the `unmanaged` opt-out is all-or-nothing, so a consumer needing one local key loses the whole file.

So the shared part stays unshared, and that is a limitation of the mechanism rather than a decision about the content.

## `.editorconfig` is derived, not written

The entry says this needs writing. Measuring says it can be **extracted after all** — from a different file. Both repos' computed eslint config is byte-identical on every rule an `.editorconfig` would encode:

| eslint rule (identical in both) | `.editorconfig` key |
|---|---|
| `style/indent: ["error", 2, …]` | `indent_style = space`, `indent_size = 2` |
| `style/eol-last: ["error", "always"]` | `insert_final_newline = true` |
| `style/no-trailing-spaces` (`skipBlankLines: false`) | `trim_trailing_whitespace = true` |
| `style/linebreak-style` — **set in neither** | `end_of_line` — **omitted** |

That last row is [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md)'s rule applied to a managed file: silence is not agreement. `charset` is omitted for the same reason — no rule in either repo speaks to it.

**Two objections, both checked rather than argued:**

- **`trim_trailing_whitespace` breaks Markdown hard line breaks.** True in general, and not here: **zero MD009 violations** across both repos' authored Markdown under stock defaults, so the two-trailing-spaces convention is not in use.
- **`indent_style = space` conflicts with existing tabs.** 101 files in one repo and 95 in the other contain leading tabs — **all of them `.md`, and all under vendored directories** (`.claude/`, `public/`). Zero in `.ts`, `.vue` or `.json`, which is what eslint already guarantees.

`root = true` is the one key with no eslint counterpart. It is structural rather than stylistic: without it, editorconfig keeps walking up past the project, so a stray `~/.editorconfig` would change what a contributor's editor does. A managed file whose effect depends on where it was checked out is not managed.

## Considered Options

- **Ship `.vscode/settings.json` as a managed file.** Rejected on the two mechanism problems above — it would clobber local keys, with no partial opt-out.
- **Ship the whole of `.vscode/` since it is byte-identical.** Rejected: byte-identity is what the v1 audit used, and this directory is the counter-example that shows why it is not sufficient on its own. Three of its four files are wrong in ways identical copies conceal.
- **Write an `.editorconfig` from convention** — the usual six keys, `end_of_line = lf` and `charset = utf-8` included. Rejected: two of those have no basis in anything either repo enforces, and this project's failures have all been config nobody checked against the thing it described.
- **Ship nothing, since `.editorconfig` is empty in both and there is no agreement to extract.** Rejected because the agreement exists — it is in `eslint.config.mjs`, held byte-identically, and the empty `.editorconfig` is the absence of a file rather than a decision against one.

## Consequences

**This is the first breaking release.** [ADR-0010](./0010-the-version-contract.md) names adding a managed file as breaking — it lands as drift in a repo that chose nothing — so this is `0.4.0`, and both consumers must move their caret ranges by hand. That ADR predicted this exact item by name: *"v2 backlog items that would add one (editor config, SPEC §10.7) carry a version cost that additive-looking work usually does not."* The prediction was correct and the price is being paid as described.

**A gap in the version contract is closed on the way.** ADR-0010 names adding a managed file as one of its three breaking changes, and until now **nothing pinned the list** — the most expensive change in the contract was the one change no test could see. `test/stability.test.ts` now asserts `MANAGED_FILES` as a literal, the same way it asserts the exports map.

**Adoption is not a no-op, for the third preset running.** Neither repo has anything reading `.editorconfig` today, so this begins enforcing what eslint already enforces — earlier, in the editor, before the linter runs. The v1 files changed nothing observable on adoption; nothing shipped since §10.4 has had that property.

**`.vscode/` remains unshared and worth revisiting.** The eslint block in `settings.json` is real agreement with no mechanism to carry it. If VS Code ever gains settings composition, or if a `.vscode/settings.json` fragment can be generated rather than owned, this becomes shippable — and the three defects found here (a Python launch profile, two recommendations for uninstalled tools, an unused formatter dependency) are the consumers' to clean up regardless.

**What would change the answer.** Either repo adopting a formatter that disagrees with eslint's stylistic rules, which would break the derivation this file depends on. A consumer on Windows, which would make `end_of_line` a question worth answering rather than one nobody has asked. Or a second consumer whose eslint config differs, which would test whether these four keys describe the pair or describe the package.

## Addendum, 2026-08-17 — a third repo answers what this ADR read as silence

Surveying candidates for SPEC §11's migration item ([ADR-0016](./0016-migration-needs-no-new-cli-surface.md)) put a third `.editorconfig` in front of this reasoning for the first time. The surveyed candidate — active, pnpm, eslint, commitlint, Nuxt, structurally indistinguishable from the two repos measured above — carries a 188-byte file that sets:

```ini
charset = utf-8
end_of_line = lf

[*.md]
trim_trailing_whitespace = false
```

All three are things this ADR concluded there was no evidence for. `charset` and `end_of_line` were omitted because *"`style/linebreak-style` is set in neither repo, so there is no measured agreement to encode."* That held for the sample; it was not a fact about the portfolio. And the `[*.md]` block is the Markdown objection this ADR raised and dismissed, taken seriously by someone else.

**The shipped file does not change, and the reason is that measuring the objection made it weaker, not stronger.** Of that repo's 428 tracked Markdown files, **4** contain trailing-double-space hard breaks — and all four are vendored agent-skill docs under `.claude/` and `.agents/` (two files, mirrored). Its *authored* prose uses none, which is the same result this ADR got for the two consumers. So `[*.md] trim_trailing_whitespace = false` there protects third-party content the repo does not write, and shipping a block on that evidence would be closer to [ADR-0003](./0003-drop-skills-json-as-dead-config.md)'s dead config than to a measured need. The setting is at least as likely to be carried boilerplate as an authored position — [ADR-0013](./0013-markdownlint-ships-seven-rules-as-json-via-extends.md)'s carried-and-edited finding, arriving in a third file type.

Two things are worth carrying anyway.

**The residual hazard is real and small.** `.editorconfig` drives editors, so a maintainer opening one of those vendored files and saving it would strip the hard breaks and produce a diff in content they do not own. Adopting Preflight's `.editorconfig` there does that. It is a nuisance, not a correctness problem, and `unmanaged` covers it if that repo would rather keep its own.

**The methodological point outlives the file.** This ADR's omissions were argued from *"neither repo sets it,"* citing [ADR-0009](./0009-the-accessibility-gap-is-three-rules.md) on reading silence as consensus. Widening the sample by one repo turned two of those silences into stated positions. The conclusion survives; the confidence should not. **Two repos cannot distinguish "nobody needs this" from "these two happen not to."**
