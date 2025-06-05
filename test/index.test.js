const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

let originalCore
let originalDeployApp
let originalPromoteApp
let originalDeployStatic

beforeEach(() => {
  originalCore = require('@actions/core')
  originalDeployApp = require('../src/actions/deployApp').deployApp
  originalPromoteApp = require('../src/actions/promoteApp').promoteApp
  originalDeployStatic = require('../src/actions/deployStaticSite').deployStaticSite
})

afterEach(() => {
  require.cache[require.resolve('@actions/core')].exports = originalCore
  require('../src/actions/deployApp').deployApp = originalDeployApp
  require('../src/actions/promoteApp').promoteApp = originalPromoteApp
  require('../src/actions/deployStaticSite').deployStaticSite = originalDeployStatic
  delete require.cache[require.resolve('../src/index')]
})

test('run selects deploy-app', async () => {
  let called = false
  require('../src/actions/deployApp').deployApp = async () => { called = true }
  const inputs = { action: 'deploy-app' }
  const coreMock = { getInput: (n) => inputs[n], setFailed: () => {} }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { run } = require('../src/index')
  await run()
  assert(called)
})

test('run unknown action', async () => {
  const logs = []
  const inputs = { action: 'other' }
  const coreMock = { getInput: (n) => inputs[n], setFailed: (m) => logs.push(m) }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { run } = require('../src/index')
  await run()
  assert.deepEqual(logs, ['Unknown action: other'])
})

test('run handles action error', async () => {
  const logs = []
  require('../src/actions/deployApp').deployApp = async () => { throw new Error('boom') }
  const inputs = { action: 'deploy-app' }
  const coreMock = { getInput: (n) => inputs[n], setFailed: (m) => logs.push(m) }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { run } = require('../src/index')
  await run()
  assert.deepEqual(logs, ['boom'])
})


test('run selects promote-app', async () => {
  let called = false
  require('../src/actions/promoteApp').promoteApp = async () => { called = true }
  const inputs = { action: 'promote-app' }
  const coreMock = { getInput: (n) => inputs[n], setFailed: () => {} }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { run } = require('../src/index')
  await run()
  assert(called)
})

test('run selects deploy-static-site', async () => {
  let called = false
  require('../src/actions/deployStaticSite').deployStaticSite = async () => { called = true }
  const inputs = { action: 'deploy-static-site' }
  const coreMock = { getInput: (n) => inputs[n], setFailed: () => {} }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { run } = require('../src/index')
  await run()
  assert(called)
})
