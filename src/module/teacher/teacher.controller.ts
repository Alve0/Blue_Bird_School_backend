import type { Request, RequestHandler } from "express";
import type { Status } from "../../generated/prisma/enums";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as teacherService from "./teacher.service";

function badRequest(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 400 });
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

function parseStatus(value: unknown): Status | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "PENDING" || value === "APPROVED" || value === "REJECTED") {
    return value;
  }

  throw badRequest("status must be PENDING, APPROVED, or REJECTED");
}

function bodyOf(req: Request): Record<string, unknown> {
  if (req.body === undefined) {
    return {};
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be a JSON object");
  }

  return req.body as Record<string, unknown>;
}

function submissionIdFrom(req: Request): string {
  const { submissionId } = req.params;
  if (typeof submissionId !== "string" || !submissionId.trim()) {
    throw badRequest("submissionId is required");
  }

  return submissionId;
}

export const submissionStatisticsController: RequestHandler = catchAsync(
  async (_req, res) => {
    const statistics = await teacherService.getSubmissionStatistics();
    sendResponse(res, 200, "Submission statistics loaded", statistics);
  },
);

export const submissionListController: RequestHandler = catchAsync(
  async (req, res) => {
    const page = positiveInteger(req.query.page, 1, "page");
    const limit = positiveInteger(req.query.limit, 20, "limit");

    if (limit > 100) {
      throw badRequest("limit cannot be greater than 100");
    }

    const result = await teacherService.getSubmissions({
      page,
      limit,
      status: parseStatus(req.query.status),
    });

    sendResponse(res, 200, "Submissions loaded", result);
  },
);

export const approveSubmissionController: RequestHandler = catchAsync(
  async (req, res) => {
    const body = bodyOf(req);
    if (Object.keys(body).length !== 0) {
      throw badRequest("Approval does not accept a request body");
    }

    const submission = await teacherService.reviewSubmission(
      submissionIdFrom(req),
      "APPROVED",
    );
    sendResponse(res, 200, "Submission approved", submission);
  },
);

export const rejectSubmissionController: RequestHandler = catchAsync(
  async (req, res) => {
    const body = bodyOf(req);
    if (Object.keys(body).length !== 0) {
      throw badRequest("Rejection does not accept a request body");
    }

    const submission = await teacherService.reviewSubmission(
      submissionIdFrom(req),
      "REJECTED",
    );
    sendResponse(res, 200, "Submission rejected", submission);
  },
);
