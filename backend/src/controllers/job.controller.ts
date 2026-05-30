import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export class JobController {
  /**
   * Create a new Job Description
   */
  public static async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { title, description, skills, minExperience, education } = req.body;

      if (!title || !description) {
        res.status(400).json({ error: "Job title and description are required." });
        return;
      }

      // Convert skills to array if it is passed as comma-separated text or keep it if array
      let skillsArray: string[] = [];
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === "string" && skills.trim() !== "") {
        skillsArray = skills.split(",").map(s => s.trim()).filter(s => s.length > 0);
      }

      const jobDescription = await prisma.jobDescription.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          skills: skillsArray.join(","),
          minExperience: minExperience ? parseInt(minExperience, 10) : null,
          education: education ? education.trim() : null,
          userId: req.user.id
        }
      });

      const formattedJob = {
        ...jobDescription,
        skills: typeof jobDescription.skills === 'string' ? jobDescription.skills.split(',').filter(Boolean) : []
      };

      res.status(201).json({
        message: "Job description created successfully.",
        jobDescription: formattedJob
      });
    } catch (error: any) {
      console.error("Create job error:", error);
      res.status(500).json({ error: "Internal server error creating job description." });
    }
  }

  /**
   * List all job descriptions
   */
  public static async listJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const jobs = await prisma.jobDescription.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" }
      });

      const formattedJobs = jobs.map(job => ({
        ...job,
        skills: typeof job.skills === 'string' ? job.skills.split(',').filter(Boolean) : []
      }));

      res.status(200).json(formattedJobs);
    } catch (error: any) {
      console.error("List jobs error:", error);
      res.status(500).json({ error: "Internal server error retrieving job descriptions." });
    }
  }

  /**
   * Get specific job description details
   */
  public static async getJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { id } = req.params;

      const job = await prisma.jobDescription.findFirst({
        where: {
          id: id,
          userId: req.user.id
        }
      });

      if (!job) {
        res.status(404).json({ error: "Job description not found or access denied." });
        return;
      }

      const formattedJob = {
        ...job,
        skills: typeof job.skills === 'string' ? job.skills.split(',').filter(Boolean) : []
      };

      res.status(200).json(formattedJob);
    } catch (error: any) {
      console.error("Get job error:", error);
      res.status(500).json({ error: "Internal server error retrieving job description." });
    }
  }

  /**
   * Delete a job description
   */
  public static async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { id } = req.params;

      const job = await prisma.jobDescription.findFirst({
        where: {
          id: id,
          userId: req.user.id
        }
      });

      if (!job) {
        res.status(404).json({ error: "Job description not found or access denied." });
        return;
      }

      await prisma.jobDescription.delete({
        where: { id: id }
      });

      res.status(200).json({ message: "Job description deleted successfully." });
    } catch (error: any) {
      console.error("Delete job error:", error);
      res.status(500).json({ error: "Internal server error deleting job description." });
    }
  }
}
