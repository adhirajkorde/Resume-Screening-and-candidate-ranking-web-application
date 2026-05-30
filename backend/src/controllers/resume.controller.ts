import { Response } from "express";
import fs from "fs";
import path from "path";
import prisma from "../utils/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ParserService } from "../services/parser.service";

export class ResumeController {
  /**
   * Upload and parse single or multiple resumes
   */
  public static async uploadResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded. Please upload PDF, DOC, or DOCX documents." });
        return;
      }

      const userId = req.user.id;
      const uploadedResumes = [];
      const errors = [];

      for (const file of files) {
        try {
          // Read file buffer to parse
          const fileBuffer = fs.readFileSync(file.path);
          
          // Parse resume text and extract candidate parameters
          const parsedData = await ParserService.parseResume(fileBuffer, file.mimetype);

          // Get file type extension
          const fileType = path.extname(file.originalname).substring(1).toLowerCase() || "pdf";

          // Save in database
          const resume = await prisma.resume.create({
            data: {
              filename: file.originalname,
              filePath: file.path,
              fileType: fileType,
              parsedText: parsedData.parsedText,
              candidateName: parsedData.candidateName,
              candidateEmail: parsedData.candidateEmail,
              candidatePhone: parsedData.candidatePhone,
              candidateSkills: parsedData.candidateSkills.join(","),
              candidateEducation: parsedData.candidateEducation,
              candidateExperience: parsedData.candidateExperience,
              userId: userId
            }
          });

          const formattedResume = {
            ...resume,
            candidateSkills: typeof resume.candidateSkills === 'string' ? resume.candidateSkills.split(',').filter(Boolean) : []
          };

          uploadedResumes.push(formattedResume);
        } catch (fileError: any) {
          console.error(`Error parsing file ${file.originalname}:`, fileError);
          // Attempt to delete physical file if parsing failed
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          errors.push({
            filename: file.originalname,
            error: fileError.message || "Failed to parse document"
          });
        }
      }

      res.status(201).json({
        message: `Successfully uploaded and parsed ${uploadedResumes.length} resume(s).`,
        resumes: uploadedResumes,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Resume upload controller error:", error);
      res.status(500).json({ error: "Internal server error during resume upload." });
    }
  }

  /**
   * List all resumes uploaded by user
   */
  public static async listResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const resumes = await prisma.resume.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          scores: {
            select: {
              id: true,
              score: true,
              jobDescriptionId: true
            }
          }
        }
      });

      const formattedResumes = resumes.map(r => ({
        ...r,
        candidateSkills: typeof r.candidateSkills === 'string' ? r.candidateSkills.split(',').filter(Boolean) : []
      }));

      res.status(200).json(formattedResumes);
    } catch (error: any) {
      console.error("List resumes error:", error);
      res.status(500).json({ error: "Internal server error retrieving resumes." });
    }
  }

  /**
   * Get specific resume details
   */
  public static async getResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { id } = req.params;

      const resume = await prisma.resume.findFirst({
        where: {
          id: id,
          userId: req.user.id
        },
        include: {
          scores: {
            include: {
              jobDescription: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      });

      if (!resume) {
        res.status(404).json({ error: "Resume not found or access denied." });
        return;
      }

      const formattedResume = {
        ...resume,
        candidateSkills: typeof resume.candidateSkills === 'string' ? resume.candidateSkills.split(',').filter(Boolean) : []
      };

      res.status(200).json(formattedResume);
    } catch (error: any) {
      console.error("Get resume error:", error);
      res.status(500).json({ error: "Internal server error retrieving resume details." });
    }
  }

  /**
   * Download or serve physical file for preview
   */
  public static async previewFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { id } = req.params;

      const resume = await prisma.resume.findFirst({
        where: {
          id: id,
          userId: req.user.id
        }
      });

      if (!resume) {
        res.status(404).json({ error: "Resume file not found." });
        return;
      }

      if (!fs.existsSync(resume.filePath)) {
        res.status(404).json({ error: "Physical file does not exist on disk." });
        return;
      }

      // Serve the file
      res.sendFile(path.resolve(resume.filePath));
    } catch (error: any) {
      console.error("Preview file error:", error);
      res.status(500).json({ error: "Internal server error serving document." });
    }
  }

  /**
   * Delete a resume (cascades scores automatically)
   */
  public static async deleteResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const { id } = req.params;

      const resume = await prisma.resume.findFirst({
        where: {
          id: id,
          userId: req.user.id
        }
      });

      if (!resume) {
        res.status(404).json({ error: "Resume not found or access denied." });
        return;
      }

      // Delete database record
      await prisma.resume.delete({
        where: { id: id }
      });

      // Delete physical file on disk
      if (fs.existsSync(resume.filePath)) {
        fs.unlinkSync(resume.filePath);
      }

      res.status(200).json({ message: "Resume deleted successfully." });
    } catch (error: any) {
      console.error("Delete resume error:", error);
      res.status(500).json({ error: "Internal server error deleting resume." });
    }
  }
}
