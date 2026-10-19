import { Router } from "express";
import { authRouter } from "../module/auth/auth.route";
import { teacherRouter } from "../module/teacher/teacher.route";

const router: Router = Router();

router.use("/auth", authRouter);
router.use("/teacher", teacherRouter);

router.get("/health", (req, res) => {
  res.status(200).send("Health check passed");
});

export const apiRouter: Router = router;
