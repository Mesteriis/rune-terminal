export type RuntimePlatform = "tauri" | "web";

export type StreamAuthMode = "authorization-header" | "query-token" | "none";

export type RuntimeConfigSource = "tauri-command" | "vite-env" | "legacy-wave-env" | "location-origin";

export interface RuntimeConfig {
  baseUrl: string;
  authToken?: string;
  isTauri: boolean;
  isDev: boolean;
  streamAuthMode: StreamAuthMode;
  source: RuntimeConfigSource;
}

export interface RuntimeEnvironment {
  isTauri: boolean;
  isDev: boolean;
  platform: RuntimePlatform;
}

export interface TauriRuntimeInfo {
  base_url: string;
  auth_token: string;
}

export interface EnvConfigValue {
  value?: string;
  source?: string;
}

export interface RuntimeResolutionAttempt {
  source: RuntimeConfigSource | "unknown";
  message: string;
}

export class RuntimeResolutionError extends Error {
  readonly attempts: RuntimeResolutionAttempt[];

  constructor(message: string, attempts: RuntimeResolutionAttempt[] = []) {
    super(message);
    this.name = "RuntimeResolutionError";
    this.attempts = attempts;
  }
}
