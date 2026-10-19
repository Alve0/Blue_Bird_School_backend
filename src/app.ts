import express, { type Application } from "express";
import cors from "cors";
import doten from "dotenv";

export const app: Application = express();
app.use(cors());
app.use(express.json());
doten.config();

app.get("/", (req, res) => {
  res.send("Hello World!");
});
