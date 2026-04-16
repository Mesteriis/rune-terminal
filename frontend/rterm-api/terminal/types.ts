export interface TerminalState {
  widget_id: string;
  session_id: string;
  shell: string;
  restored?: boolean;
  status_detail?: string;
  connection_id?: string;
  connection_name?: string;
  connection_kind?: string;
  pid: number;
  status: string;
  started_at: string;
  last_output_at?: string;
  exit_code?: number;
  can_send_input: boolean;
  can_interrupt: boolean;
  working_dir?: string;
}

export interface TerminalOutputChunk {
  seq: number;
  data: string;
  timestamp: string;
}

export interface TerminalSnapshot {
  state: TerminalState;
  chunks: TerminalOutputChunk[];
  next_seq: number;
}

export interface SendInputRequest {
  text: string;
  append_newline?: boolean;
}

export interface SendInputResponse {
  widget_id: string;
  bytes_sent: number;
  append_newline: boolean;
}

export interface RestartSessionResponse {
  state: TerminalState;
}
