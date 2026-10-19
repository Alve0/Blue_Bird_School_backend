import type { ErrorRequestHandler, RequestHandler } from "express";

export function catchAsync(
  handler: RequestHandler,
  localErrorHandler?: ErrorRequestHandler,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch((error: unknown) => {
        if (!localErrorHandler) {
          next(error);
          return;
        }

        Promise.resolve()
          .then(() => localErrorHandler(error, req, res, next))
          .catch(next);
      });
  };
}
