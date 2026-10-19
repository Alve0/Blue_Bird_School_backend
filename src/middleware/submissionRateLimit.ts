import type { RequestHandler } from "express";

const MAX_SUBMISSIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const submissionWindows = new Map<string, RateLimitWindow>();

export const submissionRateLimit: RequestHandler = (req, res, next) => {
  const userId = req.user?.userId;
  if (!userId) {
    next(Object.assign(new Error("Authentication is required"), {
      statusCode: 401,
    }));
    return;
  }

  const now = Date.now();
  let window = submissionWindows.get(userId);

  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + WINDOW_MS };
    submissionWindows.set(userId, window);
  }

  if (window.count >= MAX_SUBMISSIONS) {
    res.setHeader(
      "Retry-After",
      String(Math.ceil((window.resetAt - now) / 1000)),
    );
    next(Object.assign(new Error("Submission limit reached. Try again later."), {
      statusCode: 429,
    }));
    return;
  }

  window.count += 1;

  if (submissionWindows.size > 10000) {
    for (const [key, entry] of submissionWindows) {
      if (entry.resetAt <= now) {
        submissionWindows.delete(key);
      }
    }
  }

  next();
};
