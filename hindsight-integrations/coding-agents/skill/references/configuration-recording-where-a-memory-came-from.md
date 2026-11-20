<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Recording where a memory came from

With a bank per repo, the bank _is_ the answer to "where did this come from". On a deliberately
**shared** bank — one bank holding cross-project knowledge so facts recall everywhere — it isn't:
every memory looks alike. `retainTags` and `retainMetadata` stamp that provenance onto conversations,
git history and diffs, survey lifecycle documents, initiative markers, and documents saved through
`hindsight_ingest_document`:

```jsonc
{
  "bankId": "shared", // one bank for everything
  "retainTags": ["project:{gitProject}", "env:work"],
  "retainMetadata": { "repo": "{gitProject}" },
}
```

Recalls can then filter by `project:<repo>`, and every document shows which repository it came out
of. Both accept the same placeholders as `bankIdTemplate` — `{gitProject}`, `{project}`,
`{harness}`, `{channel}`, `{user}` — plus `{bankId}`, `{sessionId}` and `{timestamp}`.
`{gitProject}` is worktree-aware here too, so every linked worktree of a repo stamps one name.
`{sessionId}` resolves to `unknown` for documents that do not originate from an agent session.

The plugin's own `source:` and `harness:` tags are reserved: entries in those namespaces are ignored
with a warning, so a document's agent attribution always reflects the agent that actually wrote it.
