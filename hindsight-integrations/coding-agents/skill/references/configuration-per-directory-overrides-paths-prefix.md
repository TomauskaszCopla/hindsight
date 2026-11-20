<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Per-directory overrides — `paths.<prefix>`

When a folder is the boundary for something other than the bank — typically a different server
or tenant for client work — key the override by directory instead of by bank id:

```jsonc
{
  "apiToken": "personal-key",
  "paths": {
    "~/work/client-x": { "apiToken": "client-x-key" },
    "~/work/acme": { "apiUrl": "https://hindsight.acme.internal", "apiToken": "acme-key" },
    "~/oss": { "serverMode": "daemon" },
  },
}
```

Every repo under the prefix, present and future, keeps its own bank but uses the entry's
settings. The longest matching prefix wins, and a linked worktree outside the tree uses its main
checkout's entry, as with `mapPathToBank`. The section applies after bank resolution and before
`banks.<bankId>`, so a bank section still wins for its one repo. Bank-resolution and approval
fields (`bankId`, `mapPathToBank`, `bank`, `optInOnly`, `optInPaths`, ...) are ignored inside a
path section. Any connection setting can be overridden — `serverMode`, `apiUrl`, `apiPort`,
`apiToken` — so one directory can use a local daemon while another uses Cloud or a self-hosted
server. The token is re-read on a rejected request, like the top-level `apiToken`, but only while
the directory still points at the same server.
