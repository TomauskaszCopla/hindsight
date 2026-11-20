<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Diagnostics & logging

All logs live in `~/.hindsight/coding-agents-logs/` (owner-only). Each file rotates to `<file>.1`
at 10 MB.

**Leveled plugin log** (humans debugging): `~/.hindsight/coding-agents-logs/plugin.log` (override
`HINDSIGHT_LOG_FILE`) — timestamped `LEVEL [scope] message` lines from every component, including
the ingestion engine. Level defaults to `info`; set `"logLevel": "debug"` in config or
`HINDSIGHT_LOG_LEVEL=debug` for ad-hoc debugging (at `debug`, every diag event below is mirrored
here too, so one file tells the whole story).

**Structured diag events** (machines/harnesses): every reflect and page-fetch outcome is appended
as a JSON line to `~/.hindsight/coding-agents-logs/diag.jsonl` (override with
`HINDSIGHT_DIAG_FILE`):

```json
{
  "ts": "2026-07-27T07:05:52Z",
  "harness": "claude-code",
  "event": "reflect_ok",
  "ms": 14210,
  "chars": 792,
  "query": "..."
}
```

`reflect_failed` / `pages_failed` record the error; if you're comparing memory-on vs memory-off,
check this file — a run whose reflects failed is a no-memory run. When the failure was a timeout or
a 5xx, the hook falls back to page search and, if no page matches, to a raw recall of the
bank's memories: `reflect_fallback_pages` / `reflect_fallback_observations` record what each
step returned (`*_failed` when it errored). Seed starts are logged as
`seed_started`.

When `autoInject` names a retrieval source instead of reflect, that source records its own
outcome with the number of items it returned: `inject_pages` for `"pages"`, `inject_recall` for
`"recall"` (`inject_pages_failed` / `inject_recall_failed` when the call errored). No reflect
event is written on those turns — nothing reflected.

**Tool usage** (is the agent using Hindsight?): one JSON line per finished user turn in
`~/.hindsight/coding-agents-logs/usage.jsonl` (override `HINDSIGHT_USAGE_FILE`) — the `hindsight_*`
tools the agent called during that turn, and whether its reply credited Hindsight memory ("From
Hindsight memory"). The credit rate counts only turns that called a retrieval tool (search, list,
read, reflect); saving a document is not expected to be credited. Recorded at the end of each turn,
whether or not `retainSessions` writes the session back. It never leaves your machine. Summarize it per agent with:

```bash
npx @vectorize-io/hindsight-coding-agents stats
```

### Is the memory ready yet?

`hindsight_sync_status` — the agent-facing tool, `dist/status.js` for scripts — answers exactly
that: `"synced": true` means the seeded memory is queryable. It also reports gitlog freshness, how
far per-commit deepening has got, the codebase survey's state (`surveyBaseline` is the HEAD the last
survey started from, `surveyDocs` counts the findings documents that have landed, 0–4 — a baseline
with no findings retries automatically, at most three times per commit), and the extraction
operations still in flight. A survey that was skipped (no survey for this agent, or its CLI not
found), failed to launch or exited with an error leaves one `[survey]` line in the plugin log.

### Resetting a repo's memory

Delete its bank on the server. The bank is the **only** state this integration keeps, so the next
session in that repo is a true first open — seed and survey run again from scratch. There are no
client-side files to clean up.

Deleting a bank cannot be undone, so an agent never does it on its own: it names the repo and what
would be lost, and the owner deletes the bank themselves from the control plane.

### Marker documents you may notice

Two document ids exist for the machinery's own bookkeeping. Both are safe to ignore and safe to
delete:

- `survey-baseline:<sha>` — reads "🛰️ researching…" while a codebase survey runs and flips to
  "✅ completed" once its findings land. It is retained under the `survey` strategy, whose marker
  rule extracts **nothing** from a status marker, and it drives the re-survey cadence
  (`surveyRefreshCommits`) and `surveyBaseline` in sync status.
- `gitlog:<repo>` — the aggregated commit-message seed document, oldest commit first. Once seeded it
  is kept current by **appending** only the commits since the one its `gitlog-head:<sha>` tag
  names, so a new commit costs the extraction of its own message, not of the whole log. It is
  written in full again (bounded by `seedLimit`) only when an append cannot describe HEAD: the
  recorded commit is no longer an ancestor of HEAD (a rebase, a force-push), more than `seedLimit`
  commits are new, or the server cannot append safely.

### When memory seems to be missing

Failures never break the agent: a reflect, page fetch or retain that fails degrades to an ordinary
memoryless turn and is recorded in the logs. "No memory" is therefore a log question — check the
diag file for whether `session_start` and `deepen_started` ever fired for that bank. A session that
was already running when the plugin was installed has no SessionStart behind it; its first prompt
after the install self-heals.
