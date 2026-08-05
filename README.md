# Preflight

The setup and safeguards a project should have **before** feature development begins — linting, type checking, tests, git hooks, commit conventions, dependency maintenance, CI, accessibility checks, and agent-facing project guidance — packaged so that projects share one source of truth instead of drifting copies.

> **Status: built, not yet published.**
> Both presets, both commands, and the drift check are implemented and tested end to end from a packed install. There is no published package yet.
>
> What v1 ships is the *mechanism*. Most of the policy it carries is still a placeholder — see [What is actually in it](#what-is-actually-in-it).

## The problem

Most "starter template" approaches are copy-once: you scaffold a project, and from that moment the template and the project diverge with nothing able to detect it.

That failure was measured rather than assumed. Auditing two closely-related projects that began from a shared template found:

- **18 of 33** shared configuration files had drifted
- drift ran in **both** directions — the template had begun importing from its own consumer, so neither was authoritative
- two config files were configuring tools **that were no longer installed at all**

The last one is the interesting failure. Those files were byte-identical across every repo, which looks like consensus and is actually just inertia. Dead config cannot drift.

## The approach

Preflight is an **installed dependency**, not a scaffold — the only arrangement in which a fix can reach a project that adopted it a year ago.

It uses two mechanisms, split along a simple rule: **if a tool has a native composition point, ship a preset; otherwise write the file and track it.**

```ts
// consumed by reference — policy lives in the package
export { default } from '@victortolbert/preflight/taze'
```

```bash
# written into the repo, hashed in preflight-lock.json
preflight sync     # write managed files, diff first
preflight check    # fail CI on unexplained drift
```

`preflight check` is the enforcement point, and CI is the only gate that sees every change. v1 does not ship a workflow — you add the step:

```yaml
- name: Check for config drift
  run: pnpm exec preflight check
```

Divergence is often legitimate — database config *should* differ per project — so it is declared rather than detected:

```ts
import { definePreflightConfig } from '@victortolbert/preflight'

export default definePreflightConfig({
  unmanaged: ['.nvmrc'],
})
```

That turns divergence into a reviewable decision instead of an accident.

## Scope of v1

Four files, chosen on the principle **ship the agreement, defer the disputes**. v1 centralizes only what the consuming projects already agree on — not because those files are the most valuable, but because they are consensus with nothing preserving it, which makes them what drifts next.

A fifth was cut during implementation planning, for the same reason the two dead files above are interesting: it configured a tool that no project had installed. The check that catches that is the whole point, so it would have been a poor thing to ship.

Everything genuinely contested — lint rules the projects have settled in opposite directions — is deferred, so the mechanism can earn trust before it is used to settle arguments.

See [`SPEC.md`](./SPEC.md) for the full specification, the rejected alternatives and why, the residual risks, and the v2 backlog.

## What is actually in it

The four files are configured through two mechanisms, and both mechanisms work. Their *contents* are another matter, and this table is the honest version:

| File | Mechanism | What it currently carries |
|---|---|---|
| `taze.config.ts` | preset | Nothing — an empty, typed options object |
| `skills-npm.config.ts` | preset | Nothing — an empty, typed options object |
| `.nvmrc` | CLI-written | `24`, which is real policy |
| `axe-linter.yml` | CLI-written | A chosen WCAG 2.1 AA rule set, not an extracted one |

The reason is the same in every row: this is a public repository, the configuration it centralizes lives in private ones, and none of it has been extracted here yet. Shipping invented defaults would make Preflight's first act the thing it exists to prevent — distributing configuration nobody measured. So the presets ship empty rather than plausible.

One consequence is worth stating plainly, because it contradicts a claim made above. Adoption is described as effectively a no-op for the existing repos, on the evidence that all four files were byte-identical across them. That holds for `.nvmrc`. It does not yet hold for `axe-linter.yml`, where `preflight sync` would currently write a chosen policy over a real one. [ADR-0005](./docs/adr/0005-shipped-template-content-is-provisional.md) records what would settle it.

## License

MIT © 2026 Victor Tolbert
