import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(currentDir, '..')
export const backendHost = '127.0.0.1'
export const backendPort = 38092
export const frontendHost = '127.0.0.1'
export const frontendPort = 34193
export const authToken = 'playground-e2e-token'
export const backendUrl = `http://${backendHost}:${backendPort}`
export const frontendUrl = `http://${frontendHost}:${frontendPort}`
const defaultPlaywrightStateDir = path.join(repoRoot, 'tmp', `playwright-state-${Date.now()}-${process.pid}`)
export const backendStateDir =
  process.env.RTERM_PLAYWRIGHT_STATE_DIR?.trim() || defaultPlaywrightStateDir

if (!process.env.RTERM_PLAYWRIGHT_STATE_DIR) {
  process.env.RTERM_PLAYWRIGHT_STATE_DIR = backendStateDir
}

export function preparePlaywrightStateDir() {
  if (process.env.RTERM_PLAYWRIGHT_STATE_PREPARED === '1') {
    return
  }

  fs.rmSync(backendStateDir, { force: true, recursive: true })
  fs.mkdirSync(backendStateDir, { recursive: true })
  process.env.RTERM_PLAYWRIGHT_STATE_PREPARED = '1'
}
