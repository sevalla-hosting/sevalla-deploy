const core = require('@actions/core')

const initDeployment = async () => {
  try {
    const sevallaToken = core.getInput('sevalla-token')
    const staticSiteId = core.getInput('static-site-id')
    const branch = core.getInput('branch')

    const res = await fetch(`https://api.sevalla.com/v2/static-sites/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sevallaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branch, static_site_id: staticSiteId }),
    })

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const data = await res.json()
    return data?.deployment?.id
  } catch (err) {
    core.setFailed(err.message)
  }
}

const maxRetries = 1000
const pollStatus = async (deploymentId, retry = 0) => {
  await new Promise((res) => setTimeout(res, 5000))
  if (retry >= maxRetries) {
    throw new Error('Max retries reached while polling deployment status')
  }

  const sevallaToken = core.getInput('sevalla-token')
  const resp = await fetch(`https://api.sevalla.com/v2/static-sites/deployments/${deploymentId}`, {
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
  ].includes(status)) {
    if (status !== 'success') {
      throw new Error(`Deployment failed: status is ${status}`)
    }
  } else {
    return pollStatus(deploymentId, retry + 1)
  }
}

module.exports.deployStaticSite = async () => {
  const waitForFinish = core.getInput('wait-for-finish') !== 'false'

  const deploymentId = await initDeployment()
  if (deploymentId) {
    core.setOutput('deployment-id', deploymentId)
    core.info('Deployment triggered successfully!')
  }

  if (waitForFinish && deploymentId) {
    try {
      await pollStatus(deploymentId)
    } catch (e) {
      core.setFailed(e.message)
    }
  }
}
