import mongoose, { Document, Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { CandidateScore } from "./CandidateScore";

export interface IResume {
  _id: string;
  filename: string;
  filePath: string;
  fileType: string;
  parsedText: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateSkills: string;
  candidateEducation?: string;
  candidateExperience?: string;
  userId: string;
  scores?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    _id: { type: String, default: () => uuidv4() },
    filename: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    parsedText: { type: String, required: true },
    candidateName: { type: String },
    candidateEmail: { type: String },
    candidatePhone: { type: String },
    candidateSkills: { type: String, required: true },
    candidateEducation: { type: String },
    candidateExperience: { type: String },
    userId: { type: String, ref: "User", required: true },
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

// Virtual for Scores
resumeSchema.virtual('scores', {
  ref: 'CandidateScore',
  localField: '_id',
  foreignField: 'resumeId'
});

// Cascade delete CandidateScores when Resume is deleted
resumeSchema.pre('findOneAndDelete', async function() {
  const query = (this as any).getQuery();
  const resumeId = query._id;
  if (resumeId) {
    await CandidateScore.deleteMany({ resumeId });
  }
});

// We also need hooks for deleteMany if used
resumeSchema.pre('deleteMany', async function() {
  const query = (this as any).getQuery();
  const resumes = await Resume.find(query);
  for (const resume of resumes) {
    await CandidateScore.deleteMany({ resumeId: resume._id });
  }
});

export const Resume = mongoose.model<IResume>("Resume", resumeSchema);
