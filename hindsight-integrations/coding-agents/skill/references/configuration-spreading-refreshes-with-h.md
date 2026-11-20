<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Spreading refreshes with `H`

One `pageTriggerCron` is shared by every page in every repo you point this plugin at. So a literal
`"0 3 * * *"` does not schedule _a_ refresh at 03:00 — it schedules **all** of them at 03:00, five
pages per bank, on the same worker pool that serves retain. A session ingesting at 03:0x queues
behind the pile, and moving the hour just moves the pile.

Write a field as `H` and it is replaced, per page, by a value hashed from the bank id and the page
name. Each page gets its own slot, the same slot on every run:

| `pageTriggerCron`  | what each page gets                                    |
| ------------------ | ------------------------------------------------------ |
| `"H H * * *"`      | once a day, at its own minute and hour                 |
| `"H * * * *"`      | once an hour, at its own minute                        |
| `"H 3 * * *"`      | daily at 03:MM — spread inside the hour you chose      |
| `"H H(0-5) * * *"` | daily, spread across 00:00–05:59 only                  |
| `"0 3 * * *"`      | no `H`, no hashing — exactly what it says, all at once |

`H` is [Jenkins' syntax](https://www.jenkins.io/doc/book/pipeline/syntax/#cron-syntax) for the same
problem. It never reaches the API: the plugin resolves it to an ordinary cron expression
(`"41 17 * * *"`) when it creates the page, so the schedule you see in the control plane is a plain
one you can edit. Hashing spreads pages out, it does not partition them — two pages can still land
on the same minute, just not all of them.

**These settings apply to the pages a repo already has, too.** Every session compares each page
this plugin created — the seeded taxonomy and every captured initiative — against the config and
re-syncs the ones that differ, so a bank seeded before this default changed moves onto the hourly
schedule by itself, and a page you retriggered by hand in the control plane is put back on the
configured policy the next time an agent runs. The config
file is the source of truth for these pages: to give one a different schedule, change
`pageTriggerType`/`pageTriggerCron` (per bank, if it is only that repo) rather than editing the
page. Only the fields this plugin states are touched — a page's `mode`, its excluded siblings and
its minimum refresh interval are left exactly as they are.
