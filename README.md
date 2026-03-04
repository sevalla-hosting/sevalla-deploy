<div align="center">

# Sevalla GitHub Action

**Deploy and promote Sevalla apps and static sites from GitHub Actions.**

[![CI](https://github.com/sevalla-hosting/sevalla-deploy/actions/workflows/ci.yml/badge.svg)](https://github.com/sevalla-hosting/sevalla-deploy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Sevalla API](https://img.shields.io/badge/Sevalla_API-v3-FF6723)](https://api-docs.sevalla.com)

</div>

---

A GitHub Action that triggers deployments and promotions on [Sevalla](https://sevalla.com) infrastructure. Supports application deployments (via API token or deploy hook), static site deployments, and pipeline promotions with optional polling until completion.

## Quick Start

```yaml
- uses: sevalla-hosting/sevalla-deploy@v2.0.0
  with:
    action: deploy-app
    sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
    app-id: your-app-id
    wait-for-finish: true
```

Get your API key from [app.sevalla.com/api-keys](https://app.sevalla.com/api-keys).

## Inputs

| Name | Required | Description |
| --- | --- | --- |
| `action` | Yes | `deploy-app`, `promote-app`, or `deploy-static-site` |
| `sevalla-token` | Yes* | Sevalla API token |
| `app-id` | — | Application ID (for `deploy-app`) |
| `static-site-id` | — | Static site ID (for `deploy-static-site`) |
| `pipeline-id` | — | Pipeline ID (for `promote-app`) |
| `source-app-id` | — | Source application ID (for `promote-app`) |
| `target-app-ids` | — | Comma-separated target app IDs (for `promote-app`) |
| `branch` | — | Git branch to deploy |
| `docker-image` | — | Docker image to deploy |
| `is-restart` | — | Restart without building (`true`/`false`, default `false`) |
| `wait-for-finish` | — | Poll until deployment completes (`true`/`false`, default `false`) |
| `deploy-hook-url` | — | Deploy hook URL (alternative to `sevalla-token` + `app-id`) |

*Not required when using `deploy-hook-url` without `wait-for-finish`.

## Outputs

| Name | Description |
| --- | --- |
| `deployment-id` | Deployment ID (for `deploy-app` and `deploy-static-site`) |
| `deployment-ids` | Deployment IDs (for `promote-app`) |

## Examples

### Deploy an App

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla-hosting/sevalla-deploy@v2.0.0
        with:
          action: deploy-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          app-id: your-app-id
          branch: main
          wait-for-finish: true
```

### Deploy via Deploy Hook

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla-hosting/sevalla-deploy@v2.0.0
        with:
          action: deploy-app
          deploy-hook-url: ${{ secrets.DEPLOY_HOOK_URL }}
```

### Deploy a Docker Image

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla-hosting/sevalla-deploy@v2.0.0
        with:
          action: deploy-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          app-id: your-app-id
          docker-image: registry.example.com/app:latest
          wait-for-finish: true
```

### Promote via Pipeline

```yaml
jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla-hosting/sevalla-deploy@v2.0.0
        with:
          action: promote-app
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          pipeline-id: your-pipeline-id
          source-app-id: staging-app-id
          target-app-ids: production-app-id
          wait-for-finish: true
```

### Deploy a Static Site

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: sevalla-hosting/sevalla-deploy@v2.0.0
        with:
          action: deploy-static-site
          sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
          static-site-id: your-static-site-id
          branch: main
          wait-for-finish: true
```

## How It Works

```
GitHub Actions Workflow
       │
       │  action: deploy-app | promote-app | deploy-static-site
       ▼
┌─────────────────────────────┐
│  sevalla-deploy             │
│                             │
│  1. Trigger deployment      │──▶ POST /v3/applications/{id}/deployments
│  2. Poll until complete     │──▶ GET  /v3/applications/{id}/deployments/{id}
│  3. Output deployment ID    │
└─────────────────────────────┘
```

When `wait-for-finish` is enabled, the action polls every 5 seconds until the deployment reaches a terminal status (`success`, `failed`, `cancelled`, or `skipped`). The action fails if the deployment doesn't succeed.

## License

[MIT](LICENSE)
