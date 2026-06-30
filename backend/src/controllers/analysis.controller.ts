import { Response } from "express";
import { JobDescription } from "../models/JobDescription";
import { Resume } from "../models/Resume";
import { CandidateScore } from "../models/CandidateScore";
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
      const jobDescription = await JobDescription.findOne({
        _id: jobDescriptionId,
        userId: req.user.id
      });

      if (!jobDescription) {
        res.status(404).json({ error: "Job Description not found or access denied." });
        return;
      }

      // Fetch all resumes for the user
      const resumes = await Resume.find({ userId: req.user.id });

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
        const candidateScore = await CandidateScore.findOneAndUpdate(
          {
            resumeId: resume.id,
            jobDescriptionId: jobDescription.id
          },
          {
            score: scoreResult.score,
            matchingSkills: scoreResult.matchingSkills.join(","),
            missingSkills: scoreResult.missingSkills.join(","),
            experienceScore: scoreResult.experienceScore,
            educationScore: scoreResult.educationScore,
            skillsScore: scoreResult.skillsScore,
            overallSummary: scoreResult.overallSummary,
            topStrengths: scoreResult.topStrengths.join(",")
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        results.push({
          candidateName: resume.candidateName,
          candidateEmail: resume.candidateEmail,
          resumeId: resume.id,
          scoreDetails: candidateScore
        });
      }

      // Fetch all scores for this JD, ordered highest to lowest
      const rankings = await CandidateScore.find({
        jobDescriptionId: jobDescription.id
      })
      .populate('resume')
      .sort({ score: -1 });
      
      // Filter out scores where the populated resume doesn't belong to this user (extra safety)
      const userRankings = rankings.filter(r => {
        const resObj: any = r.resume;
        return resObj && resObj.userId === req.user?.id;
      });

      const formattedRankings = userRankings.map(r => {
        const rankObj = r.toJSON();
        return {
          ...rankObj,
          matchingSkills: typeof rankObj.matchingSkills === "string" ? rankObj.matchingSkills.split(",").filter(Boolean) : [],
          missingSkills: typeof rankObj.missingSkills === "string" ? rankObj.missingSkills.split(",").filter(Boolean) : [],
          topStrengths: typeof rankObj.topStrengths === "string" ? rankObj.topStrengths.split(",").filter(Boolean) : [],
          resume: {
            ...(rankObj.resume as any),
            candidateSkills: typeof (rankObj.resume as any).candidateSkills === "string" ? (rankObj.resume as any).candidateSkills.split(",").filter(Boolean) : []
          }
        };
      });

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

      const rankings = await CandidateScore.find({
        jobDescriptionId: jobDescriptionId
      })
      .populate('resume')
      .sort({ score: -1 });

      const userRankings = rankings.filter(r => {
        const resObj: any = r.resume;
        return resObj && resObj.userId === req.user?.id;
      });

      const formattedRankings = userRankings.map(r => {
        const rankObj = r.toJSON();
        return {
          ...rankObj,
          matchingSkills: typeof rankObj.matchingSkills === "string" ? rankObj.matchingSkills.split(",").filter(Boolean) : [],
          missingSkills: typeof rankObj.missingSkills === "string" ? rankObj.missingSkills.split(",").filter(Boolean) : [],
          topStrengths: typeof rankObj.topStrengths === "string" ? rankObj.topStrengths.split(",").filter(Boolean) : [],
          resume: {
            ...(rankObj.resume as any),
            candidateSkills: typeof (rankObj.resume as any).candidateSkills === "string" ? (rankObj.resume as any).candidateSkills.split(",").filter(Boolean) : []
          }
        };
      });

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

      const jd = await JobDescription.findOne({
        _id: jobDescriptionId,
        userId: req.user.id
      });

      if (!jd) {
        res.status(404).json({ error: "Job description not found." });
        return;
      }

      const rankings = await CandidateScore.find({
        jobDescriptionId: jobDescriptionId
      })
      .populate('resume')
      .sort({ score: -1 });
      
      const userRankings = rankings.filter(r => {
        const resObj: any = r.resume;
        return resObj && resObj.userId === req.user?.id;
      });

      const formattedRankings = userRankings.map(r => {
        const rankObj = r.toJSON();
        return {
          ...rankObj,
          matchingSkills: typeof rankObj.matchingSkills === "string" ? rankObj.matchingSkills.split(",").filter(Boolean) : [],
          missingSkills: typeof rankObj.missingSkills === "string" ? rankObj.missingSkills.split(",").filter(Boolean) : [],
          topStrengths: typeof rankObj.topStrengths === "string" ? rankObj.topStrengths.split(",").filter(Boolean) : [],
          resume: {
            ...(rankObj.resume as any),
            candidateSkills: typeof (rankObj.resume as any).candidateSkills === "string" ? (rankObj.resume as any).candidateSkills.split(",").filter(Boolean) : []
          }
        };
      });

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

      formattedRankings.forEach((rank: any, index) => {
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
