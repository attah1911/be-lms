import { Response } from "express";
import * as Yup from "yup";

type Pagination = {
  totalPages: number;
  current: number;
  total: number;
};

// Compatibility shim: the frontend (and the old Mongoose docs) expect `_id`.
// Prisma rows use `id`, so mirror it onto `_id` recursively before serializing.
function withMongoId(value: any): any {
  if (Array.isArray(value)) return value.map(withMongoId);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = withMongoId(v);
    if (typeof out.id === "string" && out._id === undefined) out._id = out.id;
    return out;
  }
  return value;
}

export default {
  success(res: Response, data: any, message: string): Response {
    return res.status(200).json({
      meta: { status: 200, message },
      data: withMongoId(data),
    });
  },

  error(res: Response, error: unknown, message: string, statusCode: number = 500): Response {
    if (error instanceof Yup.ValidationError) {
      return res.status(400).json({
        meta: { status: 400, message: error.errors[0] || message },
        data: error.errors,
      });
    }

    console.error("Error details:", error);
    return res.status(statusCode).json({
      meta: { status: statusCode, message: message || "Internal server error" },
      data: null,
    });
  },

  /**
   * 401 — the caller is not authenticated: no token, a bad/expired one, or
   * wrong credentials. The frontend signs the user out on this and only this.
   */
  unauthenticated(res: Response, message: string = "unauthenticated"): Response {
    return res.status(401).json({
      meta: { status: 401, message },
      data: null,
    });
  },

  /**
   * 403 — authenticated, but not allowed to touch this resource (wrong role,
   * not the owner). Must NOT sign the user out.
   */
  unauthorized(res: Response, message: string = "unauthorized"): Response {
    return res.status(403).json({
      meta: { status: 403, message },
      data: null,
    });
  },

  /** 404 — the resource does not exist, or is hidden from this caller. */
  notFound(res: Response, message: string): Response {
    return res.status(404).json({
      meta: { status: 404, message },
      data: null,
    });
  },

  /** 400 — the request itself is malformed or fails a business rule. */
  badRequest(res: Response, message: string): Response {
    return res.status(400).json({
      meta: { status: 400, message },
      data: null,
    });
  },

  pagination(res: Response, data: any[], pagination: Pagination, message: string): Response {
    return res.status(200).json({
      meta: { status: 200, message },
      data: withMongoId(data),
      pagination,
    });
  },
};
