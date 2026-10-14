# Development and operations

[Back to the quick start](../README.md)


Settings → **Usage history · diagnostics** selects a computer and shows history
size, file count, available disk, effective budget, and dropped/write-failure
counts. Recording, retention, and the budget are local settings. Clear removes
that computer's usage history, not transcripts or project recovery archives.
“Recent history” downloads up to 1,000 events.

The default is 2 GiB (2048 MB) per computer / 14 days, configurable from 4–2048 MB / 1–90 days.
JSONL files rotate at 4 MB or one day. Retention removes expired segments;
the effective budget is capped at 5% of available space plus current trace
storage. Recording suspends below 2 GiB free. These are compact metadata logs,
not video: even 100,000 events at roughly 500 bytes is about 50 MB.
The browser buffers at most 100 events; the server admits at most 1,000 pending
writes. Overload drops telemetry rather than breaking work.

Files live in the server-owned `diagnostics/` directory under its data directory,
outside Git. Coding assistants must use authenticated APIs, not read protected
files. Use the same local origin/authentication as the activity command:

- `GET /api/diagnostics` — local storage/settings and serving revision.
- `GET /api/diagnostics?action=events` — latest 1,000 events; pass the returned
  `nextBefore` as URL-encoded `before` to page older retained events.
- `GET /api/diagnostics?action=all` — recent history from every reachable host;
  unavailable hosts are marked, never silently substituted.
- Add `host=<member-id>` to inspect an individual host.
- `POST /api/diagnostics` with `action: settings`, `enabled`, `maxMB`, `days`,
  or `action: clear` changes only the selected host.

History includes browser/page IDs, phone/tablet/computer category, viewport,
control identifiers, screen states, connectivity, request/turn timing, HTTP
outcomes, cluster transitions, and observed peer revisions. Correlation IDs
link clicks and ensuing requests across proxies. Ingest timestamps and browser
timestamps are separate; clocks may differ. No text, input values, request
bodies, query strings, credentials, or screenshots are recorded. Events are
best-effort and older history is intentionally evicted. Turn completion records
describe server execution, not delivery to the browser.

Phone history stays on its serving host. Nothing is replicated or uploaded;
the combined endpoint fetches histories on demand. Future Harness experience
reviews are instructed to read these APIs and distinguish evidence from
inference. See [the reliability review](reliability-review.md) for findings,
test scope, and remaining two-host tradeoffs.

Joining a network imports the joining computer's project registry and tabs as
one operation, preserving their original owner. Both computers must run the
updated join protocol. The pre-join history remains archived even if importing
is interrupted.

If projects disappeared after pairing or a replication conflict, open **Apps &
Chats → recover projects** after updating and restarting every paired computer.
Recovery searches each computer's pre-join/conflict archives and local session
records. Select a project to restore its registry entry and missing tabs; current
records win. Previously deleted projects may appear, so recovery is explicit.
This restores metadata, not deleted files. A project inferred only from a tab
has no recovered launch command; its original computer and folder are still
needed. Unreachable computers and unreadable archives are reported in the sheet.

Join/recovery traces are server-owned at `cluster/project-recovery-trace.json`
under the Harness data directory, outside Git. They retain the last 200 events,
with timestamps, serving revision, host, correlation ID, durations, counts and
outcomes; they omit tokens and transcript content. Read them through the
authenticated `POST /api/cluster/recovery` API with
`{"host":"<host-id>","action":"traces"}` rather than accessing protected data
files. Browser `recovery.visible` events identify loading, results, empty,
success and error states; a server commit alone does not prove screen delivery.
Reproduce by creating a local project, joining another host and checking its
project/tab entries; the distributed E2E workflow also restores a missing
project from archives and exercises a failed recovery request.

Coding sessions are instructed to include tracing for future debugging: what the
user did, what the app showed, and what happened behind the scenes. Logs are for
the coding assistant to read, not extra UI for the user. They should be bounded,
redacted, kept out of Git, and documented so the next session can find them.
This is a development instruction; existing apps still need tracing added.

To run the current checkout directly:

```sh
npm ci
npm run serve
```

After editing server or UI code, restart the server to load it.

Run the tests with:

```sh
npm test
```

The tests start real servers with temporary data and simulated AI and Tailscale
services. They cover distributed sessions, network recovery, and restarts.
They don't need API keys and don't test browser clicks.

Main files:

- `server/index.js` — HTTP server and API routes.
- `server/public/` — browser UI for desktop and phone.
- `src/core/` — agents, models, projects, Git, and machine connections.
- `test/e2e/` — end-to-end tests.
- `scripts/` — launchers and setup.

## Licence

MIT.

Multiple queued follow-ups run in submission order and appear directly above the composer.
The whole queue collapses; expanded entries scroll within a bounded panel. Edit saves changes on the
owning computer; cancel removes only that pending message. Refresh reconnects
to its server-held state. The queue still lives in server memory: a forced
shutdown loses it, and Stop cancels it. If the message has already begun,
edit/cancel returns a conflict rather than modifying the running turn.
Sending shows a provisional conversation entry immediately; a rejected request
restores its draft. Diagnostics record pending-panel visibility and queue edits
or cancellation without storing message text.

Version display uses host-local cached observations and background peer checks.
Offline peers do not delay the local version response. Stale peer observations
are labelled unverified and cannot verify restart completion. Automatic restart
coordination still performs fresh checks. Opening a conversation renders its
transcript before refreshing the owning computer’s model inventory.

Push opens the current project chat and records a separate “Push changes” entry,
check/publish progress, and a concise completion or failure reply. The receipt
and commit link remain in the transcript after refreshing. No model request is
needed to report publication; server progress is streamed to connected viewers.

Push and Merge latest first use Git without a model. Merge latest is available in
an isolated tab’s Push panel and brings in the target branch and fetched remote
without publishing or updating the shared checkout. Push repeats those merges
and runs checks before publication. Conflicts or failing configured checks can
use the tab’s configured AI for at most two five-minute repair attempts per
operation. Repairs stay in the tab and must preserve parent history, leave a
clean branch, and pass checks. Check-failure repairs that change package.json,
.harness-integration.json, test/, or tests/ require review instead of publishing.
Network/authentication failures and missing check configuration are reported;
no AI retries credentials or force-pushes. Stop cancels the operation. Repair
progress appears in the current chat and integration.repair diagnostics (without
message content). The server validates results; model claims alone are not proof.

Each browser window remembers its own selected chat across refreshes. Opening a
chat updates the URL’s session parameter and window-local session storage; other
windows cannot change that selection. Host failover carries the current window’s
chat and execution node. Failed opens leave the previous selection intact and
record a transcript `open-failed` event in the existing diagnostics history.
Reproduce by opening different chats in two windows, then refreshing each.
