import fs from 'node:fs'
import path from 'node:path'

export const backendHost = '127.0.0.1'
export const backendPort = 38092
export const frontendHost = '127.0.0.1'
export const frontendPort = 34193
export const authToken = 'playground-e2e-token'
export const backendUrl = `http://${backendHost}:${backendPort}`
export const frontendUrl = `http://${frontendHost}:${frontendPort}`
export const backendStateDir = path.join(process.cwd(), 'tmp', 'playwright-state')

export function preparePlaywrightStateDir() {
  fs.rmSync(backendStateDir, { force: true, recursive: true })
  fs.mkdirSync(backendStateDir, { recursive: true })
}
