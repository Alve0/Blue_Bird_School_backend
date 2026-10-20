import express, { type Application } from "express";
import cors from "cors";
import doten from "dotenv";
import { apiRouter } from "./router/router";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

const app: Application = express();
app.use(cors());
app.use(express.json());
doten.config();

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/api/v1", apiRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello World!");
});

app.use(globalErrorHandler);

export default app;
