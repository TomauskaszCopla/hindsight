---
name: hindsight-coding-agent
description: Store, retrieve, correct and configure the Hindsight coding-agent memory behind the 🧠 banner. Use when the user asks to store or remember something in Hindsight, asks what the memory or its pages are, wants to change memory settings for a repo (disable it, rename or share banks, git depth), or memory looks missing, stale or broken.
---

# Hindsight coding-agent memory

The `hindsight-coding-agents` plugin gives coding sessions long-term project memory, backed by a
Hindsight server. You are already connected to it. This skill covers what runs on its own, which
tools to call, and where the setup and troubleshooting details live.

## What runs on its own

- **Bank per repo:** each repository resolves to a memory bank, shown in the session banner as
  `↳ memory bank “coding-agent::<repo>”`. Worktrees share their main repository's bank.
- **Ingestion:** on first open, the plugin seeds the bank from recent commit messages and a
  read-only codebase survey. At each session start, a background job adds new commits and
  conversations and keeps the bank's pages current. There is no ingest command to run.
- **Session context:** by default, the first prompt of a session triggers one memory synthesis
  (`reflect`), injected into context. The `autoInject` setting changes the source: `pages` (page
  search hits), `recall` (recalled observations) or `none` (nothing injected; search the pages
  first and reflect only when they are too shallow).
- **Write-back:** the plugin saves the session transcript into the bank at session end. Plugin
  hosts (opencode, opencode 2, Kilo) also save it every turn. The user never needs to save a
  conversation.

## Store something on purpose

Choose the action by what is being kept:

- **This conversation:** tell the user it is saved automatically at session end. No tool call is
  needed.
- **An external document, notes or durable findings:** call
  `hindsight_ingest_document(title, content)`.
- **A new feature or initiative:** call `hindsight_capture_initiative(title, summary)` after the
  plan is agreed and before any code is written.
- **A material change to that plan** (goal, scope or rationale, including mid-implementation): call
  `hindsight_capture_initiative` again with `relates_to_page_id` set to the initiative's page id,
  and summarize the _current_ intent. This updates the same page; never create a second page for
  one initiative. Trivial course corrections do not count.

## Retrieve

- `hindsight_search_pages(query)`: search here first for project questions about components,
  conventions, past decisions and initiatives. It is a fast server-side hybrid search.
- `hindsight_list_pages` and `hindsight_read_page(page_id)`: list the pages, then read one in full.
- `hindsight_reflect(query)`: deep reasoning over the whole memory, for _why_ questions and exact
  decided values. It takes seconds, so use it when the pages are too shallow.

Memory is a past record. Check a claim that something was fixed or works against the code before
relying on it.

**Credit memory you use.** When anything from Hindsight reaches your reply, open that part with:

```markdown
> 🧠 **From Hindsight memory (<page>)** — <the specific facts you drew on>
```

For a `hindsight_reflect` answer, omit the page: `> 🧠 **From Hindsight memory** — <summary>`.
Never credit memory that did not contribute.

## Correct wrong or stale memory

When the code, git or an external source shows that something Hindsight served is wrong or
outdated, record a correction. Ignoring it silently leaves the same wrong claim for the next
session. Call `hindsight_ingest_document` with:

- **title:** `Correction: <topic>`, for example `Correction: retry policy 4xx set`.
- **content:** what memory claimed, what is true now, and the evidence you checked (file, commit or
  output). Quote exact values.

Newer facts supersede older ones in retrieval, so one clear correction outranks the stale memory.
Correct a wrong injected memory, a stale page claim or an outdated decision the same way.
