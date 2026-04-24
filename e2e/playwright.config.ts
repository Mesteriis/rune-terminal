import { defineConfig } from '@playwright/test'

import {
  authToken,
  backendHost,
  backendPort,
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
      command: `LOCAL_BACKEND_PORT=${backendPort} LOCAL_AUTH_TOKEN=${authToken} make -C .. BACKEND_STATE_DIR=${backendStateDir} run-backend`,
      url: `http://${backendHost}:${backendPort}/healthz`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `LOCAL_BACKEND_PORT=${backendPort} LOCAL_FRONTEND_PORT=${frontendPort} LOCAL_AUTH_TOKEN=${authToken} make -C .. run-frontend`,
      url: `http://${frontendHost}:${frontendPort}/`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
