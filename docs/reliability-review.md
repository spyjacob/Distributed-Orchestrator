# Two-computer reliability review — 2026-10-13

## Evidence and limits

The live laptop reported revision 8804ea9, 11 replication conflicts, and Machine
offline (last contact October 11). The laptop volume had about 56 GiB available.
Machine's free space and running revision could not be measured. Historical
browser interaction traces did not exist; earlier reports of disappearing work
are user reports, not reconstructed click histories. No live recovery was performed
by this review. The sneaker project's files remain unverified.

Reviewed join/import, conflict archives, snapshot compaction/replacement, session
ownership and stale-write protection, proxy failure behavior, network gating,
version reporting, recovery, and settings navigation.

## Repairs

- Preserve joining projects and tabs together, with ID collision handling and
  explicit protocol compatibility checks (the pending recovery change).
- Preserve snapshot-only history before installing another host's snapshot.
  Previously an empty log tail could bypass the archival step.
- Build each compacted snapshot at its actual log index. A leader can compact
  behind its latest commit while a follower catches up; including later state
  in that earlier snapshot makes recovery/replay inconsistent.
- Make diagnostics available locally before the network/quorum gates.
- Keep diagnostics on each host; combine reachable histories on demand and
  explicitly report missing peers.
- Record observed peer revisions and unavailability, so future version questions
  can use dated observations rather than assuming a checkout is running.
- Protect the history screen from late replies after navigating away.

## Remaining architectural limits

Two-host availability deliberately lets either isolated host accept work.
It cannot also guarantee a single consistent writer across a partition.
Conflict archives and explicit recovery preserve options; they do not make
divergent work merge automatically. Changing this requires a product decision
between offline writes and requiring a reachable authority/witness.

Existing recovery restores missing project records and tabs. It does not merge
different transcripts under an already-existing ID or recover deleted files.
Git worktrees remain on their owning host. Replicated metadata is not a backup
of every uncommitted file. Recovery archives are distinct from usage history;
clearing diagnostics must never delete project recovery evidence.

The history is observational: repeated clicks may indicate latency, confusion,
or intentional repetition. Viewport size is useful context, not proof of a
misplaced control. No screenshots or keystrokes are collected. A browser event
reports a rendered state; it does not establish that a person noticed it.
Browser queues are bounded and best-effort, so closing a page or a network loss
can omit its last events. Disk write failures and overload increment counters.

## Validation

Real-server E2E coverage includes joining with local work, ID collisions, missing
project recovery, snapshot-only archive preservation, host-local history,
remote aggregation and unavailable peers, serving-browser metadata, error
states, settings save/clear, privacy filtering, rotation, disabled tracing,
unwritable trace storage, disconnected Tailscale diagnostics, and restart flows.
Browser scripts/settings are exercised against real APIs through the existing
VM harness, not a physical-phone visual inspection.

Publishing and restarting both hosts is necessary before these repairs run
in the user's system. This review made no claims about unobserved Machine state.
