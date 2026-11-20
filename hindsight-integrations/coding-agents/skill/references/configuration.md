<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Configuration

Configuration is **one JSON file**: `~/.hindsight/coding-agent.json`. Layering, later wins per field:

1. built-in defaults
2. environment variables — `HINDSIGHT_API_URL`, `HINDSIGHT_API_TOKEN`, and one per scalar setting
   (`HINDSIGHT_<FIELD_IN_CAPS>`), for containers and CI that inject config rather than write a file
3. the file's top level
4. its `harnesses.<name>` section — per-agent override
5. its `paths.<prefix>` section — per-directory override, applied after the bank is resolved
   (see [Per-directory overrides](configuration-per-directory-overrides-paths-prefix.md#per-directory-overrides--pathsprefix))
6. its `banks.<resolvedBankId>` section — per-repo override, applied after the bank is resolved
   (see [Per-repo opt-in/out](configuration-per-repo-opt-in-out-banks-bankid.md#per-repo-opt-inout--banksbankid))

Environment variables are a **fallback**: the file wins wherever it sets a value, so adding env to
an existing setup changes nothing. The two list-valued settings, `retainTags` and `optInPaths`, take
a comma-separated value (`HINDSIGHT_RETAIN_TAGS="project:{gitProject},env:work"`); entries are
trimmed and blanks dropped.
The map-valued settings (`mapPathToBank`, `harnesses`, `paths`, `banks`, `retainMetadata`) are file-only —
per-key branching doesn't survive flattening into one variable. `maxParallelRetains` is available
as `HINDSIGHT_MAX_PARALLEL_RETAINS` for containers and CI.

`HINDSIGHT_CONFIG` moves the file itself — point it at another path for a container or a test
harness where `$HOME` is not the right anchor. It is still exactly one file; only its location
changes. (The other variables that are not settings are `HINDSIGHT_LOG_FILE`, `HINDSIGHT_DIAG_FILE`,
`HINDSIGHT_USAGE_FILE` and `HINDSIGHT_LOG_LEVEL` — see [Diagnostics & logging](diagnostics-logging.md#diagnostics--logging).)
