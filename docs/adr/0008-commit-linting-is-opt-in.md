# Commit linting is opt-in

`@commitlint/cli` is an **optional** peer dependency. A consuming repo that wants commit linting installs it, writes a one-line `commitlint.config.ts`, and adds a `commit-msg` hook; one that does not gets nothing. This is the first Preflight safeguard that is not mandatory, and it sits awkwardly against the README's "the safeguards a project should have before feature work begins" — so the reason needs recording.

## The measurement

Declared as a **required** peer, pnpm 11.20.0 silently installs it. Measured against a package declaring `peerDependencies: { "@commitlint/cli": ">=21" }`, with the peer absent from the consumer:

- `pnpm install` exits 0 and prints **no peer warning at all** — including under `--strict-peer-dependencies`
- `@commitlint/cli` is absent from `node_modules/@commitlint/`, but `node_modules/.bin/commitlint` **is** linked and runs

That is `auto-install-peers`, on by default. So a required peer does not produce a missing-dependency error a consumer would notice and act on. It produces a working commitlint binary in every repo that adopts Preflight, whether or not that repo ever wires a `commit-msg` hook.

**A repo in that state has a tool installed and invoked by nothing** — word for word `CONTEXT.md`'s definition of *dead config*, and the condition [ADR-0003](./0003-drop-skills-json-as-dead-config.md) deleted `skills.json` over. Making commit linting mandatory would manufacture, silently and by default, the failure Preflight was built to detect.

## Considered Options

- **Required peer, matching `taze`.** The obvious precedent, and it does not carry. `taze` is a tool you *invoke* (`pnpm taze`), so an unused install is inert — a convenience sitting idle. commitlint is a *gate*, and its entire value is being wired to a hook. An unwired commitlint is not a dormant convenience; it is the dead-config state.
- **Required peer plus an assertion in `preflight check`** that the hook exists. Foreclosed by [ADR-0002](./0002-compliance-is-exactly-preflight-check.md): compliance is exactly `preflight check`, which fails on drift in a managed, non-opted-out file and asserts *nothing beyond* that. This would reintroduce the broader "compliance" notion that ADR removed.
- **Defer the item entirely**, as [ADR-0006](./0006-ci-workflows-are-not-yet-shareable.md) deferred CI workflows. Rejected because the finding is the opposite one. ADR-0006 measured and found no agreement to ship; here the agreement is measured at 95/100 recent commits in the application repo and 3/4 in the template, and its precise shape is known. There is something real to centralize.

## Consequences

**Preflight's baseline claim is now qualified.** Not every safeguard it ships is mandatory. The distinction is not arbitrary — a preset the consumer must actively wire to a hook cannot be made mandatory without Preflight either verifying the wiring (foreclosed by ADR-0002) or accepting dead config by default — but the README's framing is broader than what the package now does, and that gap is real.

**Adoption is three lines and one dependency**, none of which Preflight can write: the devDependency, the config file, and the hook entry. That is the same shape as residual risk #1 — the `preflight check` CI step each consumer hand-adds and could delete — and it carries the same exposure. A consumer can drop the hook and nothing reports it.

**Hook installation turned out to be a prerequisite, and a pre-existing gap.** Neither consuming repo runs `simple-git-hooks` from any script; both `prepare` scripts are `skilld update -b`. The `pre-commit` hooks present in both exist only because someone ran the command by hand, which means **a fresh clone of either repo gets no hooks at all** — the existing nano-staged/eslint guard included. Adding a `commit-msg` entry would have been inert for the same reason. The fix belongs in the consuming repos (`"prepare": "skilld update -b && simple-git-hooks"`), and was found only because this ADR's decision depended on it. Running `simple-git-hooks` outside a git repo — as in the application repo's Docker build — is noisy on stderr but exits 0, so wiring it into `prepare` is safe there.

**What would change the answer.** Enough consuming repos adopting commit linting that the opt-out becomes the exception rather than a real choice, *and* a mechanism for Preflight to cause a hook to exist. The second is the harder one, and it does not exist today: `package.json` cannot be a managed file, so the `simple-git-hooks` entry is beyond both of SPEC §4's mechanisms.
