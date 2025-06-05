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
  for (const mod of ['../src/actions/deployStaticSite']) {
    delete require.cache[require.resolve(mod)]
  }
})

test('deploy static site success', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'static-site-id': 'ss1',
    branch: 'main',
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
      return { ok: true, json: async () => ({ deployment: { id: 'd1' } }) }
    }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()

  const { deployStaticSite } = require('../src/actions/deployStaticSite')
  await deployStaticSite()
  assert.deepEqual(logs.failed, [])
  assert.deepEqual(logs.output, [['deployment-id', 'd1']])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('deploy static site failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = { 'static-site-id': 'ss1' }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: () => {},
    info: () => {},
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock

  global.fetch = async () => ({ ok: false, status: 404 })

  const { deployStaticSite } = require('../src/actions/deployStaticSite')
  await deployStaticSite()
  assert.deepEqual(logs.failed, ['HTTP error! status: 404'])
})

test('deploy static site poll failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'static-site-id': 'ss1',
    branch: 'main',
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
    if (call === 1) return { ok: true, json: async () => ({ deployment: { id: 'd2' } }) }
    return { ok: true, json: async () => ({ status: 'failed' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployStaticSite } = require('../src/actions/deployStaticSite')
  await deployStaticSite()
  assert.deepEqual(logs.failed, ['Deployment failed: status is failed'])
})

test('deploy static site poll retry', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'static-site-id': 'ss1',
    branch: 'main',
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
    if (call === 1) return { ok: true, json: async () => ({ deployment: { id: 'd3' } }) }
    if (call === 2) return { ok: true, json: async () => ({ status: 'running' }) }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployStaticSite } = require('../src/actions/deployStaticSite')
  await deployStaticSite()
  assert.deepEqual(logs.failed, [])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('deploy static site poll not ok retry', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'static-site-id': 'ss1',
    branch: 'main',
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
    if (call === 1) return { ok: true, json: async () => ({ deployment: { id: 'd4' } }) }
    if (call === 2) return { ok: false, status: 500 }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()
  const { deployStaticSite } = require('../src/actions/deployStaticSite')
  await deployStaticSite()
  assert.deepEqual(logs.failed, [])
  assert(logs.info.includes('Deployment status: succeeded'))
})

test('pollStatus max retries throws', async () => {
  const { pollStatus } = require('../src/actions/deployStaticSite')._test
  await assert.rejects(() => pollStatus('id', 1000), /Max retries/)
})
