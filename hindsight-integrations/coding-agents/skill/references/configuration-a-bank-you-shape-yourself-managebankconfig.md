<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## A bank you shape yourself — `manageBankConfig`

Pointed at a bank, this plugin gives it the shape its ingestion needs: retain strategies for the
kinds of document it writes (`git`, `gitlog`, `conversation`, `document`, `survey`), a `knowledge`
entity-label group that routes facts to the pages, and — on a bank that has no missions of
its own — the coding missions.

**It only ever adds what is missing.** A strategy you defined, an edit you made to one of the
plugin's, a reworded label group, a mission you rewrote in the control plane: each is left exactly
as it is, on every session, forever. What the bank already says wins. The cost of that promise is
that a plugin release which _rewords_ an existing strategy or label does not reach a bank that
already has it. To take the current default back, clear that override on the bank (delete the
strategy, or the whole `retain_strategies` entry, in the control plane): the next session finds the
bank silent there and seeds it again.

One field is the exception: the extraction mode of the plugin's own four strategies (`git`,
`gitlog`, `conversation`, `document`) follows `retainExtractionMode` and is put back on every session
if it drifts — the same way a seeded page's query is. Change it in `coding-agent.json`, not in the
control plane. The strategies' other fields, and your own strategies, are still left alone.

**Your own defaults for new banks — `defaultBankConfig`.** Everything the template does not name, a
bank the plugin creates gets from the server: auto-consolidation on, observations on, a 60s floor
between mental-model refreshes. With one bank per repo those are the settings that cost money, and
a new repo an agent touches spawns a new bank with all of them switched on — while every bank you had
hand-tuned in the control plane sits at a cheaper baseline. `defaultBankConfig` names the baseline
once, in the plugin's config, and it travels in the same import that creates the bank:

```json
{
  "defaultBankConfig": {
    "enable_observations": false,
    "enable_auto_consolidation": false,
    "mental_model_min_refresh_interval_seconds": 21600
  }
}
```

The keys are the bank-config API's own field names, passed straight through, so anything the
bank-config accepts can go here. They follow the same additive rule as the template: written only
where the bank is silent, so an existing bank picks them up on its next session **except** for the
fields it already sets — a value you chose in the control plane stays, even one equal to the server
default, and so does a value an earlier plugin release seeded (the template writes
`enable_observations: true` alongside the missions; clear that override on the bank to let your
default in). On a key the template also names, your default wins. The three fields the plugin
governs itself — `retain_strategies`, `entity_labels` and `retain_extraction_mode` — are refused
with a warning: the first two are merged entry by entry, the last is `retainExtractionMode`'s.

Set `manageBankConfig: false` to keep the plugin out of the bank's configuration altogether,
`defaultBankConfig` included — the right setting for a bank you share with non-coding work, or one
you configure yourself. That bank should then define the five strategies above itself. Note that the
miss is **silent**: the server does not reject a retain naming a strategy the bank lacks, it logs a
warning and extracts with the bank's own configuration — so a commit diff, a session transcript and
a survey marker would all get the same generic treatment instead of the extraction each needs.
Pages are seeded either way; `pageTriggerType` governs what they cost.

Like every field here it can be set per bank, which is usually where it belongs:

```json
{
  "bankId": "my-global-bank",
  "banks": { "my-global-bank": { "manageBankConfig": false } }
}
```
