import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";
import jobRoutes from "./routes/job.routes";
import analysisRoutes from "./routes/analysis.routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5088;

// Apply security headers via helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply API Rate Limiting to prevent DOS and brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Allow up to 500 requests per 15 minutes per IP for local development testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

// Middleware
app.use(cors({
  origin: "*", // Adjust for specific production frontend origins in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets securely if needed (e.g. locally hosted files)
// Handled securely via the Controller to prevent public path traversals.

// Main Routes
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/analysis", analysisRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Centralized error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Centralized Error Handler triggered:", err);
  const status = err.status || 500;
  const message = err.message || "An unexpected error occurred in the system.";
  res.status(status).json({ error: message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  ATS RESUME SCREENING SERVER ALIVE ON PORT ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});
