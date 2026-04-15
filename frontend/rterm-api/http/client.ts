import type { HttpMethod, QueryParams, RawRequestOptions } from "./types";
import { parseApiError } from "./errors";
import { ApiError } from "./errors";

export interface HttpClientOptions {
  baseUrl: string;
  authToken?: string;
}

export class HttpClient {
  readonly #baseUrl: string;
  readonly #authToken?: string;
  readonly #fetch: typeof fetch;

  constructor(options: HttpClientOptions, fetchImpl?: typeof fetch) {
    this.#baseUrl = this.normalizeBaseUrl(options.baseUrl);
    this.#authToken = options.authToken;
    this.#fetch = fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  }

  get baseUrl(): string {
    return this.#baseUrl;
  }

  get authToken(): string | undefined {
    return this.#authToken;
  }

  async get<T>(path: string, options: Omit<RawRequestOptions, "body" | "method"> = {}): Promise<T> {
    return this.request<T, void>("GET", path, options);
  }

  async post<T, TBody = unknown>(
    path: string,
    options: Omit<RawRequestOptions<TBody>, "method"> = {},
  ): Promise<T> {
    return this.request<T, TBody>("POST", path, options);
  }

  async put<T, TBody = unknown>(
    path: string,
    options: Omit<RawRequestOptions<TBody>, "method"> = {},
  ): Promise<T> {
    return this.request<T, TBody>("PUT", path, options);
  }

  async patch<T, TBody = unknown>(
    path: string,
    options: Omit<RawRequestOptions<TBody>, "method"> = {},
  ): Promise<T> {
    return this.request<T, TBody>("PATCH", path, options);
  }

  async delete<T>(path: string, options: Omit<RawRequestOptions, "body" | "method"> = {}): Promise<T> {
    return this.request<T, void>("DELETE", path, options);
  }

  async requestRaw(
    method: HttpMethod,
    path: string,
    options: RawRequestOptions = {},
  ): Promise<Response> {
    const requestInit = this.buildRequestInit(method, options);
    const response = await this.#fetch(this.buildUrl(path, options.query), requestInit);
    if (!response.ok) {
      throw await parseApiError(response);
    }
    return response;
  }

  async request<T, TBody = unknown>(
    method: HttpMethod,
    path: string,
    options: RawRequestOptions<TBody> = {},
  ): Promise<T> {
    const response = await this.requestRaw(method, path, options);
    const responseText = await response.text();
    if (!responseText.trim()) {
      return undefined as T;
    }
    try {
      return JSON.parse(responseText) as T;
    } catch {
      throw new ApiError({
        status: response.status,
        code: "invalid_json",
        message: "Response was not valid JSON",
      });
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith("http") ? path : `/${path.replace(/^\//, "")}`;
    const url = new URL(normalizedPath, this.#baseUrl.endsWith("/") ? this.#baseUrl : `${this.#baseUrl}/`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildRequestInit(method: HttpMethod, options: RawRequestOptions): RequestInit {
    const includeAuth = options.includeAuth ?? true;
    const requestHeaders = this.buildHeaders(options.headers, includeAuth);
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal: options.signal,
    };

    if (options.body !== undefined && method !== "GET" && method !== "DELETE") {
      requestInit.body = JSON.stringify(options.body);
      requestHeaders.set("Content-Type", "application/json");
    }

    if (method === "GET" || method === "DELETE") {
      requestHeaders.delete("Content-Type");
    }

    return requestInit;
  }

  private buildHeaders(init: HeadersInit | undefined, includeAuth: boolean): Headers {
    const headers = new Headers(init);
    if (includeAuth && this.#authToken) {
      headers.set("Authorization", `Bearer ${this.#authToken}`);
    }
    return headers;
  }
}
