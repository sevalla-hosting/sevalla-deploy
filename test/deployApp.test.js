const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

let originalCore
let originalFetch
let originalTimeout

beforeEach(() => {
  originalCore = require('@actions/core')
  originalFetch = global.fetch
  originalTimeout = global.setTimeout
})

afterEach(() => {
  require.cache[require.resolve('@actions/core')].exports = originalCore
  global.fetch = originalFetch
  global.setTimeout = originalTimeout
  for (const mod of ['../src/actions/deployApp']) {
    delete require.cache[require.resolve(mod)]
  }
})

test('deploy app via deploy hook', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'deploy-hook-url': 'http://hook',
    'wait-for-finish': 'false',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock

  global.fetch = async () => ({
    ok: true,
    json: async () => ({ deploymentId: 'dep1' }),
  })

  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, [])
  assert.deepEqual(logs.output, [['deployment-id', 'dep1']])
})

test('deploy app waits for finish', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'app-id': 'app1',
    'wait-for-finish': 'true',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock

  let call = 0
  global.fetch = async () => {
    call++
    if (call === 1) {
      return { ok: true, json: async () => ({ id: 'd1' }) }
    }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()

  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, [])
  assert.deepEqual(logs.output, [['deployment-id', 'd1']])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('deploy app hook failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'deploy-hook-url': 'http://hook',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock

  global.fetch = async () => ({ ok: false, status: 500 })

  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, ['Deploy hook request failed: 500'])
})

test('deploy app token failure', async () => {
  const logs = { failed: [], output: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'app-id': 'app1',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: () => {},
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  global.fetch = async () => ({ ok: false, status: 400 })
  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, ['Deployment request failed: 400'])
})

test('deploy app poll failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'app-id': 'app1',
    'wait-for-finish': 'true',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  let call = 0
  global.fetch = async () => {
    call++
    if (call === 1) {
      return { ok: true, json: async () => ({ id: 'd1' }) }
    }
    return { ok: true, json: async () => ({ status: 'failed' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, ['Deployment failed: status is failed'])
})

test('deploy app poll retry', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'app-id': 'app1',
    'wait-for-finish': 'true',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  let call = 0
  global.fetch = async () => {
    call++
    if (call === 1) return { ok: true, json: async () => ({ id: 'd2' }) }
    if (call === 2) return { ok: true, json: async () => ({ status: 'running' }) }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, [])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('deploy app poll not ok retry', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'app-id': 'app1',
    'wait-for-finish': 'true',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  let call = 0
  global.fetch = async () => {
    call++
    if (call === 1) return { ok: true, json: async () => ({ id: 'd3' }) }
    if (call === 2) return { ok: false, status: 500 }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployApp } = require('../src/actions/deployApp')
  await deployApp()
  assert.deepEqual(logs.failed, [])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('pollStatus max retries throws', async () => {
  const { pollStatus } = require('../src/actions/deployApp')._test
  await assert.rejects(() => pollStatus('id', 1000), /Max retries/)
})
