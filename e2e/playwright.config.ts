import { defineConfig } from '@playwright/test'

import {
  authToken,
  backendHost,
  backendPort,
  repoRoot,
  backendStateDir,
  frontendHost,
  frontendPort,
  frontendUrl,
  preparePlaywrightStateDir,
} from './test-env'

preparePlaywrightStateDir()

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `cd ${repoRoot} && LOCAL_BACKEND_PORT=${backendPort} LOCAL_AUTH_TOKEN=${authToken} make BACKEND_STATE_DIR=${backendStateDir} run-backend`,
      url: `http://${backendHost}:${backendPort}/healthz`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `cd ${repoRoot} && LOCAL_BACKEND_PORT=${backendPort} LOCAL_FRONTEND_PORT=${frontendPort} LOCAL_AUTH_TOKEN=${authToken} make run-frontend`,
      url: `http://${frontendHost}:${frontendPort}/`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
