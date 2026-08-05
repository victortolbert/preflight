# Shipped template content is provisional

The two managed files in `templates/` ship content that was **not extracted from the consuming repos**, because those repos are private and their versions have not been brought into this public one. `preflight sync` writes real bytes into a project, so unlike a preset these files could not be left empty — an empty file is itself a configuration. The content was chosen rather than measured.

- `.nvmrc` is `24`. Well founded: SPEC §10 item 10 records both consuming repos hardcoding `node-version: 24` in CI, and `package.json` sets a `>=24` engine floor.
- `axe-linter.yml` enables the WCAG 2.1 Level AA tag set. **This is an invention.** It is a defensible default, and nothing more than that.

## Consequences

**SPEC §2's headline dividend does not yet hold for `axe-linter.yml`.** That section claims adoption is "effectively a **no-op** for the existing repos" because all four files were confirmed byte-identical across both consumers. Run against a real consumer today, `preflight sync` will render an `update` diff over their actual file. SPEC §2 already carries a "Two honest caveats" list for precisely this class of claim; this is a third, and it is the largest, because the other two concern presets whose effective configuration is unchanged.

**It also brushes against a v2 deferral.** SPEC §10 item 1 is "The accessibility gap — the consuming repos disagree substantially on accessibility lint enforcement", deferred on the principle *ship the agreement, defer the disputes*. `axe-linter.yml` sits among the agreed files, so shipping it is in scope; shipping a *chosen* rule set edges toward adjudicating the deferred dispute. The narrower reading — that the deferral is about eslint accessibility rules, and this file is separate — is the one taken here, and it is worth re-checking against the real file.

**What settles it.** Extract the real `axe-linter.yml` from a consuming repo and replace the template with it verbatim. If the real file turns out to differ between the two consumers, then it was never one of the agreed four and SPEC §2's table needs revising rather than this template.

## Surface added beyond SPEC §5

SPEC §5 lists two bare commands and no flags, and SPEC §6 records a rejected `sync --accept`, so flags on `sync` are a deliberated surface rather than an open one. `preflight sync` takes one: `--yes`, which skips the confirmation prompt.

It is what makes the command usable without a terminal, and integration tests drive the real binary, so something had to fill that role. It does not weaken SPEC §5's rejection of automatic sync on install: that was rejected because an install hook rewrites tracked files with nobody having asked for it, whereas `--yes` has to be typed. Without a TTY and without `--yes`, `sync` refuses and writes nothing rather than assuming consent.
