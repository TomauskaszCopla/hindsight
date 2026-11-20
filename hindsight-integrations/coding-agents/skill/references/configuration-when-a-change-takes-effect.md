<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## When a change takes effect

Config is read when a process starts — the file is not watched — so when an edit applies depends on
what reads it:

| host                                                                                                        | reads the file                                                      | an edit applies            |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| hook harnesses (Claude Code, Codex CLI, Cursor CLI, GitHub Copilot CLI, Grok Build, Antigravity CLI, Devin) | once per hook invocation — each hook is its own short-lived process | on your next prompt        |
| persistent plugins (opencode, opencode 2, Kilo CLI, Cline CLI, pi, Prime Agent, DeepSeek Harness)           | once per workspace, when the host loads the plugin                  | after restarting the agent |
| the MCP server behind the `hindsight_*` tools                                                               | once at startup                                                     | in your next session       |

`apiToken` is the exception. Every host re-reads it when the server rejects a request, so enabling
authentication or rotating the key is picked up on the next call with nothing to restart —
otherwise a rotation would leave a long-running agent failing every memory call until it was
restarted. Everything else follows the table: `apiUrl`, `disabled`, bank routing, `gitIngest`, and
the survey and page settings.

`hindsight_diagnose` reports both sides of that gap — what the file says now, and what the running
client is actually using.
