import jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { Role } from "../generated/prisma/enums";

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  role: Role;
  sessionId: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("JWT_SECRET must be at least 32 bytes long");
  }

  return secret;
}

function isRole(role: unknown): role is Role {
  return role === "STUDENT" || role === "MENTOR" || role === "ADMIN";
}

export function createAccessToken(
  user: Pick<AccessTokenPayload, "userId" | "role" | "sessionId">,
  expiresIn: SignOptions["expiresIn"] = "15m",
): string {
  return jwt.sign(
    {
      userId: user.userId,
      role: user.role,
      sessionId: user.sessionId,
    },
    getJwtSecret(),
    { expiresIn, algorithm: "HS256" },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
  if (
    typeof payload === "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.sessionId !== "string" ||
    !isRole(payload.role)
  ) {
    throw new jwt.JsonWebTokenError("Invalid access token payload");
  }

  return {
    ...payload,
    userId: payload.userId,
    role: payload.role,
    sessionId: payload.sessionId,
  };
}
