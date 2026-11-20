<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Install / update

```bash
npx @vectorize-io/hindsight-coding-agents install all          # every detected agent, wired natively
npx @vectorize-io/hindsight-coding-agents install claude-code  # or just one
npx @vectorize-io/hindsight-coding-agents uninstall all        # removes exactly what install added
npx @vectorize-io/hindsight-coding-agents update               # refresh the runtime only, no rewiring
npx @vectorize-io/hindsight-coding-agents stats                # how often each agent uses Hindsight
```

`install` takes an explicit target — `all`, or one or more harness names. A bare
`npx @vectorize-io/hindsight-coding-agents install` changes nothing and prints the choice, so wiring every agent on
the machine is never something that happens by accident. **Updating is the same `install`
command again** — it re-copies the runtime in place.

Day to day you should not have to: once a day, a session start checks npm and re-stages a newer
runtime in the background (`autoUpdate`, on by default — set it to `false` to pin the version you
have). That is the `update` command above, which refreshes the copy every wired agent already
points at and deliberately touches no host config; re-run `install` yourself after a release that
adds a new hook, or to wire another agent.
