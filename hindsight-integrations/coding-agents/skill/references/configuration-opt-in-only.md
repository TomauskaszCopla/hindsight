<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Opt-in only

By default every project gets memory — that is what makes the plugin zero-setup. If you would
rather nothing be remembered until you say so, turn memory off everywhere and name the projects
that may use it:

```jsonc
{
  "optInOnly": true,
  "optInPaths": ["~/work/client-x", "~/oss"],
}
```

Anything outside those paths is **inert**: no bank is created, nothing is retained, no seed runs,
and the agent behaves exactly as it would without the plugin. Approving costs nothing else —
`optInPaths` says _which projects_, not _which bank_, so an approved repo keeps its usual
`coding-agent::{gitProject}` name. Paths are prefixes, so approving `~/work` approves every repo
under it while each still gets its own bank.

A `mapPathToBank` entry counts as opted in too, since routing a path to a named bank already
declares that project. A bare `bankId` does not: it names a bank rather than a project, so it
cannot say which work may be remembered, and a privacy switch has to fail closed.

There is no per-repo opt-in file, for the same reason there is no repo-carried config at all: a
cloned repository must not be able to turn memory on.

There is deliberately no repo-carried config file — per-repo bank routing is `mapPathToBank`,
per-agent differences are `harnesses.<name>`.

Each entry point knows which harness it _is_ (the opencode plugin is loaded by opencode, the codex
hook by Codex...), so one shared config serves several agents side by side:

```jsonc
{
  "apiUrl": "https://api.hindsight.vectorize.io",
  "harnesses": {
    "opencode": { "reflectTimeoutMs": 60000 },
    "claude-code": { "disabled": true }, // e.g. memory off for Claude only
  },
}
```
