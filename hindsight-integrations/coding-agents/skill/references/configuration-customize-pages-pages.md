<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Customize Pages — `pages`

Every repo gets the same five pages. They are a **taxonomy**, not a summary of your source: each one
is synthesized from what the bank ingested — commit history and past conversations — and each is
pinned to one knowledge tier, so a page draws only on the facts the extractor routed to it.

| Page                           | What it answers                                                                                         | Tier tag                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| `Component map`                | the main components/modules/subsystems, what each is responsible for, and how they depend on each other | `knowledge:component`    |
| `Core concepts`                | the domain abstractions and key entities — the vocabulary a developer has to know                       | `knowledge:concept`      |
| `Conventions and patterns`     | how THIS project does things: testing, error handling, naming, structure, how changes are made          | `knowledge:convention`   |
| `Key decisions and rationale`  | the significant technical decisions and the durable "why we do it this way" behind them                 | `knowledge:decision`     |
| `Initiatives and enhancements` | the major initiatives and features over time, linking out to each captured initiative's own page        | `knowledge:feature-work` |

`pages` says which of them to seed and what each one asks. Keys are the page names above, matched
ignoring case and surrounding spaces:

```jsonc
{
  "pages": {
    // don't seed this page at all
    "Component map": false,
    // seed it, but ask your question instead of the built-in one
    "Key decisions and rationale": {
      "source_query": "What did we decide about data retention, encryption and PII handling, and why? Prefer decisions that constrain what new code may do.",
    },
  },
}
```

Omit `pages` entirely — the default — and all five are seeded with their built-in queries.

**Fewer pages.** Each page costs one LLM synthesis per refresh, so a repo that only wants the
architecture ones turns the rest off:

```jsonc
{
  "pages": {
    "Initiatives and enhancements": false,
    "Conventions and patterns": false,
    "Key decisions and rationale": false,
  },
}
```

**Per repo**, like every other field — usually where this belongs, since what a page should ask is a
property of the project, not of your machine:

```jsonc
{
  "banks": {
    "coding-agent::payments-api": {
      "pages": {
        "Core concepts": {
          "source_query": "What are the payment domain's entities — orders, ledgers, settlement states — and what does each mean in OUR model?",
        },
      },
    },
  },
}
```

Four things worth knowing before you reach for it:

- **This is the only durable way to reword a page.** Every session compares each seeded page against
  the query it is configured to have and re-syncs the ones that differ, so a `source_query` edited
  through the API or the control plane is replaced the next time an agent runs. Setting it here makes
  your wording the configured one. When a re-sync does replace a query, the plugin now says which
  page in the plugin log rather than doing it silently.
- **Your query still gets the scoping clause.** The sentence that keeps a dependency's decisions off
  your project's page is appended to a custom query too — a bank holds facts about the libraries and
  services a repo merely uses, and without that clause a page will present them as yours.
- **The tier tag stays the taxonomy's.** It selects which facts the synthesis reads; rewording the
  question changes what is asked of those facts, not which ones are in scope.
- **`false` does not delete anything.** A page already seeded keeps its content and simply stops
  being re-synced — remove it in the control plane if you want it gone.

A name that matches no page above is ignored with a warning in the plugin log, so a typo fails
loudly instead of looking like it disabled something. Adding pages of your own is not what this
setting is for: the agent's `hindsight_capture_initiative` tool already creates pages, one per
initiative, each with its own query.

### Pages of your own — `customPages`

`pages` only reworks the five above. To add a page, name it under `customPages`:

```jsonc
{
  "customPages": {
    "Security posture": {
      "source_query": "What are this project's security decisions — authn, secrets handling, PII, dependency policy — and what do they constrain in new code?",
      "tags": ["knowledge:decision"],
    },
    "Operational runbook": {
      "source_query": "How does this project get deployed, monitored and rolled back? What has broken in production, and what fixed it?",
    },
  },
}
```

`source_query` is required. `tags` is optional and picks which facts feed the page — one of the tier
tags above, or any tag you stamp on your own writes with `retainTags`. Omit it and the page draws on
everything the bank holds: a refresh matches tags with `all`, so no tags means no tag constraint,
**not** an empty page.

Your pages are seeded at the same root as the taxonomy, on the same refresh schedule, and re-synced
from the config the same way — reword one here and the live page follows on the next session. They
compose with `pages`, so trading two built-ins for one of your own is just both settings at once.

**Why it is a separate setting.** `pages` refuses a name that matches no seeded page, and that is
what makes a typo loud: if an unknown key there meant "create this page", `"Componnet map"` would
quietly create an empty second page instead of rewording the one you meant. For the same reason,
naming a seeded page under `customPages` is refused — reword it under `pages`.

A page you create yourself in the control plane is a third thing again, and the plugin never touches
it: the seed pass only visits the pages it is configured to own.
