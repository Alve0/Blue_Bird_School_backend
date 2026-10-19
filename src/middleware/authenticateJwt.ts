import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";
import { prisma } from "../lib/prisma";

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
    if (error instanceof jwt.JsonWebTokenError) {
      next(unauthorizedError("Invalid or expired access token"));
      return;
    }

    next(error);
    return;
  }

  void prisma.session
    .findUnique({
      where: { id: user.sessionId },
      select: {
        userId: true,
        expiresAt: true,
        user: {
          select: {
            role: true,
          },
        },
      },
    })
    .then((session) => {
      if (
        !session ||
        session.userId !== user.userId ||
        session.expiresAt <= new Date()
      ) {
        next(unauthorizedError("Invalid or expired access token"));
        return;
      }

      req.user = {
        ...user,
        role: session.user.role,
      };
      next();
    })
    .catch(next);
};
