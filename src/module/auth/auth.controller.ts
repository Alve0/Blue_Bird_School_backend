import type { Request, RequestHandler } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as authService from "./auth.service";

type RequestBody = Record<string, unknown>;

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function bodyOf(req: Request): RequestBody {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("A JSON request body is required");
  }
  return req.body as RequestBody;
}

function requiredString(
  body: RequestBody,
  field: string,
  options: { trim?: boolean } = {},
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }

  const normalized = options.trim ? value.trim() : value;
  if (!normalized) {
    throw badRequest(`${field} is required`);
  }

  return normalized;
}

function passwordFrom(body: RequestBody, field: string): string {
  const password = requiredString(body, field);
  if (password.length < 8 || password.length > 128) {
    throw badRequest(`${field} must be between 8 and 128 characters`);
  }
  return password;
}

export const registerController: RequestHandler = catchAsync(async (req, res) => {
  const body = bodyOf(req);
  const { user } = await authService.register({
    name: requiredString(body, "name", { trim: true }),
    email: requiredString(body, "email", { trim: true }).toLowerCase(),
    password: passwordFrom(body, "password"),
  });

  sendResponse(res, 201, "Account created successfully", user);
});

export const signInController: RequestHandler = catchAsync(async (req, res) => {
  const body = bodyOf(req);
  const result = await authService.signIn({
    email: requiredString(body, "email", { trim: true }).toLowerCase(),
    password: requiredString(body, "password"),
  });

  sendResponse(res, 200, "Signed in successfully", result);
});

export const currentUserController: RequestHandler = catchAsync(async (req, res) => {
  if (!req.user) {
    throw badRequest("Authentication is required");
  }

  const user = await authService.getCurrentUser(req.user.userId);
  sendResponse(res, 200, "Current user loaded", user);
});

export const signOutController: RequestHandler = catchAsync(async (req, res) => {
  if (!req.user) {
    throw badRequest("Authentication is required");
  }

  await authService.signOut(req.user.sessionId);
  sendResponse(res, 200, "Signed out successfully");
});
