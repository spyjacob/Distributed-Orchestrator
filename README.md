# Distributed Orchestrator

Run AI coding sessions from your computer or phone. Keep projects in one place,
switch models during a conversation, and connect other computers to use their
models and files.

## Get started

1. Install **Node.js 22 or newer**, **Git**, and **Tailscale**. Connect Tailscale.
2. Clone this repository.
3. Open **start_mac.command** on Mac or **start_windows.cmd** on Windows.
   It installs dependencies, starts DO, and opens your browser. Keep the terminal open.
4. Open **Settings → AI sources** and connect a model.
5. Create a project and start a session.

The default address on the hosting computer is **http://127.0.0.1:8787**.
Windows runs without WSL. On Mac, `npm start` builds and opens the optional native
launcher; that requires Python 3 and Apple Command Line Tools.

## Choose your AI

You can use any of these three setups:

- **Subscription:** install Claude Code or Codex and sign in on the computer
  running your session. In AI sources, check the login and add the models you
  want. This uses the CLI's existing login; you don't need to supply an API key.
- **API:** add a provider and your API key in AI sources. API billing is separate
  from subscriptions.
- **Local model:** install Ollama, then add or download a model through AI sources.
  The computer needs enough memory for that model. A GPU can help; models without
  tool support are limited to chat.

Sources belong to the computer where you set them up. That computer must be on
and reachable to use them. You can switch a session's model and keep its conversation.
Changing the coding model does not change any AI integration inside the app you're building.

Settings, logins, and API keys aren't included in your project's GitHub repository.
Voice dictation is optional and has its own setup under **Settings → Voice setup**;
it requires an OpenAI API key even if your coding sessions use a subscription.

For optional classification, routing and scoring, add a TypeSafe key in
**Settings → Jev · TypeSafe**. Project agents can use Jev through Harness without
reading the key. It is shared with paired computers. Saving it does not test
account access; requests use your TypeSafe API account. See the
[TypeSafe API documentation](https://docs.typesafe.ai/api).

## Projects and sessions

A project has a folder and can have several sessions. Use **agent** mode to work
on files or **chat** mode for conversation without tools. Apps with a start command
can be launched from their project card.

**DO stays first in the project list.** Other projects are ordered by the latest
message you sent in any of their sessions. Open a project to reach its sessions.

Each coding session works in its own Git worktree, so sessions can edit separately.
The built-in Harness project is where you change DO itself.

## Save and publish your work

Edits stay local until you press **Push**. Open it to review the selected session's
changes, then push to GitHub. DO commits the changes, merges other updates, runs
the project's checks, and publishes if those checks pass.

For a new project, the panel lets you create a GitHub repository and choose
Private or Public. Private is the default. Connect your GitHub account in Settings first.

If a merge or check fails, the work stays in the session for you to fix and retry.
Nothing is automatically published at the end of a conversation.

Projects need checks before they can be published. Node projects use `npm test`,
with dependencies installed first. For another setup, add a
`.harness-integration.json` file, for example:

```json
{"command": "python -m pytest"}
```

That command should install any required dependencies and run the project's checks.

## Use your phone or another computer

For phone access, install Tailscale on your phone and join the same private network.
Open **Settings → Phone access · Tailscale** in DO and use the phone link it shows.
The localhost address only works on the hosting computer.

To add another computer, follow the [machine setup guide](docs/machines.md), then
pair it under **Settings → Machines**. Configure its AI sources separately.
An existing coding session stays with its original computer; reconnect that
computer to continue its work.

DO can run shell commands and edit files. Keep it on a trusted private network;
don't expose it to the public internet. Tailscale must stay connected to use DO.

## Update DO

Publishing a DO change and running that change are separate steps. A running
server needs to restart to load new code.

Use **Restart and updates** in Settings to inspect the running version on each
computer and restart the one you want to update. Check the running commit after
restart; don't assume every paired computer has updated just because one has.

The launch scripts check for repository updates before starting. If local edits
or a Git problem prevent an update, resolve that problem before retrying.

## Development

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
inference. See [the reliability review](docs/reliability-review.md) for findings,
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

Queued follow-ups appear directly above the composer. Edit saves changes on the
owning computer; cancel removes only that pending message. Refresh reconnects
to its server-held state. The queue still lives in server memory: a forced
shutdown loses it, and Stop cancels it. If the message has already begun,
edit/cancel returns a conflict rather than modifying the running turn.
Sending shows a provisional conversation entry immediately; a rejected request
restores its draft. Diagnostics record pending-panel visibility and queue edits
or cancellation without storing message text.
