import type { IgnoreRulesResponse, TrustedRulesResponse } from "./types";
import { HttpClient } from "../http/client";

export class PolicyClient {
  constructor(private readonly http: HttpClient) {}

  listTrustedRules(): Promise<TrustedRulesResponse> {
    return this.http.get<TrustedRulesResponse>("/api/v1/policy/trusted-rules");
  }

  listIgnoreRules(): Promise<IgnoreRulesResponse> {
    return this.http.get<IgnoreRulesResponse>("/api/v1/policy/ignore-rules");
  }
}
