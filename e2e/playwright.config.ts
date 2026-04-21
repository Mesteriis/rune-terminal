import { defineConfig } from '@playwright/test'

const backendHost = '127.0.0.1'
const backendPort = 8092
const frontendHost = '127.0.0.1'
const frontendPort = 4193
const authToken = 'commander-e2e-token'

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: {
    baseURL: `http://${frontendHost}:${frontendPort}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `LOCAL_BACKEND_PORT=${backendPort} LOCAL_AUTH_TOKEN=${authToken} make -C .. run-backend`,
      url: `http://${backendHost}:${backendPort}/healthz`,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `LOCAL_BACKEND_PORT=${backendPort} LOCAL_FRONTEND_PORT=${frontendPort} LOCAL_AUTH_TOKEN=${authToken} make -C .. run-frontend`,
      url: `http://${frontendHost}:${frontendPort}/`,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
