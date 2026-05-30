import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ScoringService } from "../services/scoring.service";

export class AnalysisController {
  /**
   * Run matching analysis on all user resumes against a job description
   */
  public static async analyzeResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { jobDescriptionId } = req.body;

      if (!jobDescriptionId) {
        res.status(400).json({ error: "jobDescriptionId is required." });
        return;
      }

      // Check job description existence
      const jobDescription = await prisma.jobDescription.findFirst({
        where: {
          id: jobDescriptionId,
          userId: req.user.id
        }
      });

      if (!jobDescription) {
        res.status(404).json({ error: "Job Description not found or access denied." });
        return;
      }

      // Fetch all resumes for the user
      // Fetch all resumes for the user
      const resumes = await prisma.resume.findMany({
        where: { userId: req.user.id }
      });

      if (resumes.length === 0) {
        res.status(400).json({ error: "No resumes found. Please upload resumes before initiating analysis." });
        return;
      }

      const results = [];

      for (const resume of resumes) {
        const resumeSkills = typeof resume.candidateSkills === "string"
          ? resume.candidateSkills.split(",").filter(Boolean)
          : [];

        // Calculate score breaks and overview
        const scoreResult = ScoringService.calculateScore(
          resumeSkills,
          resume.parsedText || "",
          resume.candidateExperience || "",
          resume.candidateEducation || "",
          jobDescription
        );

        // Upsert matching score
        const candidateScore = await prisma.candidateScore.upsert({
          where: {
            resumeId_jobDescriptionId: {
              resumeId: resume.id,
              jobDescriptionId: jobDescription.id
            }
          },
          update: {
            score: scoreResult.score,
            matchingSkills: scoreResult.matchingSkills.join(","),
            missingSkills: scoreResult.missingSkills.join(","),
            experienceScore: scoreResult.experienceScore,
            educationScore: scoreResult.educationScore,
            skillsScore: scoreResult.skillsScore,
            overallSummary: scoreResult.overallSummary,
            topStrengths: scoreResult.topStrengths.join(",")
          },
          create: {
            resumeId: resume.id,
            jobDescriptionId: jobDescription.id,
            score: scoreResult.score,
            matchingSkills: scoreResult.matchingSkills.join(","),
            missingSkills: scoreResult.missingSkills.join(","),
            experienceScore: scoreResult.experienceScore,
            educationScore: scoreResult.educationScore,
            skillsScore: scoreResult.skillsScore,
            overallSummary: scoreResult.overallSummary,
            topStrengths: scoreResult.topStrengths.join(",")
          }
        });

        results.push({
          candidateName: resume.candidateName,
          candidateEmail: resume.candidateEmail,
          resumeId: resume.id,
          scoreDetails: candidateScore
        });
      }

      // Fetch all scores for this JD, ordered highest to lowest
      const rankings = await prisma.candidateScore.findMany({
        where: {
          jobDescriptionId: jobDescription.id,
          resume: {
            userId: req.user.id
          }
        },
        include: {
          resume: {
            select: {
              id: true,
              candidateName: true,
              candidateEmail: true,
              candidatePhone: true,
              candidateSkills: true,
              candidateEducation: true,
              candidateExperience: true,
              fileType: true
            }
          }
        },
        orderBy: {
          score: "desc"
        }
      });

      const formattedRankings = rankings.map(r => ({
        ...r,
        matchingSkills: typeof r.matchingSkills === "string" ? r.matchingSkills.split(",").filter(Boolean) : [],
        missingSkills: typeof r.missingSkills === "string" ? r.missingSkills.split(",").filter(Boolean) : [],
        topStrengths: typeof r.topStrengths === "string" ? r.topStrengths.split(",").filter(Boolean) : [],
        resume: {
          ...r.resume,
          candidateSkills: typeof r.resume.candidateSkills === "string" ? r.resume.candidateSkills.split(",").filter(Boolean) : []
        }
      }));

      res.status(200).json({
        message: "Analysis completed successfully.",
        rankings: formattedRankings
      });
    } catch (error: any) {
      console.error("Resume analysis error:", error);
      res.status(500).json({ error: "Internal server error during analysis." });
    }
  }

  /**
   * Get candidates ranking for a specific Job Description
   */
  public static async getRankings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { jobDescriptionId } = req.params;

      const rankings = await prisma.candidateScore.findMany({
        where: {
          jobDescriptionId: jobDescriptionId,
          resume: {
            userId: req.user.id
          }
        },
        include: {
          resume: {
            select: {
              id: true,
              candidateName: true,
              candidateEmail: true,
              candidatePhone: true,
              candidateSkills: true,
              candidateEducation: true,
              candidateExperience: true,
              fileType: true
            }
          }
        },
        orderBy: {
          score: "desc"
        }
      });

      const formattedRankings = rankings.map(r => ({
        ...r,
        matchingSkills: typeof r.matchingSkills === "string" ? r.matchingSkills.split(",").filter(Boolean) : [],
        missingSkills: typeof r.missingSkills === "string" ? r.missingSkills.split(",").filter(Boolean) : [],
        topStrengths: typeof r.topStrengths === "string" ? r.topStrengths.split(",").filter(Boolean) : [],
        resume: {
          ...r.resume,
          candidateSkills: typeof r.resume.candidateSkills === "string" ? r.resume.candidateSkills.split(",").filter(Boolean) : []
        }
      }));

      res.status(200).json(formattedRankings);
    } catch (error: any) {
      console.error("Get rankings error:", error);
      res.status(500).json({ error: "Internal server error retrieving rankings." });
    }
  }

  /**
   * Export the ranking results for a Job Description as a CSV download
   */
  public static async exportRankingsCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { jobDescriptionId } = req.params;

      const jd = await prisma.jobDescription.findFirst({
        where: {
          id: jobDescriptionId,
          userId: req.user.id
        }
      });

      if (!jd) {
        res.status(404).json({ error: "Job description not found." });
        return;
      }

      const rankings = await prisma.candidateScore.findMany({
        where: {
          jobDescriptionId: jobDescriptionId,
          resume: {
            userId: req.user.id
          }
        },
        include: {
          resume: true
        },
        orderBy: {
          score: "desc"
        }
      });

      const formattedRankings = rankings.map(r => ({
        ...r,
        matchingSkills: typeof r.matchingSkills === "string" ? r.matchingSkills.split(",").filter(Boolean) : [],
        missingSkills: typeof r.missingSkills === "string" ? r.missingSkills.split(",").filter(Boolean) : [],
        topStrengths: typeof r.topStrengths === "string" ? r.topStrengths.split(",").filter(Boolean) : [],
        resume: {
          ...r.resume,
          candidateSkills: typeof r.resume.candidateSkills === "string" ? r.resume.candidateSkills.split(",").filter(Boolean) : []
        }
      }));

      // Construct CSV content
      const headers = [
        "Rank",
        "Candidate Name",
        "Email",
        "Phone",
        "Match Score",
        "Matching Skills",
        "Missing Skills",
        "Experience",
        "Education"
      ];

      const csvRows = [headers.join(",")];

      formattedRankings.forEach((rank, index) => {
        const row = [
          index + 1,
          `"${(rank.resume.candidateName || "Unknown").replace(/"/g, '""')}"`,
          `"${(rank.resume.candidateEmail || "N/A").replace(/"/g, '""')}"`,
          `"${(rank.resume.candidatePhone || "N/A").replace(/"/g, '""')}"`,
          `${rank.score}%`,
          `"${(rank.matchingSkills || []).join(", ").replace(/"/g, '""')}"`,
          `"${(rank.missingSkills || []).join(", ").replace(/"/g, '""')}"`,
          `"${(rank.resume.candidateExperience || "N/A").replace(/"/g, '""')}"`,
          `"${(rank.resume.candidateEducation || "N/A").replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\n");
      const filename = `${jd.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_rankings.csv`;

      // Set download headers
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.status(200).send(csvString);
    } catch (error: any) {
      console.error("CSV Export error:", error);
      res.status(500).json({ error: "Internal server error during CSV export." });
    }
  }
}
