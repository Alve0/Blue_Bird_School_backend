import { Router } from "express";
import { authenticateJwt } from "../../middleware/authenticateJwt";
import { requireRole } from "../../middleware/requireRole";
import { submissionRateLimit } from "../../middleware/submissionRateLimit";
import {
  createSubmissionController,
  studentSubmissionDetailController,
  studentSubmissionListController,
} from "./student.controller";

const studentRouter = Router();

studentRouter.use(authenticateJwt, requireRole("STUDENT"));
studentRouter.post(
  "/submissions",
  submissionRateLimit,
  createSubmissionController,
);
studentRouter.get("/submissions", studentSubmissionListController);
studentRouter.get(
  "/submissions/:submissionId",
  studentSubmissionDetailController,
);

export { studentRouter };
