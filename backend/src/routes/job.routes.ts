import { Router } from "express";
import { JobController } from "../controllers/job.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Protect all job routes
router.use(authMiddleware as any);

router.post("/", JobController.createJob as any);
router.get("/", JobController.listJobs as any);
router.get("/:id", JobController.getJob as any);
router.delete("/:id", JobController.deleteJob as any);

export default router;
