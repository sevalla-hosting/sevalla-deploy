const core = require('@actions/core')
const { deployApp } = require('./actions/deployApp')
const { promoteApp } = require('./actions/promoteApp')
const { deployStaticSite } = require('./actions/deployStaticSite')

async function run() {
  try {
    const action = core.getInput('action')

    if (action === 'deploy-app') {
      await deployApp()
    } else if (action === 'promote-app') {
      await promoteApp()
    } else if (action === 'deploy-static-site') {
      await deployStaticSite()
    } else {
      core.setFailed(`Unknown action: ${action}`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
