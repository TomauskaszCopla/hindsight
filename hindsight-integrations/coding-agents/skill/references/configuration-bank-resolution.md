<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Bank resolution

Coding memory is **per repository**. Resolution order for the working directory:

1. `mapPathToBank` — longest matching absolute-path prefix (mapping a repo root covers every
   subdirectory; deeper mappings win; overrides even an explicit `bankId`).
2. Static — `bankId` set (or `dynamicBankId: false`).
3. Dynamic — `bankIdTemplate` with placeholders:
   - `{gitProject}` — worktree-aware repo name: `git rev-parse --git-common-dir` resolves every
     linked worktree to the **main** worktree's basename, so all worktrees of a repo share one bank
     (bare repos use the bare dir name). **Outside a repo** there is nothing for git to resolve, so
     it falls back to the basename of the directory the **session started in** — an agent that
     `cd`s into a subdirectory keeps writing to one bank, and a subdirectory gets its own bank only
     when you deliberately start a session there
   - `{project}` — plain working-directory basename
   - `{harness}` — the entry point asking (`opencode`, `claude-code`, `codex`, `antigravity-cli`, `cursor-cli`, `copilot-cli`)
   - `{channel}` / `{user}` — `$HINDSIGHT_CHANNEL_ID` / `$HINDSIGHT_USER_ID`

The default `"coding-agent::{gitProject}"` is **harness-neutral**, so opencode, Claude Code, and Codex
all share one memory per repo — use `"{harness}-{gitProject}"` to split per agent instead.

The bank is resolved on every turn from where the agent is working. A session that moves into a
directory with a different bank (say, `cd` across a `mapPathToBank` prefix) **follows the folder from
that turn on**: the new bank gets the turns from the move onward, never the ones already saved
elsewhere, and going back appends to the conversation the first bank already holds. Each move is
logged as a warning in `plugin.log`.
