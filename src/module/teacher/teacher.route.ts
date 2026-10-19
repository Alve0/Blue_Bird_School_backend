import { Router } from "express";
import { authenticateJwt } from "../../middleware/authenticateJwt";
import { requireRole } from "../../middleware/requireRole";
import {
  approveSubmissionController,
  rejectSubmissionController,
  submissionListController,
  submissionStatisticsController,
} from "./teacher.controller";

const teacherRouter = Router();

teacherRouter.use(authenticateJwt, requireRole("MENTOR"));
teacherRouter.get("/statistics", submissionStatisticsController);
teacherRouter.get("/submissions", submissionListController);
teacherRouter.patch(
  "/submissions/:submissionId/approve",
  approveSubmissionController,
);
teacherRouter.patch(
  "/submissions/:submissionId/reject",
  rejectSubmissionController,
);

export { teacherRouter };
