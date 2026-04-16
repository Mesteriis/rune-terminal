import type { FSListResponse, FSReadResponse } from "./types";
import { HttpClient } from "../http/client";

export class FSClient {
  constructor(private readonly http: HttpClient) {}

  list(path?: string): Promise<FSListResponse> {
    return this.http.get<FSListResponse>("/api/v1/fs/list", {
      query: {
        path,
      },
    });
  }

  read(path: string, maxBytes?: number): Promise<FSReadResponse> {
    return this.http.get<FSReadResponse>("/api/v1/fs/read", {
      query: {
        path,
        max_bytes: maxBytes,
      },
    });
  }
}
