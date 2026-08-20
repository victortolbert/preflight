# Publishing

What may be written on this repo's public surfaces, and what may not.

## The rule

> **This repo is publicly representative of its author, not of any employer or client.**
>
> Nothing published here may identify — or let a reader derive — an employer, a client, or their systems.

Everything below follows from that sentence. When a case is not covered, return to it.

## Derivation counts

The test is not "does this name a client." It is "can a reader get there." A repository name that is an acronym for a client's internal system is an exposure even though the acronym alone means nothing, because the sentence decoding it lives one hop away, in a private repo, and private is a visibility flag rather than a boundary.

Assume the reader is hostile, patient, and has more context than you think.

## What must never appear

- **Names of private repositories.** Including in PR titles, branch names, and commit subjects — surfaces that render in listings, where nobody is reading carefully.
- **Employer, client, or brand identifiers**, and any project name that decodes to one.
- **Internal hostnames, endpoints, API bases, or infrastructure names.**
- **File paths from private codebases** — including directory names that are themselves client-system acronyms.
- **Commit SHAs, PR numbers, or links into private repos.** A link is an identifier even when it 404s for the reader.
- **Live deployment detail** for anything not public: response headers, asset paths, admin routes, hosting topology.
- **Third-party personal data.** Colleagues' names, handles, roles, or employment status. This one is not yours to publish even where the rest is.
- **Findings about a private repo's shortcomings, tied to a name** — disabled rules, defect counts, drift, security gaps. Stated against a *role* these are the ordinary output of this project's method and are allowed; see *Keeping a claim checkable*. Attached to an identity they are a disclosure. And a **live** gap is not a writing problem at all — see *Fix the fact, not the sentence*.

## What is fine

The author's own identifiers are the point of a repo that represents its author:

`victortolbert` · `vticonsulting` · `tolbert.design` · `victortolbert.com` · `designcoder.net`

These are personal accounts, domains, and a sole proprietorship. They are in-bounds by definition, and removing them would work against the rule rather than for it.

## Roles, not identities

Almost nothing that carries an argument here needs a repository's *name*. What carries it is the **relationship between repos** — that two share ancestry, that a third does not. Role labels express all of it:

**the template** · **the application repo** · **the independent adopter** · **the surveyed candidate**

Two collective terms are also defined, and are the two most used: **the consuming repos** for all of them, and **the extraction pair** for the two Preflight was extracted from. *The consumer* — singular, unqualified — is not a role and should name which.

Counts, versions, and measurements attach to roles perfectly well: "6,727 violations in the application repo" argues exactly as well as the named form.

### The binding trap

A role label protects nothing if a table elsewhere in the same document binds it to a name:

```markdown
| | `some-private-repo` (application) | `another-one` (template) |
```

One header cell like that de-anonymizes every "the application repo" in the file, and every one in every *other* file too, because a reader carries the binding with them. This repo once had **six** such header rows silently resolving **114** role references.

**Never bind a role to a name.** If a document genuinely needs to distinguish two repos, the roles are already sufficient to do it.

## Fix the fact, not the sentence

A published finding about a live gap — "the application repo serves no security headers" — is not primarily a writing problem. Redacting the sentence leaves the gap; fixing the gap makes the sentence false, which is better protection than deletion and reaches the cached and mirrored copies too.

Prefer fixing upstream. Redact when you cannot.

## Where it applies

**Every world-readable surface**, without exception:

| Surface | Covered |
|---|---|
| ADRs, `SPEC.md`, `CONTEXT.md`, `README.md` | yes |
| Issues, comments, labels | yes |
| PR bodies **and titles** | yes |
| Commit messages | yes |
| Source comments, and anything shipped in the npm tarball | yes |

Note the deliberate divergence from [`evidence-grading.md`](./evidence-grading.md), which explicitly excludes source comments and commit subjects. That exclusion is right for its rule and wrong for this one: an ungraded claim in a comment misleads a maintainer, while an employer identifier in a comment ships to the registry.

## Keeping a claim checkable

[`evidence-grading.md`](./evidence-grading.md) requires every empirical claim to carry a file path, a command, or a URL. Read naively, that collides with this rule.

It does not, because **evidence is graded for the person who can check it**, and for anything measured in a private repo that person is the maintainer. A role label, an exact count, and the command that produced it is fully gradeable:

> ✅ 46 `label-has-for` errors survive in the application repo — `pnpm eslint app/ --rule ...`, run 2026-08-08.

The named form adds nothing a reader outside the project could use. Where a finding genuinely cannot be stated without internal detail, it does not belong here at all.

## The escape hatch

**If a finding cannot be stated without internal detail, it belongs in the repo it came from.** File it there, where the detail is already present and the audience is the person who can act on it. Reference it here by role, or not at all.

## Why this exists

The only sanitization rule this repo had was written eighteen minutes before its first issue, and was scoped to the issue tracker because that is what was being set up at the time. It held: seven of eight issues complied.

Meanwhile the surfaces nobody had scoped carried far more — ADRs, `SPEC.md`, `.gitignore`, roughly thirty PR bodies, one PR title, and the published npm tarball. The rule was working exactly as written and protecting the least material, which is the failure mode of a rule that names a surface instead of a principle. See [ADR-0019](../adr/0019-this-repo-represents-its-author-not-an-employer.md).
