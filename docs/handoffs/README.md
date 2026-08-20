# Session handoffs

Point-in-time handoff notes so a fresh agent (or a different machine) can pick up
where a session left off. Committed on purpose — git is the cross-machine channel.

Same convention as the application repo's `docs/handoffs`, so a handoff reads the same way in
either repo.

- **Naming:** `YYYY-MM-DD-<branch-or-topic>.md` (e.g. `2026-08-06-preflight-v2-measurement.md`).
- **Lifespan:** transient. Delete a handoff once it's no longer relevant — these
  are not permanent docs. Durable decisions belong in `docs/adr/`, and durable
  vocabulary in `CONTEXT.md`.
- **To resume:** "read the latest handoff in `docs/handoffs`".

A handoff should not restate what `SPEC.md`, an ADR, or a commit message already
says. Reference those by path; record only what would otherwise be lost.
