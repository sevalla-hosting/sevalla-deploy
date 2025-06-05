const core = require('@actions/core')

module.exports.promoteApp = async () => {
  const sevallaToken = core.getInput('sevalla-token')
  const sourceAppId = core.getInput('source-app-id')
  const targetAppIds = core.getInput('target-app-ids')
  const waitForFinish = core.getInput('wait-for-finish') !== 'false'

  if (!sevallaToken || !sourceAppId || !targetAppIds)
    throw new Error('sevalla-token, source-app-id, target-app-ids required')

  try {
    const resp = await fetch(`https://api.sevalla.com/v2/apps/${sourceAppId}/promote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sevallaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetAppIds: targetAppIds.split(',').map((id) => id.trim()),
      }),
    })
    if (!resp.ok) {
      throw new Error(`Promotion request failed: ${resp.status}`)
    }
    const data = await resp.json()

    const promotionId = data?.id
    core.setOutput('promotion-id', promotionId)

    if (waitForFinish && promotionId) {
      let finished = false
      while (!finished) {
        await new Promise((res) => setTimeout(res, 5000))
        const statusResp = await fetch(`https://api.sevalla.com/v2/promotions/${promotionId}`, {
          headers: {
            Authorization: `Bearer ${sevallaToken}`,
          },
        })
        if (!statusResp.ok) {
          throw new Error(`Polling promotion failed: ${statusResp.status}`)
        }
        const statusData = await statusResp.json()
        const status = statusData?.status
        core.info(`Promotion status: ${status}`)
        if (['finished', 'failed', 'error', 'succeeded'].includes(status)) {
          finished = true
          if (status !== 'succeeded' && status !== 'finished') {
            throw new Error(`Promotion failed: status is ${status}`)
          }
        }
      }
    }

    core.info('Promotion triggered successfully!')
  } catch (err) {
    core.setFailed(err.message)
  }
}
