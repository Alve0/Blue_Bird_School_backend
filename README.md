# blue_bird_school_backend

## Setup

```bash
bun install
```

Create a `.env` file with the required values:

```bash
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_long_random_secret
```

Keep secrets out of source control. `JWT_SECRET` is required by the JWT helpers.

## Commands

```bash
bun run dev
bun run build
bun start
bun run typecheck
```

## Request helpers

`catchAsync` forwards synchronous throws and rejected promises to Express's global error handler by default. An optional local error handler can handle an error itself, call `next()` to continue the middleware chain, or forward an error with `next(error)`. Errors thrown or rejected by the local handler are forwarded globally.

```ts
import { catchAsync } from "./utils/catchAsync";
import { sendResponse } from "./utils/sendResponse";

router.get(
  "/submissions",
  catchAsync(async (_req, res) => {
    const submissions = await prisma.submission.findMany();
    sendResponse(res, 200, "Submissions loaded", submissions);
  }),
);
```

`sendResponse` consistently sends `{ status: "success", message, data? }`.
`globalErrorHandler` is registered after the routes and sends
`{ status: "fail" | "error", message }`. For errors with status 500 or greater,
it logs the error and returns a generic message instead of exposing internals.

## JWT authentication

The JWT helpers are separate from the existing Better Auth endpoints.
`createAccessToken` signs a user's `userId` and `role` with `JWT_SECRET` and
defaults to a one-day expiration. `authenticateJwt` verifies Bearer tokens and
sets the typed payload on `req.user`; missing, invalid, or expired tokens are
forwarded as HTTP 401 errors.

```ts
import { authenticateJwt } from "./middleware/authenticateJwt";
import { catchAsync } from "./utils/catchAsync";
import { sendResponse } from "./utils/sendResponse";

router.get(
  "/my-submissions",
  authenticateJwt,
  catchAsync(async (req, res) => {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.user!.userId },
    });
    sendResponse(res, 200, "Your submissions", submissions);
  }),
);
```

Use `createAccessToken({ userId, role })` after authenticating a user to issue
an access token. Only pass trusted user IDs and roles from your database.
