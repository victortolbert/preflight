# Releasing

Cutting a release:

```bash
pnpm run release
```

`bumpp` prompts for the new version, updates `package.json`, commits `chore: release vX.Y.Z`, tags `vX.Y.Z`, and pushes. Pushing the tag is what starts `.github/workflows/release.yml`, which typechecks, builds, runs the packaging checks and the tests, and then publishes.

To release without the prompts — from a script, or an agent session that has no terminal to answer them — name the version and pass `--yes` to `bumpp` directly:

```bash
pnpm exec bumpp 0.4.0 --yes
```

**Not `pnpm run release -- 0.4.0 --yes`.** That form does not forward the flags, so `bumpp` still prompts and the caller hangs waiting on a question it cannot see.

There is no credential to rotate — see [ADR-0001](./adr/0001-build-and-release-toolchain.md). Before the first automated release, though, there is setup that can only happen once the package exists.

## One-time setup

The workflow authenticates by [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), which mints a short-lived OIDC token per run instead of reading a stored secret. That has to be configured once against the package, on npmjs.com.

**It cannot be done before the package exists.** npm's UI configures trusted publishing under an existing package's settings, and there is no way to pre-register one. This was checked rather than assumed, because SPEC §12 asked for it to be: it is [npm/cli#8544](https://github.com/npm/cli/issues/8544), still open. So the order is fixed — publish `0.1.0` by hand first, then configure, then every release after that is automated.

> **Do not push a `v0.1.0` tag during the manual publish.** Any `v*` tag starts the release workflow, and it would try to publish a version that now exists — npm never reissues a version number, so the run fails with `E403`. Commit the version bump without a tag, publish by hand, then let `pnpm run release` cut `v0.1.1` as the first automated release.

Once `@victortolbert/preflight` exists on the registry:

1. npmjs.com → the package → **Settings** → **Trusted publishing**
2. Publisher: **GitHub Actions**
3. Organization or user: `victortolbert`
4. Repository: `preflight`
5. Workflow filename: `release.yml`
6. Environment: leave empty — the workflow declares none

`npm trust` (npm 11.10.0+) does the same from a terminal, and has the same prerequisite that the package already exist.

## Checking it worked

After the first automated release, from a scratch directory — not this repo, since `npm audit signatures` verifies the dependency tree of wherever it runs, and Preflight is not its own dependency:

```bash
mkdir /tmp/verify && cd /tmp/verify && npm init -y
npm install @victortolbert/preflight
npm audit signatures        # should report the package as verified, with provenance
```

The package page on npmjs.com should also show the green **Provenance** panel, naming the workflow and the commit it was built from.

## What the workflow refuses to do

- **Publish without matching versions.** A tag whose version disagrees with `package.json` stops the run. `bumpp` cannot produce that state; a hand-pushed tag can, and npm never reissues a version number.
- **Publish a broken artifact.** `publint` and `@arethetypeswrong/cli` run before `npm publish`, not after.
- **Publish with an npm too old for OIDC.** Trusted publishing needs npm ≥ 11.5.1. `.nvmrc` says `24`, which resolves to the newest 24.x and satisfies that today — but 24.0.0 through 24.4.1 shipped npm 11.3.0 or 11.4.2, so pinning `.nvmrc` to a patch could reintroduce it. The workflow fails with that explanation rather than installing a newer npm, which would put an unpinned package in the one job holding publish rights.

## GitHub Releases are created by hand, deliberately

All nine tags have a GitHub Release, backfilled on 2026-08-17 with notes taken verbatim from [`CHANGELOG.md`](../CHANGELOG.md). `0.1.0` has none and should not: it has no tag, because it was the by-hand publish that had to exist before trusted publishing could be configured.

**Nothing automates this, and that is a trade rather than an omission.** `release.yml` publishes to npm and has no release-creating step. Adding one means raising that job from `contents: read` to `contents: write` — and it is the one job holding `id-token: write`. [ADR-0001](./adr/0001-build-and-release-toolchain.md) chose OIDC specifically to keep that job's surface small, so widening it to save a manual step trades the thing the design was for against a convenience. Leave it manual, or widen the permission as a decision someone made on purpose.

One trap when writing the notes by hand: **relative links in `CHANGELOG.md` do not survive the copy.** A release page is not served from the repo root, so `./docs/adr/…` 404s there. Rewrite them to absolute blob URLs.
