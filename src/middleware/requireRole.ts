import type { RequestHandler } from "express";
import type { Role } from "../generated/prisma/enums";

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(Object.assign(new Error("Authentication is required"), {
        statusCode: 401,
      }));
      return;
    }

    if (req.user.role !== role) {
      next(Object.assign(new Error("You are not authorized to access this resource"), {
        statusCode: 403,
      }));
      return;
    }

    next();
  };
}
