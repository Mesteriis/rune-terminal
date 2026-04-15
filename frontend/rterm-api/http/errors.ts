import type { ErrorPayload } from "./types";

export interface NormalizedApiErrorOptions {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(options: NormalizedApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isNotFoundError(): boolean {
    return this.status === 404;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseErrorEnvelope(value: unknown): ErrorPayload | null {
  if (!isObject(value)) {
    return null;
  }

  const envelope = value as Record<string, unknown>;
  const errorValue = envelope.error;
  if (!isObject(errorValue)) {
    return null;
  }

  const errorObj = errorValue as Record<string, unknown>;
  const code = errorObj.code;
  const message = errorObj.message;
  if (typeof code !== "string" || typeof message !== "string") {
    return null;
  }

  return {
    error: {
      code,
      message,
    },
  };
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(body);
      const envelope = parseErrorEnvelope(payload);
      if (envelope) {
        return new ApiError({
          status,
          code: envelope.error.code,
          message: envelope.error.message,
        });
      }
      return new ApiError({
        status,
        code: "invalid_error_envelope",
        message: "Error response did not include expected error envelope",
        details: payload,
      });
    } catch {
      return new ApiError({
        status,
        code: "invalid_error_json",
        message: "Failed to parse error JSON body",
        details: body,
      });
    }
  }

  if (body.trim()) {
    return new ApiError({
      status,
      code: "http_error",
      message: body,
    });
  }

  return new ApiError({
    status,
    code: "http_error",
    message: response.statusText || "Request failed",
  });
}
