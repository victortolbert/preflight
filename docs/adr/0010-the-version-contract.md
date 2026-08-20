# The version contract, and why 1.0.0 waits on §11

SPEC §9.4 records v1's smallness as "a judgement call, worth revisiting **once the mechanism lands**." It has landed: `@victortolbert/preflight` is installed, consumed by reference, and `preflight check`-enforced in CI in both consuming repos, across three releases with provenance attestation. So the call is due, and it is really two — what the next version *number* is, and what any version number here *means*.

**The number is `0.3.0`.** **The meaning is written down below, and enforced by `test/stability.test.ts`.**

## What made this decision non-obvious

Taking 1.0.0 looked like bookkeeping until two things were measured. Both are cases where a release that appears additive turns a consumer's CI red.

### A newly managed file failed `check`, in a repo that chose nothing

`src/check.ts` derived state as:

```js
const locked = lock?.files[file]?.computedHash
if (locked === undefined)
  return { file, state: current === packaged ? 'unrecorded' : 'drifted' }
```

For a file Preflight starts managing *after* a project's last sync: no lock entry, absent locally, so `undefined === packaged` is false → `drifted` → the only state that fails. The project had done nothing and chosen nothing.

The same file already documented why that is wrong, for a case it did cover — `upstream-moved` exists because "failing here would mean every Preflight release broke its consumers' CI until they synced." That protection simply never extended to a file the lock had never seen. Fixed in this release, and the distinction that keeps it honest is whether a lock exists at all: a project that has *never* synced is not receiving news, it has not been set up, and a missing managed file there is still drift.

### Presets have no gate at all

Managed files at least pass through a lock and an explicit `preflight sync`. Presets are consumed by reference (SPEC §4), so **a changed rule reaches every consumer on any version their range allows, including a patch** — no sync step, and nothing in `preflight check` that sees it. SPEC §4 anticipates the *drift* half of this ("presets are low drift surface, not zero") and is silent on the *upgrade* half.

Adding one enforcing rule to the `vue-a11y` or `commitlint` preset in a patch release would fail both repos' lint or commit hook on a routine update.

### Why that settles the number

Under semver, `^0.2.0` means `>=0.2.0 <0.3.0` — minors do not flow in 0.x, so both consuming repos must bump by hand and nothing arrives unnoticed. At `^1.0.0`, `1.1.0` flows automatically. **The 0.x range was doing real safety work**, and 1.0.0 would have removed it silently while the two hazards above were still unaddressed.

## The contract

**Covered:** the `exports` map · preset *values* · CLI commands and flags · **exit codes** · the `PreflightConfig` and `ManagedFile` types · the Node engine floor.

**Explicitly internal:** the lock file format. It is generated, never hand-written, and read only by Preflight; SPEC §6 treats it as state rather than interface. Declaring it public would make a format improvement cost a major. Recorded as a decision so "internal" is on the record rather than a gap.

**Breaking means: anything that can newly fail a consumer's build.** Three consequences that look additive and are not:

| Change | Why breaking |
|---|---|
| Adding a managed file | measured above — lands as drift in a repo that chose nothing |
| Adding or tightening an *enforcing* preset rule | reaches consumers with no lock, no sync, and no check |
| Raising the Node engine floor | cannot fail at runtime, but makes the package uninstallable |

**While 0.x, breaking goes in the minor slot** (`0.4.0`); major after 1.0.0. This makes both consumers' existing caret ranges safe as they stand — `^0.3.0` is `>=0.3.0 <0.4.0`, so a breaking preset change cannot reach them, patch releases included. No consumer-side change is required by this ADR.

**1.0.0 ships when SPEC §11's "migration for partially-adopted repos" resolves.** That is the one open item that plausibly wants CLI surface — a `preflight adopt`, or flags on `sync` — and Q4's hold was reasoned on surface instability specifically. §11's other open item, whether the source template survives, is a question about the source template's fate rather than this package's interface, and gating on it would let an unrelated decision hold this one hostage.

## Considered Options

- **Take 1.0.0 now.** The package is publicly published with provenance, adopted, and enforced — by adoption it looks 1.0-shaped. Rejected on the caret-range finding: 1.0.0 lets minors flow automatically, which is only safe once "additive" reliably means "cannot fail your build." That property did not hold until this release, and SPEC §11's migration item may yet move the CLI surface.
- **Stay 0.x indefinitely (zerover).** Honest about instability and demands nothing. Rejected because Q1 settled the audience as public: the costs of being public are already paid — OIDC, provenance, `access: public`, a `publint`-guarded exports map — and 0.x-forever takes those costs while declining to say what the package promises.
- **Write the policy after cutting the release.** Rejected as the failure this project keeps finding in other repos. A 1.0.0 with no written policy is a promise nobody wrote down, and the reason ADR-0003, ADR-0005 and ADR-0009 all exist is claims that were never checked against the thing they described.
- **Prose policy with no enforcement.** Rejected for the same reason. A stability policy nothing checks is exactly the shape of the dead config this package hunts, so the covered surfaces are pinned in `test/stability.test.ts` — a red assertion there is the question "is this release breaking?" arriving before publish rather than after.
- **Declare the lock format public.** Rejected: it is generated state, and freezing it would price a format improvement at a major bump for no consumer benefit.

## Consequences

**Two behaviour changes ship in 0.3.0**, both loosenings, so neither is breaking under the rule this ADR sets. `check` no longer fails a file Preflight began managing after a project's last sync. And `readLock` now validates `version`: until now `LOCK_VERSION` was exported, documented as the field to bump for a breaking shape change, and **read by nothing** — a future v2 lock would have been parsed as v1 and its hashes compared against a shape the code does not understand. Only a *newer* lock is refused; an older one is accepted, because a migration has to be able to read one.

**A hole this closes and one it accepts.** A project that deletes a managed file *and* its lock entry now passes. That takes two deliberate acts, one of them a hand-edit to a generated file that shows up in review, and SPEC §9.3 already concedes the check "is an honesty aid, not a control." Deleting the file alone still fails, because the lock entry survives.

**The `unrecorded` state now means two things**, and `src/check.ts` says both. It was "no lock entry, but the file already matches"; it is now also "absent from a project that has synced before." SPEC §6's three-row table is left intact — it specifies the mechanism, and importing five implementation states into it would push detail into a document that deliberately avoids it — with a pointer here instead.

**Adding a managed file is now expensive**, by design. It is a `0.4.0` today and a major after 1.0.0, so v2 backlog items that would add one (editor config, SPEC §10.7) carry a version cost that additive-looking work usually does not. That cost is the honest price of `preflight check` being a CI gate.

**What would change the answer.** SPEC §11's migration item resolving without touching the CLI surface — at which point 1.0.0 is due, and the enforcement in `test/stability.test.ts` is what makes that promise credible rather than aspirational. A second consumer that is not one of these two repos would also test whether the contract describes the package or just this pair.

## Addendum, 2026-08-17 — the gate is discharged

**SPEC §11's migration item resolved without touching the CLI surface**, which is the condition this ADR names above under *What would change the answer*. See [ADR-0016](./0016-migration-needs-no-new-cli-surface.md): the population is two repos structurally identical to the ones already onboarded, the existing `sync`/`check`/`unmanaged` mechanism handles them, and the only defect found was a word — `check` called a never-adopted repo's files *drift*, which `CONTEXT.md` defines against that use. Fixed as a patch; `CheckState` is internal, so it is not a contract change.

The sentence that actually discharges the gate is narrower than "migration resolved." This ADR gated 1.0.0 on §11 because it *"plausibly wants CLI surface"* — the worry being a major freezing an interface that then had to move. The one plausible future change is per-file selection at the `sync` confirmation prompt, and **a prompt is not covered here**: this contract covers commands, flags and exit codes, and an interactive prompt is none of them. So that change can ship in a minor whenever it earns its keep, and 1.0.0 need not wait on it.

**A correction to this ADR's own text.** It states the covered surfaces are *"pinned in `test/stability.test.ts`."* That is true of the exports map, the managed-file list, the Node floor and the preset values; it is **not** where the CLI half lives. Exit codes are asserted across `test/cli-check.test.ts` and `test/cli-sync.test.ts`, as `not.toBe(0)` — which pins the actual promise, since any non-zero fails a CI gate. The enforcement exists and is adequate; only this ADR's pointer to it was wrong. Worth correcting rather than quietly fixing, because a stability claim nobody can locate is the shape of the dead config this project hunts.

**One item to carry into the 1.0.0 release commit itself**, not before it: `README.md`'s version-policy paragraph states *"while this package is 0.x, breaking changes go in the minor slot."* That is true today and false the moment the major is cut. It must change **in** that commit — updating it earlier would make it wrong for the intervening patch release.
