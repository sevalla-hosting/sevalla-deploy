const core = require('@actions/core')

const initDeployment = async () => {
  const sevallaToken = core.getInput('sevalla-token')
  const appId = core.getInput('app-id')
  const branch = core.getInput('branch')
  const dockerImage = core.getInput('docker-image')
  const isRestart = core.getInput('is-restart') === 'true'
  const deployHookUrl = core.getInput('deploy-hook-url')

  try {
    if (deployHookUrl) {
      const resp = await fetch(deployHookUrl, { method: 'POST' })
      if (!resp.ok) {
        throw new Error(`Deploy hook request failed: ${resp.status}`)
      }
      const data = await resp.json()
      return data?.deployment?.id
    } else {
      if (!sevallaToken || !appId) throw new Error('sevalla-token and app-id are required')
      const params = {
        branch: branch ? branch : undefined,
        is_restart: isRestart !== undefined ? isRestart : undefined,
        docker_image: dockerImage ? dockerImage : undefined,
      }
      const resp = await fetch(`https://api.sevalla.com/v3/applications/${appId}/deployments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sevallaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
      if (!resp.ok) {
        throw new Error(`Deployment request failed: ${resp.status} - ${resp.statusText}`)
      }
      const data = await resp.json()
      return data.id
    }
  } catch (err) {
    core.setFailed(err.message)
  }
}

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

  core.info(`Deployment status: ${status}`)
  if (['success', 'failed', 'cancelled', 'skipped'].includes(status)) {
    if (status !== 'success') {
      throw new Error(`Deployment failed: status is ${status}`)
    }
  } else {
    return pollStatus(appId, deploymentId, retry + 1)
  }
}

module.exports.deployApp = async () => {
  const waitForFinish = core.getInput('wait-for-finish') !== 'false'
  const appId = core.getInput('app-id')

  const deploymentId = await initDeployment()
  if (deploymentId) {
    core.setOutput('deployment-id', deploymentId)
    core.info(`Deployment (id: ${deploymentId}) triggered successfully!`)
  }

  if (waitForFinish && deploymentId) {
    if (!appId) {
      core.warning('app-id is required for wait-for-finish when using deploy hooks. Skipping status polling.')
      return
    }
    try {
      await pollStatus(appId, deploymentId)
    } catch (e) {
      core.setFailed(e.message)
    }
  }
}
