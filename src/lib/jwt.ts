import jwt, {
  JsonWebTokenError,
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";
import type { Role } from "../generated/prisma/enums";

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  role: Role;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function isRole(role: unknown): role is Role {
  return role === "STUDENT" || role === "MENTOR" || role === "ADMIN";
}

export function createAccessToken(
  user: Pick<AccessTokenPayload, "userId" | "role">,
  expiresIn: SignOptions["expiresIn"] = "1d",
): string {
  return jwt.sign(
    { userId: user.userId, role: user.role },
    getJwtSecret(),
    { expiresIn },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, getJwtSecret());
  if (
    typeof payload === "string" ||
    typeof payload.userId !== "string" ||
    !isRole(payload.role)
  ) {
    throw new JsonWebTokenError("Invalid access token payload");
  }

  return {
    ...payload,
    userId: payload.userId,
    role: payload.role,
  };
}
