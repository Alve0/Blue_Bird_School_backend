import { Router } from "express";
import { authenticateJwt } from "../../middleware/authenticateJwt";
import {
  currentUserController,
  registerController,
  signInController,
  signOutController,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/signup", registerController);
authRouter.post("/signin", signInController);
authRouter.get("/me", authenticateJwt, currentUserController);
authRouter.post("/signout", authenticateJwt, signOutController);

export { authRouter };