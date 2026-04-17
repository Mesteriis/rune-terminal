import type { QuickActionsResponse } from "./types";
import { HttpClient } from "../http/client";

export class QuickActionsClient {
  constructor(private readonly http: HttpClient) {}

  listQuickActions(): Promise<QuickActionsResponse> {
    return this.http.get<QuickActionsResponse>("/api/v1/workflow/quick-actions");
  }
}
