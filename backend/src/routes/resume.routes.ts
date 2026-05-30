import { Router } from "express";
import { ResumeController } from "../controllers/resume.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadMiddleware } from "../middleware/upload.middleware";

const router = Router();

// Protect all resume routes
router.use(authMiddleware as any);

router.post("/upload", uploadMiddleware.array("resumes", 15), ResumeController.uploadResumes as any);
router.get("/", ResumeController.listResumes as any);
router.get("/:id", ResumeController.getResume as any);
router.get("/:id/preview", ResumeController.previewFile as any);
router.delete("/:id", ResumeController.deleteResume as any);

export default router;
