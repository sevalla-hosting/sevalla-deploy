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
  for (const mod of ['../src/actions/promoteApp']) {
    delete require.cache[require.resolve(mod)]
  }
})

test('promote app success', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'source-app-id': 's1',
    'target-app-ids': 't1,t2',
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
      return { ok: true, json: async () => ({ id: 'p1' }) }
    }
    if (call === 2) {
      return { ok: true, json: async () => ({ status: 'running' }) }
    }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()

  const { promoteApp } = require('../src/actions/promoteApp')
  await promoteApp()
  assert.deepEqual(logs.failed, [])
  assert.deepEqual(logs.output, [['promotion-id', 'p1']])
  assert(logs.info.includes('Promotion status: succeeded'))
})

test('promote app missing inputs throws', async () => {
  const inputs = {}
  const coreMock = { getInput: (n) => inputs[n] }
  require.cache[require.resolve('@actions/core')].exports = coreMock
  const { promoteApp } = require('../src/actions/promoteApp')
  await assert.rejects(promoteApp, /required/)
})

test('promote app request failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'source-app-id': 's1',
    'target-app-ids': 't1',
  }
  const coreMock = {
    getInput: (n) => inputs[n],
    setFailed: (m) => logs.failed.push(m),
    setOutput: (n, v) => logs.output.push([n, v]),
    info: (m) => logs.info.push(m),
  }
  require.cache[require.resolve('@actions/core')].exports = coreMock

  global.fetch = async () => ({ ok: false, status: 400 })

  const { promoteApp } = require('../src/actions/promoteApp')
  await promoteApp()
  assert.deepEqual(logs.failed, ['Promotion request failed: 400'])
})

test('promote app poll failure', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'source-app-id': 's1',
    'target-app-ids': 't1',
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
    if (call === 1) return { ok: true, json: async () => ({ id: 'p2' }) }
    return { ok: true, json: async () => ({ status: 'failed' }) }
  }
  global.setTimeout = (fn) => fn()
  const { promoteApp } = require('../src/actions/promoteApp')
  await promoteApp()
  assert.deepEqual(logs.failed, ['Promotion failed: status is failed'])
})

test('promote app poll retry', async () => {
  const logs = { failed: [], output: [], info: [] }
  const inputs = {
    'sevalla-token': 'tok',
    'source-app-id': 's1',
    'target-app-ids': 't1',
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
    if (call === 1) return { ok: true, json: async () => ({ id: 'p3' }) }
    if (call === 2) return { ok: false, status: 500 }
    return { ok: true, json: async () => ({ status: 'succeeded' }) }
  }
  global.setTimeout = (fn) => fn()
  const { promoteApp } = require('../src/actions/promoteApp')
  await promoteApp()
  assert.deepEqual(logs.failed, ['Polling promotion failed: 500'])
})
