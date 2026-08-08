/**
 * Preflight lints its own commits with the preset it ships.
 *
 * Imported from source rather than `extends: ['@victortolbert/preflight/commitlint']`,
 * which would require the package to be installed into itself. The object is the
 * same one consumers resolve through that subpath — `src/presets/commitlint.ts` is
 * the single definition, and `test/packaging.test.ts` asserts the built subpath
 * exports it unchanged.
 *
 * Deliberately not typed with `@commitlint/types`' `UserConfig`: the preset already
 * carries that type at its definition, and re-annotating here would duplicate it.
 */
export { default } from './src/presets/commitlint'
