# CodeforcesSync Documentation

## Table of Contents

### Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture](Architecture.md) | Module design, data flow, dependency graph, key decisions |
| [OAuth](OAuth.md) | GitHub OAuth flow, PKCE, security measures, threat model |
| [GitHub Integration](GitHub-Integration.md) | GitHub REST API client, file upload, rate limiting, timeouts |
| [Codeforces Integration](Codeforces-Integration.md) | Codeforces API, RSS feed, dual-tier source fetching |
| [Sync Engine](Sync-Engine.md) | Sync cycle, deduplication, retry, error handling |
| [Statistics](Statistics.md) | Streak calculation, weekly calendar, CF statistics |
| [Caching](Caching.md) | Client-side caching strategy, TTLs, API throttling |

### Operations

| Document | Description |
|----------|-------------|
| [Deployment](Deployment.md) | OAuth broker deployment, environment variables, build and distribute |
| [Development](Development.md) | Setup, build scripts, project structure, debugging |
| [Release Guide](Release-Guide.md) | Versioning, release process, automated releases |

### Reference

| Document | Description |
|----------|-------------|
| [Repository Validation](Repository-Validation.md) | URL normalization, input validation, accepted formats |
| [Security](Security.md) | Token storage, OAuth security, permissions, threat model |
| [Troubleshooting](Troubleshooting.md) | Common issues, debugging guides |
| [FAQ](FAQ.md) | Frequently asked questions |
| [Roadmap](Roadmap.md) | Planned features and improvements |

### Engineering

| Document | Description |
|----------|-------------|
| [Engineering Constitution](ENGINEERING_CONSTITUTION.md) | Project rules and standards for contributors |
| [Architecture Migration](AMS.md) | 12-phase migration plan (completed) |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [ADR/0001-browser-adapter.md](ADR/0001-browser-adapter.md) | Browser API abstraction via `BrowserAdapter` interface |
| [ADR/0002-storage-abstraction.md](ADR/0002-storage-abstraction.md) | Storage module with schema versioning and migrations |
