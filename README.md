# Blue Bird School API

Backend API for the Blue Bird School project-submission portal. Students can
submit and track projects, while mentors can review submissions and view
dashboard statistics.

## Features

- Email/password registration and sign-in
- Short-lived JWT access tokens tied to database-backed sessions
- Role-protected student and mentor endpoints
- Student project submissions with URL validation and duplicate-repository
  protection
- Submission listing, pagination, and mentor review workflows
- PostgreSQL persistence through Prisma
- CORS configured for a single frontend origin

## Technology

- [Bun](https://bun.sh/) and TypeScript
- [Express 5](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Prisma](https://www.prisma.io/)
- [Better Auth](https://www.better-auth.com/) for password handling and session
  storage

## Requirements

- Bun (current stable release)
- PostgreSQL database
- Git

## Getting started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create a `.env` file in the project root:

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
   PORT=5000
   JWT_SECRET="replace-with-a-random-secret-at-least-32-bytes-long"
   BETTER_AUTH_SECRET="replace-with-a-separate-random-secret"
   BETTER_AUTH_URL="http://localhost:5000"
   FRONTEND_URL="http://localhost:3000"
   ```

   Set `DATABASE_URL` to a reachable PostgreSQL database. Use separate,
   securely generated values for `JWT_SECRET` and `BETTER_AUTH_SECRET`; the JWT
   secret must be at least 32 bytes. Never commit real secrets. Set
   `FRONTEND_URL` to the frontend's exact origin (scheme, host, and port, with
   no path); the API uses it for credentialed cross-origin requests.

3. Apply database migrations and generate the Prisma client:

   ```bash
   bunx prisma migrate dev
   bunx prisma generate
   ```

   The authentication migration will stop if existing submissions do not have
   an owner. Assign those records to real users before applying the migration;
   it will not invent or assign owners automatically.

4. Start the development server:

   ```bash
   bun run dev
   ```

   The API listens on `http://localhost:5000` by default. Set `PORT` to use a
   different port. The health endpoint is
   `GET http://localhost:5000/api/v1/health`.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Run the API with the TypeScript watch server |
| `bun run build` | Build `src/index.ts` into `dist/` |
| `bun start` | Build and start the compiled server |
| `bun run typecheck` | Run the project's type-check script |

## API

All versioned application endpoints are under `/api/v1`. JSON endpoints accept
and return JSON. Successful responses use this envelope:

```json
{
  "status": "success",
  "message": "Request completed",
  "data": {}
}
```

The `data` property is omitted when the endpoint has no response data. Errors
return a `status` of `fail` or `error` and a `message`; server errors use a
generic message.

### Health check

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Public |

### Authentication

The custom authentication endpoints issue an access token after sign-up or
sign-in. Send it on protected requests as
`Authorization: Bearer <accessToken>`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Public | Create a student account |
| `POST` | `/api/v1/auth/signin` | Public | Sign in |
| `GET` | `/api/v1/auth/me` | Authenticated | Get the current user's profile |
| `POST` | `/api/v1/auth/signout` | Authenticated | Invalidate the current session |

Sign-up request:

```json
{
  "name": "Alex Student",
  "email": "alex@example.com",
  "password": "a-secure-password"
}
```

Sign-in request:

```json
{
  "email": "alex@example.com",
  "password": "a-secure-password"
}
```

Names and emails are trimmed, and email addresses are normalized to lowercase.
Passwords must be 8–128 characters. A successful sign-up returns the public
user profile and an access token, so a separate sign-in is not required.
Tokens expire after 15 minutes. Protected requests also check that the
associated database session is still valid, so signing out invalidates the
token immediately. Email verification and password-reset flows are not
available until a secure email delivery provider is configured.

Better Auth's own handlers are mounted under `/api/auth/*`; the application
sign-up/sign-in API documented above is under `/api/v1/auth`.

### Student submissions

All student endpoints require a valid token for a `STUDENT` account.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/student/submissions` | Create a project submission |
| `GET` | `/api/v1/student/submissions?page=1&limit=20` | List the current student's submissions |
| `GET` | `/api/v1/student/submissions/:submissionId` | Get one of the current student's submissions |

Submission request:

```json
{
  "projectName": "Classroom Planner",
  "repoUrl": "https://github.com/example/classroom-planner",
  "liveLink": "https://classroom-planner.example.com",
  "description": "A classroom planning application that helps teachers organize lessons and activities."
}
```

The request must contain exactly the four fields shown. Project names must be
3–120 characters; descriptions must be 20–5000 characters. Repository and live
URLs must be valid HTTP or HTTPS URLs without embedded credentials and must
not exceed 2048 characters. Repository URL fragments, queries, trailing
slashes, and `.git` suffixes are normalized before duplicate checks.
Repository URLs must be unique across submissions.

Students can make up to five submission attempts per hour. Further attempts
receive HTTP `429` with a `Retry-After` header. This limiter is in-memory and
resets on server restart; on a multi-instance deployment, each instance has
its own limit. List results include pagination metadata. Students can only
retrieve their own submissions; a submission they do not own returns `404`.

### Mentor dashboard

All mentor endpoints require a valid token for a `MENTOR` account.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/teacher/statistics` | Get total, pending, approved, and rejected counts |
| `GET` | `/api/v1/teacher/submissions?page=1&limit=20` | List submissions |
| `GET` | `/api/v1/teacher/submissions?status=PENDING&page=1&limit=20` | Filter submissions by status |
| `PATCH` | `/api/v1/teacher/submissions/:submissionId/approve` | Approve a pending submission |
| `PATCH` | `/api/v1/teacher/submissions/:submissionId/reject` | Reject a pending submission |

The `status` filter accepts `PENDING`, `APPROVED`, or `REJECTED`. Page numbers
and limits must be positive integers; pagination defaults to page `1` and
limit `20`, with a maximum limit of `100`. Submission list results include
submitter name and email. Only pending submissions can be reviewed; attempts
to re-review a submission return HTTP `409`.

## Data model

Users have one of three roles: `STUDENT`, `MENTOR`, or `ADMIN`. New accounts
default to `STUDENT`. Submissions belong to a user and have one of three
statuses: `PENDING`, `APPROVED`, or `REJECTED`; new submissions default to
`PENDING`. Deleting a user also deletes their sessions, accounts, and
submissions.

Prisma schemas live in `prisma/schema/`, with migrations in
`prisma/migrations/`. After changing the schema, create and apply a migration
in development with:

```bash
bunx prisma migrate dev --name describe-your-change
bunx prisma generate
```

For production, apply committed migrations rather than creating new ones:

```bash
bunx prisma migrate deploy
```

## Deployment

The repository includes a Vercel configuration in `vercel.json`. Build the
application with `bun run build` and configure `DATABASE_URL`, `JWT_SECRET`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `FRONTEND_URL` in the deployment
environment. Apply pending database migrations with `bunx prisma migrate
deploy` as part of the release process. Do not use development migration
commands against a production database.

Set `FRONTEND_URL` to the deployed frontend's exact origin. Keep all secrets in
the hosting provider's environment-variable settings, not in source control.
Ensure the database is reachable from the deployment environment.

## Project structure

```text
prisma/
  migrations/      Database migration history
  schema/          Prisma models and enums
src/
  lib/             Authentication, JWT, and Prisma setup
  middleware/      Authentication, role checks, rate limit, error handling
  module/
    auth/          Registration and sign-in endpoints
    student/       Student submission endpoints
    teacher/       Mentor dashboard and review endpoints
  router/          Versioned API routes
```

## Contributing

Keep changes focused, add or update tests when behavior changes, and ensure
type-checking and the production build pass before opening a pull request:

```bash
bun run typecheck
bun run build
```
