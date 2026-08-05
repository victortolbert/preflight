# Shipped template content is provisional

> **Superseded.** The templates were extracted from the consuming repos and are now byte-identical to both. The reasoning is kept because the conclusion it reached was wrong in an instructive way — see the Resolution at the end.

The two managed files in `templates/` ship content that was **not extracted from the consuming repos**, because those repos are private and their versions have not been brought into this public one. `preflight sync` writes real bytes into a project, so unlike a preset these files could not be left empty — an empty file is itself a configuration. The content was chosen rather than measured.

- `.nvmrc` is `24`. Well founded: SPEC §10 item 10 records both consuming repos hardcoding `node-version: 24` in CI, and `package.json` sets a `>=24` engine floor.
- `axe-linter.yml` enables the WCAG 2.1 Level AA tag set. **This is an invention.** It is a defensible default, and nothing more than that.

## Consequences

**SPEC §2's headline dividend does not yet hold for `axe-linter.yml`.** That section claims adoption is "effectively a **no-op** for the existing repos" because the files were confirmed byte-identical across both consumers. Run against a real consumer today, `preflight sync` will render an `update` diff over their actual file.

**It also brushes against a v2 deferral.** SPEC §10 item 1 is "The accessibility gap — the consuming repos disagree substantially on accessibility lint enforcement", deferred on the principle *ship the agreement, defer the disputes*. `axe-linter.yml` sits among the agreed files, so shipping it is in scope; shipping a *chosen* rule set edges toward adjudicating the deferred dispute.

**What settles it.** Extract the real `axe-linter.yml` from a consuming repo and replace the template with it verbatim.

## Surface added beyond SPEC §5

SPEC §5 lists two bare commands and no flags, and SPEC §6 records a rejected `sync --accept`, so flags on `sync` are a deliberated surface rather than an open one. `preflight sync` takes one: `--yes`, which skips the confirmation prompt.

It is what makes the command usable without a terminal, and integration tests drive the real binary, so something had to fill that role. It does not weaken SPEC §5's rejection of automatic sync on install: that was rejected because an install hook rewrites tracked files with nobody having asked for it, whereas `--yes` has to be typed. Without a TTY and without `--yes`, `sync` refuses and writes nothing rather than assuming consent.

## Resolution

Both files were extracted. Both templates are now byte-identical to both consuming repos, and `preflight sync` run against each reports "Managed files are up to date."

**Both invented values were wrong, and one of them was wrong in the direction this ADR did not consider.**

`axe-linter.yml` was expected to be wrong, and was: the real file disables one rule (`empty-heading`) and carries no `tags` key at all. The invented WCAG 2.1 AA tag set was not a subset or a superset of the real policy — it was unrelated to it.

`.nvmrc` is the instructive one. This ADR called it "well founded" and moved on. The real file is `v24`, not `24`. Both are valid, the difference is one byte, and it would have made `preflight sync` rewrite the file in both repos — turning the *one* template this ADR was confident about into a diff, on Preflight's first contact with the repos it exists to serve. The confidence was the problem: `24` was inferred from a CI workflow that hardcodes `node-version: 24`, which is a different file, written by a different hand, in a different syntax.

The `--yes` section above stands unchanged.
