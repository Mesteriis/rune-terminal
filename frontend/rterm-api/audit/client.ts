import type { AuditResponse } from "./types";
import { HttpClient } from "../http/client";

export class AuditClient {
  constructor(private readonly http: HttpClient) {}

  getEvents(limit = 50): Promise<AuditResponse> {
    return this.http.get<AuditResponse>("/api/v1/audit", {
      query: { limit },
    });
  }
}
