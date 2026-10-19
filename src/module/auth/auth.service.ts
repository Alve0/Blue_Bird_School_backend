import { createAccessToken } from "../../lib/jwt";
import { auth as betterAuth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function duplicateEmailError(): Error & { statusCode: number } {
  return Object.assign(new Error("An account with this email already exists"), {
    statusCode: 409,
  });
}

export async function register(input: RegisterInput) {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: input.email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (existingUser) {
    throw duplicateEmailError();
  }

  try {
    await betterAuth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw duplicateEmailError();
    }
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: input.email,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new Error("Created account could not be loaded");
  }

  return {
    user,
  };
}

export async function signIn(input: SignInInput) {
  const session = await betterAuth.api.signInEmail({
    body: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  const storedSession = await prisma.session.findUnique({
    where: { token: session.token },
    select: { id: true, userId: true },
  });

  if (!user || !storedSession) {
    await prisma.session.deleteMany({ where: { token: session.token } });
    throw new Error("Sign-in session could not be loaded");
  }

  if (storedSession.userId !== user.id) {
    await prisma.session.deleteMany({ where: { token: session.token } });
    throw new Error("Sign-in session does not match the account");
  }

  let accessToken: string;
  try {
    accessToken = createAccessToken({
      userId: user.id,
      role: user.role,
      sessionId: storedSession.id,
    });
  } catch (error) {
    await prisma.session.deleteMany({ where: { id: storedSession.id } });
    throw error;
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
    user,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error("User account was not found"), {
      statusCode: 404,
    });
  }

  return user;
}

export async function signOut(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}
