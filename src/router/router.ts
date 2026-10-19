import { Router } from "express";
import { authRouter } from "../module/auth/auth.route";

const router: Router = Router();

router.use("/auth", authRouter);

router.get("/health", (req, res) => {
  res.status(200).send("Health check passed");
});

export const apiRouter: Router = router;
