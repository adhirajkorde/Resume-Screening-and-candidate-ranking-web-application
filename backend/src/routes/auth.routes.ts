import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", AuthController.signup as any);
router.post("/login", AuthController.login as any);
router.get("/me", authMiddleware as any, AuthController.me as any);
router.delete("/delete-account", authMiddleware as any, AuthController.deleteAccount as any);

export default router;
