# A managed file must name what reads it

`axe-linter.yml` fails this project's own test for dead config, and has since v1. [ADR-0003](./0003-drop-skills-json-as-dead-config.md) cut `skills.json` on that test and then cut the `skills-npm` preset on it as well. A third managed file fails it and ships anyway, and until now no document said why.

The test is not being weakened. What was missing is a duty on Preflight's side, which this ADR states: **a managed file is admitted only if Preflight can name what reads it**, and where that reader lives outside the repo, Preflight documents it.

## The measurement

[`CONTEXT.md`](../../CONTEXT.md) defines dead config as "a configuration file whose tool is not installed, or is installed but invoked by nothing." Checked across all three consuming repos rather than inferred:

| | `nuxt-kickstart` | `uxlab` | `ams-cloud-eds` |
|---|---|---|---|
| `axe-linter.yml` present | yes | yes | yes (synced) |
| tool in `package.json` | no | no | no |
| invoked by a workflow | no | no | no |
| `.vscode/extensions.json` recommends it | yes | yes | **no, before adoption** |

**The file is not intrinsically editor-bound, which is the first thing that had been assumed rather than checked.** axe Linter ships a [GitHub Action](https://github.com/dequelabs/axe-linter-action), a CI Connector, and the VS Code extension, and `axe-linter.yml` is the configuration for all three. So the file has CI consumers, and no repo here uses any of them. Its only reader in this project is an editor extension.

**A recommendation is not an installation.** `deque-systems.vscode-axe-linter` in `.vscode/extensions.json` prompts a developer; whether they accepted is per-person and leaves no trace in the repo. The extraction pair both carry the recommendation, which is why the file never looked dead there — but "looked" is doing the work. Under the definition as written, `axe-linter.yml` is dead in the two repos it was extracted from, not merely in the third.

**The third repo is what surfaced it.** `ams-cloud-eds` had no `.vscode/extensions.json` at all, so `preflight sync` wrote a configuration file nothing in that repo could read — ADR-0003's exact case, manufactured by Preflight. It was resolved there by adding the recommendation, with a comment naming the dependency by hand:

```jsonc
// Reads axe-linter.yml, which Preflight manages. Without this extension
"deque-systems.vscode-axe-linter" // axe Accessibility Linter
```

That comment is this ADR's best evidence. An adopter, given no guidance, independently wrote down the precondition Preflight owed them — which is the strongest available argument that stating it is the usable remedy rather than a formality.

## Why this is a duty rather than an exception

The gap is not that `axe-linter.yml` is unusual. It is that Preflight had no criterion requiring anyone to *ask* what reads a file before shipping it, and so nobody did — the same failure [SPEC §10](../../SPEC.md) documents eight times over, where every backlog entry described a file and every entry was written by someone who had not opened it.

Stating the rule broadly rather than narrowly is deliberate. Narrowly — "`axe-linter.yml` gets a documented consumer" — the ADR is an apology for one file and cannot recognise the second instance. Broadly, it is a criterion applied at admission, alongside the death test rather than instead of it. It costs nothing today: three managed files, one of which prompted it.

**Applying the rule immediately found a second instance, which is the argument for stating it broadly.** The claim drafted here first was that `.nvmrc` and `.editorconfig` do not have this shape and the class has one member. Checking rather than asserting:

- **`.nvmrc` is live and verifiably so.** `actions/setup-node` reads it via `node-version-file: .nvmrc` in `nuxt-kickstart`, `ams-cloud-eds`, and this repo's own `ci.yml` and `release.yml`. Its reader is in the repo, in CI, on every run.
- **`.editorconfig` is not.** No repo has an `editorconfig` dependency, VS Code has no built-in EditorConfig support — it requires the `EditorConfig.EditorConfig` extension — and **no repo's `.vscode/extensions.json` recommends it.** That is strictly weaker than `axe-linter.yml`, which at least has its recommendation in two of three repos.

So the class has two members, and the second is the file [ADR-0014](./0014-the-editor-config-is-derived-from-eslint.md) shipped as this package's first breaking release. One mitigation is real and belongs on the record: ADR-0014 derived every `.editorconfig` key from an eslint rule both repos already enforce, so the *policy* is live even where the *file* is unread. `axe-linter.yml` has no such backstop — nothing enforces `empty-heading` if the extension is absent.

That distinction is worth keeping, but it is not the one the death test makes. Both files are read by an editor extension whose presence the repo cannot confirm, and both are now covered by the same duty.

## Considered Options

- **Cut `axe-linter.yml`**, consistent with ADR-0003. Rejected as disproportionate: removing a managed file is a major bump, and the file does real work for a developer who has the extension. That the benefit is unverifiable from the repo is the problem this ADR fixes, not a reason to destroy the benefit.
- **Make it live** by shipping the `dequelabs/axe-linter-action` step. Rejected twice over: [ADR-0006](./0006-ci-workflows-are-not-yet-shareable.md) holds that workflow files are not shareable here, and the action requires a paid Deque API key, so adoption would acquire a procurement dependency.
- **Add a third category** — "editor-time" config, neither live nor dead. Rejected: it immediately raises "what else is editor-time?" with no second instance to answer it, and it carves a hole in the death test rather than leaving it intact.
- **Have `preflight check` verify the consumer is present.** Rejected on [ADR-0016](./0016-migration-needs-no-new-cli-surface.md)'s reasoning: inventing CLI surface to satisfy a gate. One file, one instance, and the check would have to encode per-file knowledge the CLI has no other reason to hold.
- **State the precondition and document it** — chosen.

## Consequences

`README.md` states what reads `axe-linter.yml`, in the managed-files table where an adopter decides, rather than in `preflight sync` output they see once. `CONTEXT.md`'s dead-config entry gains a sentence, so the definition does not silently condemn a file the package ships.

The admission criterion applies to every future managed file. It is a documentation duty, not an automated one — Preflight does not and will not check that a consumer is present.

**This does not make `axe-linter.yml` live.** It remains a file whose tool is invoked by nothing in any repo, and if a fourth adopter declines the extension it is dead there. What changes is that the adopter is told, and the asymmetry with ADR-0003 has a stated reason instead of being an oversight nobody had noticed.

**What would change the answer.** A repo adopting Preflight, being told the precondition, and declining it — that would be the first evidence that the file is unwanted rather than merely unverified, and cutting it would then be a v2 question with something behind it. Alternatively, any repo here adopting the axe Linter action or Connector would make the file live on the death test's own terms and retire this ADR's problem entirely.
