import { JsonWebTokenError } from "jsonwebtoken";
import type { RequestHandler } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";

function unauthorizedError(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 401 });
}

export const authenticateJwt: RequestHandler = (req, _res, next) => {
  const authorization = req.get("authorization");
  const [scheme, token, ...extraParts] = authorization?.trim().split(/\s+/) ?? [];

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token ||
    extraParts.length > 0
  ) {
    next(unauthorizedError("A valid Bearer token is required"));
    return;
  }

  let user: AccessTokenPayload;
  try {
    user = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      next(unauthorizedError("Invalid or expired access token"));
      return;
    }

    next(error);
    return;
  }

  req.user = user;
  next();
};
