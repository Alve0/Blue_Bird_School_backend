import { Router } from "express";

const router: Router = Router();

router.get("/health", (req, res) => {
  res.status(200).send("Health check passed");
});

export const apiRouter: Router = router;
