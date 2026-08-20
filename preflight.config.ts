import { definePreflightConfig } from './src/index'

/**
 * Preflight's own Preflight config.
 *
 * This repo manages exactly one of its three managed files, and the two it
 * declines are declared here rather than merely absent — which is the point of
 * SPEC §6's escape hatch, and the difference between a reviewable decision and
 * drift nobody looked at.
 *
 * Imported from `./src/index` rather than the package subpath, for the reason
 * `commitlint.config.ts` and `.markdownlint.json` both give: the subpath form
 * would need this package installed into itself.
 *
 * See [ADR-0018](./docs/adr/0018-preflight-consumes-what-runs-here.md) for the
 * measurement behind both entries.
 */
export default definePreflightConfig({
  unmanaged: [
    /**
     * Nothing here reads it. This package has no eslint config and no eslint
     * dependency, so the backstop ADR-0014 relies on in the consuming repos —
     * every key restating a rule eslint already enforces — does not exist. With
     * no `.vscode/extensions.json` either, the file would have zero readers.
     *
     * That is ADR-0017's criterion failing in the repo that wrote it, so the
     * file stays out until something here reads it.
     */
    '.editorconfig',

    /**
     * Nothing here to lint. No Vue, no HTML, no JSX — axe Linter would have no
     * content to act on, which makes the file dead config by ADR-0003's test in
     * the repo that cut two files on that test.
     */
    'axe-linter.yml',
  ],
})
