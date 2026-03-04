const core = require('@actions/core')

const maxRetries = 1000
const pollStatus = async (appId, deploymentId, retry = 0) => {
  await new Promise((res) => setTimeout(res, 5000))
  if (retry >= maxRetries) {
    throw new Error('Max retries reached while polling deployment status')
  }
  const sevallaToken = core.getInput('sevalla-token')
  const resp = await fetch(`https://api.sevalla.com/v3/applications/${appId}/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${sevallaToken}` },
  })
  if (!resp.ok) {
    core.info(`Failed to fetch deployment status (id: ${deploymentId}) - ${resp.status}; ${resp.statusText}`)
    return pollStatus(appId, deploymentId, retry + 1)
  }
  const data = await resp.json()
  const status = data?.status

  core.info(`Deployment status on app (id: ${data?.app_id}): ${status}`)
  if (['success', 'failed', 'cancelled', 'skipped'].includes(status)) {
    if (status !== 'success') {
      throw new Error(`Deployment failed: status is ${status}`)
    }
  } else {
    return pollStatus(appId, deploymentId, retry + 1)
  }
}

module.exports.promoteApp = async () => {
  const sevallaToken = core.getInput('sevalla-token')
  const pipelineId = core.getInput('pipeline-id')
  const sourceAppId = core.getInput('source-app-id')
  const targetAppIds = core.getInput('target-app-ids')
  const waitForFinish = core.getInput('wait-for-finish') !== 'false'

  if (!sevallaToken || !pipelineId || !sourceAppId || !targetAppIds)
    throw new Error('sevalla-token, pipeline-id, source-app-id, target-app-ids required')

  const targetAppIdsArray = targetAppIds.split(',').map((id) => id.trim())

  try {
    const resp = await fetch(`https://api.sevalla.com/v3/pipelines/${pipelineId}/promote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sevallaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_app_id: sourceAppId,
        target_app_ids: targetAppIdsArray,
      }),
    })
    if (!resp.ok) {
      throw new Error(`Promotion request failed: ${resp.status} - ${resp.statusText}`)
    }
    const data = await resp.json()

    const promotions = Array.isArray(data) ? data : []
    const deploymentIds = promotions.map((p) => p.deployment_id)
    core.setOutput('deployment-ids', deploymentIds)

    if (waitForFinish && deploymentIds.length) {
      await Promise.all(
        promotions.map((p) => pollStatus(p.target_app_id, p.deployment_id)),
      )
    }

    core.info(`Promotion triggered successfully! Deployment ids: ${deploymentIds.join(', ')}`)
  } catch (err) {
    core.setFailed(err.message)
  }
}
