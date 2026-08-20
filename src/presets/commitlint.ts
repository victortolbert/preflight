import type { UserConfig } from '@commitlint/types'

/**
 * Preflight's `commitlint` policy.
 *
 * Consumed through commitlint's own `extends`, not by spreading — the one
 * preset in this package that is, and the reason is mechanical rather than
 * stylistic. See
 * [ADR-0007](../../docs/adr/0007-commitlint-presets-are-consumed-via-extends.md).
 *
 * ```ts
 * // commitlint.config.ts, in the consuming repo
 * export default { extends: ['@victortolbert/preflight/commitlint'] }
 * ```
 *
 * A commitlint config is not a plain options object in the sense ADR-0004
 * means. It carries *resolvable references* — `parserPreset` below is inherited
 * as the bare string `'conventional-changelog-conventionalcommits'`, and the
 * `extends` entry is another — and commitlint resolves those relative to the
 * config's own location. Spreading the preset into the consumer's config moves
 * the references away from the package that can resolve them, which fails with
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` at the parser and, more quietly, drops the
 * inherited rules. Naming the preset in `extends` keeps resolution anchored
 * here, where the dependency lives.
 *
 * Both rules below depart from stock `@commitlint/config-conventional`, and
 * both were measured rather than chosen. Linted against 1,472 non-merge commits
 * across the two consuming repos, stock config-conventional disagreed with
 * practice six times and was wrong all six — this is the smallest set of
 * changes that makes it right, and nothing more. Everything else
 * config-conventional asserts is inherited untouched, including
 * `header-max-length` and `body-max-line-length` at 100, which that history
 * clears with room to spare (longest header 104 in two commits, longest body
 * line 83).
 */
const preflightCommitlint = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    /**
     * config-conventional's enum, plus `content`.
     *
     * `content` is a real type in these repos, not a slip: 11 commits between
     * 2026-01-23 and 2026-06-22 in the application repo, which is
     * content-driven. Every *other* off-enum type in the same history is a
     * single day's burst — `deps`, `prd`, `config`, `assets`, and one
     * project slug — or a bare typo (`i`), and those are what this rule is
     * for. Widening the enum
     * to admit them all would leave nothing enforced; widening it by exactly
     * one keeps the rule catching the eleven it should.
     */
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'content',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],

    /**
     * Warn instead of error.
     *
     * The rule cannot tell a leading acronym from Sentence Case, and this
     * project writes acronym-initial subjects that are correct English:
     * `ci: SHA-pin every GitHub Action`, `fix(llm-vo): WCAG contrast …`,
     * `build(railway): Chromium-capable Dockerfile …`. Narrowing the case list
     * does not help — measured against those subjects, every subset down to
     * `['sentence-case']` alone still rejects all of them, because any
     * capital-initial subject reads as sentence-case. Level is the only dial
     * that moves.
     *
     * Warning keeps the signal for the case the rule is actually good at — a
     * genuinely sloppy capitalised subject — while exiting 0, so the
     * `commit-msg` hook never blocks a correct commit. That last part is the
     * point: a hook that rejects valid work teaches people to reach for
     * `--no-verify`, and a routinely bypassed hook stops enforcing the rules
     * that *were* working.
     */
    'subject-case': [1, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
} satisfies UserConfig

export default preflightCommitlint
