import type { FSListResponse } from "./types";
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
}
