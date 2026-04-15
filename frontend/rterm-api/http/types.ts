export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface RawRequestOptions<TBody = unknown> {
  query?: QueryParams;
  headers?: HeadersInit;
  signal?: AbortSignal;
  body?: TBody;
  includeAuth?: boolean;
}

export interface ErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

export type JsonLike = null | boolean | number | string | unknown[] | { [key: string]: JsonLike };
