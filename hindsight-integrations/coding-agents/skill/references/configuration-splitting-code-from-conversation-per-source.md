<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Splitting code from conversation — `per_source`

`shared` puts every document a repo produces into one belief set. `"per_source"` keeps that set and
adds one per origin, so "what the commits say" and "what was decided in conversation" can be asked
apart:

```jsonc
{ "observationScopes": "per_source" }
```

Each document consolidates into the global scope **plus** one named for each `source:` tag it
carries — `[[], ["source:chat"]]` for a session transcript, `[[], ["source:git"]]` for a commit
diff. Read an axis back with `tags: ["source:git"], tags_match: "exact"`, and the merged view with
`tags: [], tags_match: "exact"`.

A document carrying two `source:` tags gets a scope for each, and that is deliberate rather than
duplication. The commit-message seed is tagged `source:git` and `source:git-log`, so
`source:git-log` is fed only by the seed — what the commit _messages_ say — while `source:git` also
collects every per-commit diff under `gitIngest: "full"`. Two questions, two answers, each
deduplicated within itself by consolidation. A fact belonging to more than one axis is the point.

This cannot be expressed as a scope list. The server treats an explicit `list[list[str]]` as
unconditional — it is not filtered against the memory's own tags — so a configured
`[[], ["source:git"], ["source:chat"]]` writes every document into all three, and the `source:git`
scope fills with beliefs built from chat transcripts. Only a per-document decision separates them.

It costs one extra consolidation pass per document, and it reads only `source:`, so a volatile
provenance tag never becomes a scope. The global scope is still written first and unchanged, so the
untagged observations pages read are unaffected.

`"per_tag"` and `"all_combinations"` split further still, and an explicit `[["project:demo"], …]`
declares the scopes literally. `HINDSIGHT_OBSERVATION_SCOPES` sets the scalar modes; a scope list is
file-only. Changing this does not rewrite observations already consolidated under the old scoping —
they stay where they were built, and new work accrues under the new setting.
