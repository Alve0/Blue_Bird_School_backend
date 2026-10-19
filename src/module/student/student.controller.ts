import type { Request, RequestHandler } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as studentService from "./student.service";

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function bodyOf(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("A JSON request body is required");
  }

  return req.body as Record<string, unknown>;
}

function requiredText(
  body: Record<string, unknown>,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }

  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) {
    throw badRequest(
      `${field} must be between ${minLength} and ${maxLength} characters`,
    );
  }

  return text;
}

function validatedUrl(value: string, field: string): string {
  if (value.length > 2048) {
    throw badRequest(`${field} must not exceed 2048 characters`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw badRequest(`${field} must be a valid URL`);
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw badRequest(`${field} must be an HTTP or HTTPS URL without credentials`);
  }

  url.hash = "";
  if (field === "repoUrl") {
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");
  }

  return url.toString().replace(/\/$/, "");
}

function positiveInteger(
  value: unknown,
  defaultValue: number,
  field: string,
): number {
  if (value === undefined) {
    return defaultValue;
  }
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw badRequest(`${field} must be a positive integer`);
  }

  return Number(value);
}

export const createSubmissionController: RequestHandler = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw Object.assign(new Error("Authentication is required"), {
        statusCode: 401,
      });
    }

    const body = bodyOf(req);
    const allowedFields = new Set([
      "projectName",
      "repoUrl",
      "liveLink",
      "description",
    ]);
    const unexpectedField = Object.keys(body).find(
      (field) => !allowedFields.has(field),
    );
    if (unexpectedField) {
      throw badRequest(`Unexpected field: ${unexpectedField}`);
    }

    const submission = await studentService.createSubmission(req.user.userId, {
      projectName: requiredText(body, "projectName", 3, 120),
      repoUrl: validatedUrl(
        requiredText(body, "repoUrl", 1, 2048),
        "repoUrl",
      ),
      liveLink: validatedUrl(
        requiredText(body, "liveLink", 1, 2048),
        "liveLink",
      ),
      description: requiredText(body, "description", 20, 5000),
    });

    sendResponse(res, 201, "Project submitted successfully", submission);
  },
);

export const studentSubmissionListController: RequestHandler = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw Object.assign(new Error("Authentication is required"), {
        statusCode: 401,
      });
    }

    const page = positiveInteger(req.query.page, 1, "page");
    const limit = positiveInteger(req.query.limit, 20, "limit");
    if (limit > 100) {
      throw badRequest("limit cannot be greater than 100");
    }

    const result = await studentService.getStudentSubmissions({
      userId: req.user.userId,
      page,
      limit,
    });

    sendResponse(res, 200, "Your submissions loaded", result);
  },
);

export const studentSubmissionDetailController: RequestHandler = catchAsync(
  async (req, res) => {
    if (!req.user) {
      throw Object.assign(new Error("Authentication is required"), {
        statusCode: 401,
      });
    }

    const submissionId = req.params.submissionId;
    if (typeof submissionId !== "string" || !submissionId.trim()) {
      throw badRequest("submissionId is required");
    }

    const submission = await studentService.getStudentSubmission(
      req.user.userId,
      submissionId,
    );

    sendResponse(res, 200, "Your submission loaded", submission);
  },
);
