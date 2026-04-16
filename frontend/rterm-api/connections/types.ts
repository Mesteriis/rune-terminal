export type ConnectionKind = "local" | "ssh";

export type ConnectionStatus = "ready" | "configured";

export type ConnectionCheckStatus = "unchecked" | "passed" | "failed";

export type ConnectionLaunchStatus = "idle" | "succeeded" | "failed";

export type ConnectionUsability = "available" | "attention" | "unknown";

export interface SSHConfig {
  host: string;
  user?: string;
  port?: number;
  identity_file?: string;
}

export interface ConnectionRuntimeState {
  check_status: ConnectionCheckStatus;
  check_error?: string;
  last_checked_at?: string;
  launch_status: ConnectionLaunchStatus;
  launch_error?: string;
  last_launched_at?: string;
}

export interface Connection {
  id: string;
  kind: ConnectionKind;
  name: string;
  description?: string;
  status: ConnectionStatus;
  active: boolean;
  builtin?: boolean;
  usability: ConnectionUsability;
  runtime: ConnectionRuntimeState;
  ssh?: SSHConfig;
}

export interface ConnectionsSnapshot {
  connections: Connection[];
  active_connection_id: string;
}

export interface SelectConnectionRequest {
  connection_id: string;
}

export interface SaveSSHConnectionRequest {
  id?: string;
  name?: string;
  host: string;
  user?: string;
  port?: number;
  identity_file?: string;
}

export interface SaveSSHConnectionResponse {
  connection: Connection;
  connections: ConnectionsSnapshot;
}

export interface RemoteProfile {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  identity_file?: string;
  description?: string;
}

export interface ListRemoteProfilesResponse {
  profiles: RemoteProfile[];
}

export interface SaveRemoteProfileRequest {
  id?: string;
  name?: string;
  host: string;
  user?: string;
  port?: number;
  identity_file?: string;
}

export interface SaveRemoteProfileResponse {
  profile: RemoteProfile;
  profiles: RemoteProfile[];
}

export interface DeleteRemoteProfileResponse {
  profiles: RemoteProfile[];
}

export interface CreateRemoteSessionFromProfileRequest {
  title?: string;
}

export interface CreateRemoteSessionFromProfileResponse {
  tab_id: string;
  widget_id: string;
  session_id: string;
  profile_id: string;
  connection_id: string;
  reused: boolean;
  workspace: import("../workspace/types").WorkspaceSnapshot;
}
