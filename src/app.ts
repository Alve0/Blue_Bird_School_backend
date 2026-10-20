import "dotenv/config";

import express, { type Application } from "express";
import cors from "cors";
import { apiRouter } from "./router/router";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

const app: Application = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/api/v1", apiRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello World!");
});

app.use(globalErrorHandler);

export default app;
