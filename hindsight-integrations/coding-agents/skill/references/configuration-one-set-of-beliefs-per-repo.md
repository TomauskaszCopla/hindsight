<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## One set of beliefs per repo

Every document this integration writes carries provenance tags — `source:chat`, `harness:<id>`,
`knowledge:<kind>`, plus anything from `retainTags`. Those tags say **who wrote** a memory; they are
what filters recall and draws each document's agent logo, and they stay on the facts.

They are not, however, a good boundary for
[observations](https://hindsight.vectorize.io/developer/observations). Consolidation's own
default (`combined`) builds one observation set per distinct tag set, so the same repository
worked on by two agents would grow two parallel sets of beliefs — one per harness — that never
merge, each blind to the other, at double the consolidation cost. Which agent happened to be typing
does not change whether a convention or a decision is true.

So the integration retains with `observationScopes: "shared"`: one global, untagged observation
scope per bank, which is what a bank already is — one project's memory. Set the field to change it:

```jsonc
{
  "observationScopes": "combined", // one observation set per distinct tag set (server default)
  "banks": {
    "coding-agent::mono": { "observationScopes": "per_tag" }, // per-repo, like any behavioral field
  },
}
```
