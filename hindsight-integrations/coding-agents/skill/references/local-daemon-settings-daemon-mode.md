<!-- GENERATED from README.md (its skill:begin regions).
     Edit README.md, then run: npm run skill:build -->

## Local daemon settings (daemon mode)

Daemon settings keep the names the old per-agent Claude Code plugin used, so an existing
environment carries over unchanged:

| field               | env                             | default        | meaning                                                    |
| ------------------- | ------------------------------- | -------------- | ---------------------------------------------------------- |
| `serverMode`        | `HINDSIGHT_SERVER_MODE`         | `cloud`        | `cloud` \| `self-hosted` \| `daemon`                       |
| `apiPort`           | `HINDSIGHT_API_PORT`            | `9077`         | port the local daemon listens on                           |
| `daemonIdleTimeout` | `HINDSIGHT_DAEMON_IDLE_TIMEOUT` | —              | deprecated, ignored: the daemon no longer exits on its own |
| `daemonProfile`     | `HINDSIGHT_DAEMON_PROFILE`      | `coding-agent` | which local database it uses                               |
| `embedVersion`      | `HINDSIGHT_EMBED_VERSION`       | `latest`       | which `hindsight-embed` release to run                     |
| `embedPackagePath`  | `HINDSIGHT_EMBED_PACKAGE_PATH`  | —              | run a local checkout instead (development)                 |

Any `HINDSIGHT_API_*` variable you export is forwarded to the daemon, so server-side settings need
no equivalent here.
