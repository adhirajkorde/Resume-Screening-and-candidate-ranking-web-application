import mongoose, { Document, Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface ICandidateScore {
  _id: string;
  score: number;
  matchingSkills: string;
  missingSkills: string;
  experienceScore: number;
  educationScore: number;
  skillsScore: number;
  overallSummary?: string;
  topStrengths: string;
  resumeId: string;
  jobDescriptionId: string;
  resume?: any;
  createdAt: Date;
  updatedAt: Date;
}

const candidateScoreSchema = new Schema<ICandidateScore>(
  {
    _id: { type: String, default: () => uuidv4() },
    score: { type: Number, required: true },
    matchingSkills: { type: String, required: true },
    missingSkills: { type: String, required: true },
    experienceScore: { type: Number, required: true },
    educationScore: { type: Number, required: true },
    skillsScore: { type: Number, required: true },
    overallSummary: { type: String },
    topStrengths: { type: String, required: true },
    resumeId: { type: String, ref: "Resume", required: true },
    jobDescriptionId: { type: String, ref: "JobDescription", required: true },
  },
  { 
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

// Ensure unique combination of resume and job description (equivalent to @@unique in Prisma)
candidateScoreSchema.index({ resumeId: 1, jobDescriptionId: 1 }, { unique: true });

export const CandidateScore = mongoose.model<ICandidateScore>("CandidateScore", candidateScoreSchema);
