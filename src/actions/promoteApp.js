const core = require('@actions/core')

const maxRetries = 1000
const pollStatus = async (deploymentId, retry = 0) => {
  await new Promise((res) => setTimeout(res, 5000))
  if (retry >= maxRetries) {
    throw new Error('Max retries reached while polling deployment status')
  }
  const sevallaToken = core.getInput('sevalla-token')
  const resp = await fetch(`https://api.sevalla.com/v2/applications/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${sevallaToken}` },
  })
  if (!resp.ok) {
    return pollStatus(deploymentId, retry + 1)
  }
  const data = await resp.json()
  const status = data?.deployment?.status

  core.info(`Deployment status: ${status}`)
  if ([
    'success',
    'failed',
    'cancelled',
    'skipped',
  ].includes(status)) {
    if (status !== 'success') {
      throw new Error(`Deployment failed: status is ${status}`)
    }
  } else {
    return pollStatus(deploymentId, retry + 1)
  }
}

module.exports.promoteApp = async () => {
  const sevallaToken = core.getInput('sevalla-token')
  const sourceAppId = core.getInput('source-app-id')
  const targetAppIds = core.getInput('target-app-ids')
  const waitForFinish = core.getInput('wait-for-finish') !== 'false'

  if (!sevallaToken || !sourceAppId || !targetAppIds)
    throw new Error('sevalla-token, source-app-id, target-app-ids required')

  try {
    const resp = await fetch(`https://api.sevalla.com/v2/applications/promote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sevallaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_app_id: sourceAppId,
        target_app_ids: targetAppIds.split(',').map((id) => id.trim()),
      }),
    })
    if (!resp.ok) {
      throw new Error(`Promotion request failed: ${resp.status}`)
    }
    const data = await resp.json()

    const deploymentIds = data?.promote?.map(p => p.deployment_id) || []
    core.setOutput('deployment-ids', deploymentIds)

    if (waitForFinish && deploymentIds) {
      await Promise.all(deploymentIds.map(deploymentId => pollStatus(deploymentId)))
    }

    core.info('Promotion triggered successfully!')
  } catch (err) {
    core.setFailed(err.message)
  }
}
