/** Anything thrown that is not an ApiError becomes a 500 with no detail leaked. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code = "bad_request") => new ApiError(400, code, msg);
export const unauthorized = (msg = "Authentication required") => new ApiError(401, "unauthorized", msg);
export const forbidden = (msg = "Not permitted") => new ApiError(403, "forbidden", msg);
export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found`);
export const conflict = (msg: string) => new ApiError(409, "conflict", msg);
