import express, { type Application } from "express";
import cors from "cors";
import doten from "dotenv";
import { apiRouter } from "./router/router";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";

export const app: Application = express();
app.use(cors());
app.use(express.json());
doten.config();

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/api/v1", apiRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});
