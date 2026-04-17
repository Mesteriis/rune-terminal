import type { FSListResponse, FSReadResponse } from "./types";
import { HttpClient } from "../http/client";

export interface FSQueryOptions {
  allowOutsideWorkspace?: boolean;
}

export class FSClient {
  constructor(private readonly http: HttpClient) {}

  list(path?: string, options?: FSQueryOptions): Promise<FSListResponse> {
    return this.http.get<FSListResponse>("/api/v1/fs/list", {
      query: {
        path,
        allow_outside_workspace: options?.allowOutsideWorkspace ? "1" : undefined,
      },
    });
  }

  read(path: string, maxBytes?: number, options?: FSQueryOptions): Promise<FSReadResponse> {
    return this.http.get<FSReadResponse>("/api/v1/fs/read", {
      query: {
        path,
        max_bytes: maxBytes,
        allow_outside_workspace: options?.allowOutsideWorkspace ? "1" : undefined,
      },
    });
  }
}
