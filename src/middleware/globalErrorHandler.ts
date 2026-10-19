import type { ErrorRequestHandler } from "express";

type HttpError = {
  status?: unknown;
  statusCode?: unknown;
};

export const globalErrorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  console.error(error);

  const httpError = error as HttpError;
  const candidateStatus = httpError?.statusCode ?? httpError?.status;
  const statusCode =
    typeof candidateStatus === "number" &&
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : 500;
  const message =
    statusCode >= 500
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : String(error);

  res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message,
  });
};
