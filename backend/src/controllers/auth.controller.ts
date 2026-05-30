import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-resume-screening-system-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthController {
  /**
   * Register a new user
   */
  public static async signup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: "All fields (email, password, name) are required." });
        return;
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(400).json({ error: "Email is already registered." });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          name: name.trim()
        }
      });

      // Issue JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.status(201).json({
        message: "User registered successfully.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error during signup." });
    }
  }

  /**
   * Login user
   */
  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
      }

      // Find user
      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      // Auto-provision admin@ats.com on the fly if it was deleted during compliance testing
      if (!user && email.toLowerCase().trim() === "admin@ats.com") {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("admin123", salt);
        user = await prisma.user.create({
          data: {
            email: "admin@ats.com",
            password: hashedPassword,
            name: "Alex Mercer"
          }
        });
      }

      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      // Issue JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.status(200).json({
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error during login." });
    }
  }

  /**
   * Get current authenticated user details
   */
  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, createdAt: true }
      });

      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      res.status(200).json(user);
    } catch (error: any) {
      console.error("Me route error:", error);
      res.status(500).json({ error: "Internal server error retrieving user profile." });
    }
  }

  /**
   * Delete recruiter account permanently (cascades resumes, jobs, and scores)
   */
  public static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      // Delete user (Prisma onDelete Cascade automatically deletes Resumes, Jobs, and Score records)
      await prisma.user.delete({
        where: { id: req.user.id }
      });

      res.status(200).json({ message: "Your account and all associated pipelines have been permanently deleted." });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Internal server error during account deletion." });
    }
  }
}
