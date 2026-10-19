# blue_bird_school_backend

## Setup

Install dependencies:

```bash
bun install
```

Create a `.env` file:

```bash
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_random_secret_at_least_32_bytes
BETTER_AUTH_SECRET=your_separate_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

Generate `JWT_SECRET` and `BETTER_AUTH_SECRET` as separate random secrets.
The JWT secret must be at least 32 bytes. Keep secrets out of source control.

Apply database migrations before starting the server:

```bash
bunx prisma migrate dev
```

The auth migration stops if it finds existing `Submission` rows without an
owner. Assign those rows to real users before applying the migration; it will
not invent or assign owners automatically.

## Commands

```bash
bun run dev
bun run build
bun start
bun run typecheck
```

## Request helpers

`catchAsync` forwards synchronous throws and rejected promises to Express's
global error handler by default. An optional local error handler can handle an
error itself, call `next()` to continue the middleware chain, or forward an
error with `next(error)`. Errors thrown or rejected by a local handler are
forwarded globally.

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
`globalErrorHandler` is registered after the routes and returns a generic
message for server errors.

## Authentication endpoints

The `/api/v1/auth` routes use Better Auth for password hashing. Successful
signup and sign-in issue a 15-minute JWT bound to the Better Auth session.
The session is checked in the database on each protected request, so sign-out
invalidates existing access tokens.

```text
POST /api/v1/auth/signup   { "name", "email", "password" }
POST /api/v1/auth/signin   { "email", "password" }
GET  /api/v1/auth/me       Authorization: Bearer <accessToken>
POST /api/v1/auth/signout  Authorization: Bearer <accessToken>
```

Signup returns the user's public profile and access token, so a separate
sign-in is not needed after account creation. Emails are normalized to
lowercase, and duplicate email addresses are rejected. PostgreSQL also
enforces case-insensitive email uniqueness. Email verification and
forgot-password/reset endpoints are disabled until a secure email delivery
provider is configured.

Protect additional endpoints with `authenticateJwt`, then use `req.user` for
the verified user ID and current database role. Continue using `catchAsync` and
`sendResponse` for route handlers. Access tokens expire after 15 minutes; the
user can sign in again to create another.

## Teacher submission dashboard

Teacher endpoints require a JWT for a `MENTOR` account. They support server-side
filtering, page/limit pagination, submission counts, and reviewing pending
submissions. Pages default to 1, page size defaults to 20, and page size is
capped at 100.

```text
GET   /api/v1/teacher/statistics
GET   /api/v1/teacher/submissions?page=1&limit=20
GET   /api/v1/teacher/submissions?status=APPROVED&page=1&limit=20
GET   /api/v1/teacher/submissions?status=REJECTED&page=1&limit=20
PATCH /api/v1/teacher/submissions/:submissionId/approve
PATCH /api/v1/teacher/submissions/:submissionId/reject
```

Statistics include total, pending, approved, and rejected counts. Submission
results include all submission fields and the submitter's public name/email.
Only pending submissions can be approved or rejected; repeated or conflicting
reviews return `409 Conflict`.
