import { Router } from "express";
import { AnalysisController } from "../controllers/analysis.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Protect all analysis routes
router.use(authMiddleware as any);

router.post("/", AnalysisController.analyzeResumes as any);
router.get("/rankings/:jobDescriptionId", AnalysisController.getRankings as any);
router.get("/export/:jobDescriptionId", AnalysisController.exportRankingsCSV as any);

export default router;
