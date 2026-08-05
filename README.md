# Preflight

The setup and safeguards a project should have **before** feature development begins — linting, type checking, tests, git hooks, commit conventions, dependency maintenance, CI, accessibility checks, and agent-facing project guidance — packaged so that projects share one source of truth instead of drifting copies.

> **Status: built, not yet published.**
> The preset, both commands, and the drift check are implemented and tested end to end from a packed install, against the real configuration of the projects Preflight was extracted from. There is no published package yet.

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

Three files, chosen on the principle **ship the agreement, defer the disputes**. v1 centralizes only what the consuming projects already agree on — not because those files are the most valuable, but because they are consensus with nothing preserving it, which makes them what drifts next.

Two more were cut for the same reason the dead files above are interesting: they configured tools that nothing installed or nothing ran. The check that catches that is the whole point, so they would have been poor things to ship.

Everything genuinely contested — lint rules the projects have settled in opposite directions — is deferred, so the mechanism can earn trust before it is used to settle arguments.

See [`SPEC.md`](./SPEC.md) for the full specification, the rejected alternatives and why, the residual risks, and the v2 backlog.

## What is actually in it

| File | Mechanism | What it carries |
|---|---|---|
| `taze.config.ts` | preset | `exclude: ['@fortawesome/*']` |
| `.nvmrc` | CLI-written | `v24` |
| `axe-linter.yml` | CLI-written | `rules: { empty-heading: false }` |

Every one of these was extracted from the consuming projects rather than chosen, and both CLI-written templates are byte-identical to what those projects already have. `preflight sync` run against either of them writes nothing and reports "Managed files are up to date" — the no-op adoption above, demonstrated rather than argued.

**A fourth file was cut during implementation.** `skills-npm.config.ts` looked like shared policy: byte-identical across both projects, and carrying two settings that differ from the tool's own defaults. Reading it settled the matter — it is the tool's README example verbatim, every line of it, with eight lines of placeholder examples deleted. The two "settings" are the README's values. Nothing in either project runs the tool.

That is the third file cut from this scope on the same test, and the second one cut for looking like consensus when it was inertia. It is also the one that got furthest before anyone opened it: it survived a specification, a ticket, and an architecture decision record, all of which described the file rather than reading it. Preflight exists because configuration drifts when nobody looks; the same habit is what nearly shipped this.

## License

MIT © 2026 Victor Tolbert
