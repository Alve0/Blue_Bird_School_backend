import express, { type Application } from "express";
import cors from "cors";
import doten from "dotenv";
import { apiRouter } from "./router/router";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

export const app: Application = express();
app.use(cors());
app.use(express.json());
doten.config();

app.use("/api/v1", apiRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(globalErrorHandler);
