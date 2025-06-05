# Sevalla GitHub Action

**Easily deploy and promote Sevalla apps and static sites directly from your GitHub workflow.**

## Features

- Trigger Sevalla app deployment (via token or deploy hook)
- Promote deployments between Sevalla apps
- Deploy static sites
- Wait for deployment to finish (optional)
- Outputs deployment/promotion ID

## Inputs

| Name                | Required | Description                                       |
|---------------------|----------|---------------------------------------------------|
| action              | Yes      | deploy-app, promote-app, or deploy-static-site    |
| sevalla-token       | Optional | Sevalla API token                                 |
| app-id              | Optional | App ID for deployment                             |
| static-site-id      | Optional | Static Site ID for deployment                     |
| source-app-id       | Optional | Source App ID for promotion                       |
| target-app-ids      | Optional | Comma separated list of target App IDs (promotion)|
| branch              | Optional | Branch to deploy                                  |
| docker-image        | Optional | Docker image to deploy                            |
| is-restart          | Optional | true/false: Restart after deployment              |
| wait-for-finish     | Optional | true/false: Wait for process to finish            |
| deploy-hook-url     | Optional | Use app deploy hook instead of token/app-id       |

## Example Workflows

### Deploy an App

```yaml
- uses: sevalla-hosting/sevalla-deploy@v1.0.0
  with:
    action: deploy-app
    sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
    app-id: app_123
    branch: main
    is-restart: false
    wait-for-finish: true
```

### Deploy via Deploy Hook

```yaml
- uses: sevalla-hosting/sevalla-deploy@v1.0.0
  with:
    action: deploy-app
    deploy-hook-url: https://api.sevalla.com/hooks/xyz
    wait-for-finish: true
```

### Promote an App

```yaml
- uses: sevalla-hosting/sevalla-deploy@v1.0.0
  with:
    action: promote-app
    sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
    source-app-id: app_123
    target-app-ids: app_456,app_789
    wait-for-finish: true
```

### Deploy a Static Site

```yaml
- uses: sevalla-hosting/sevalla-deploy@v1.0.0
  with:
    action: deploy-static-site
    sevalla-token: ${{ secrets.SEVALLA_TOKEN }}
    static-site-id: ss_123
    branch: main
    wait-for-finish: true
```

## Outputs

| Name                | Description                                       |
|---------------------|---------------------------------------------------|
| deployment-id       | ID of the deployment (for deploy-app)             |
| promotion-id        | ID of the promotion (for promote-app)             |
| static-site-id      | ID of the static site deployment (for deploy-static-site) |
| error               | Error message if any operation fails              |

## Error Handling
If any operation fails, the action will output an error message in the `error` output variable. You can use this to handle errors in your workflow.
## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
## Contributing
We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.
