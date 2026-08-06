# commitlint presets are consumed via `extends`

The commitlint preset is named in the consumer's `extends`, not spread into their config the way [ADR-0004](./0004-presets-are-composable-options-objects.md)'s presets are. This is a mechanical constraint, not a style choice, and it is the first preset in this package to break that pattern.

```ts
// commitlint.config.ts, in the consuming repo
export default { extends: ['@victortolbert/preflight/commitlint'] }
```

**A commitlint config is not a plain options object.** It carries *resolvable references* — `parserPreset`, and a nested `extends` — and commitlint resolves those relative to the config's own location. Spreading the preset into the consumer's config moves the references away from the package whose dependencies can resolve them.

## The measurement

Three shapes were built and run against real commit messages, using a scoped package with an ESM subpath export mirroring this one:

| Shape | Consumed as | Result |
|---|---|---|
| Preset keeps `extends: ['@commitlint/config-conventional']` | `extends: ['@victortolbert/preflight/commitlint']` | all 14 rules apply |
| Same preset, spread | `{ ...preset }` | works, but only via commitlint's internal resolver — node itself cannot resolve `config-conventional` from the consumer |
| Flat options object, no `extends` key | `{ ...preset }` | **fails twice** |

The flat shape is the one worth recording, because it failed *quietly* first. `require('@commitlint/config-conventional')` returns `{ __esModule, default }`, so `conventional.rules` is `undefined` and the spread produced a config carrying **2 rules instead of 14**. It threw no error and passed every message tested against it, including `not a conventional commit at all`. Correcting the interop then exposed the real blocker: the spread carries `parserPreset: 'conventional-changelog-conventionalcommits'` as a bare string, which commitlint resolves from the consumer's directory, where it does not exist — `ERR_PACKAGE_PATH_NOT_EXPORTED`.

One further resolution detail, since it constrains the package name rather than the preset. commitlint's `resolve-extends` mangles unscoped ids — `fakepreflight/commitlint` becomes `conventional-changelog-lint-config-fakepreflight/commitlint` — but returns scoped ids containing a `/` untouched:

```js
if (scoped) return raw.includes('/') ? raw : [raw, prefix].join('/')
return relative || absolute ? raw : [prefix, raw].join('-')
```

`@victortolbert/preflight/commitlint` takes the first branch. A subpath export works here **because the package is scoped**; the same preset published unscoped would not resolve.

## Considered Options

- **Restate config-conventional's rules inline** instead of inheriting them, removing the nested `extends` entirely. Rejected: it makes this package responsible for tracking a dependency's ruleset by hand, and the `parserPreset` problem survives regardless.
- **Publish the preset as its own `commitlint-config-*` package**, which is the ecosystem's conventional shape. Rejected as a distribution mechanism SPEC §4 did not choose, and unnecessary — the scoped subpath resolves.
- **Keep ADR-0004's shape and accept the spread**, since it did work in testing. Rejected: it works through commitlint's resolver finding a package node's own resolution cannot, which is an undocumented path this project has no reason to depend on.

## Consequences

**`CONTEXT.md`'s *Preset* entry is broadened.** It defined a preset as "a typed options object the consumer imports and composes," and told readers to avoid the word *extends* because "neither peer dependency has an `extends` key." That was accurate about `taze` and `skills-npm` and wrong as a generalisation. The term now covers configuration consumed by reference through a subpath export via whatever native composition point the tool provides — spread for `taze`, `extends` for commitlint. SPEC §4's assignment rule already said "if the tool has a native composition point, it is a preset" without naming which one, so this is the reading it implied.

**ADR-0004 is narrowed, not overturned.** Its reasoning holds wherever a tool's config is genuinely a plain options object. It is no longer a claim about all presets.

**The preset's public shape is now fixed.** Consumers write `extends`, so switching to a spread later would be a breaking change to every consuming repo.

**A note on how this was found.** The first two shapes were tested only against a CommonJS preset. This package builds ESM, and that difference was left unverified until it was tested directly rather than assumed — the ESM subpath does resolve. Given that the silent 2-rules-instead-of-14 failure was found by asking a config to reject a message it should have rejected, shape assertions alone would not have caught it; `test/commitlint.test.ts` lints real messages through commitlint's own loader for that reason.
