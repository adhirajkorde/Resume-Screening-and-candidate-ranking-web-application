import mongoose, { Document, Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { CandidateScore } from "./CandidateScore";

export interface IJobDescription {
  _id: string;
  title: string;
  description: string;
  skills: string;
  minExperience?: number;
  education?: string;
  userId: string;
  scores?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const jobDescriptionSchema = new Schema<IJobDescription>(
  {
    _id: { type: String, default: () => uuidv4() },
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: { type: String, required: true },
    minExperience: { type: Number },
    education: { type: String },
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
jobDescriptionSchema.virtual('scores', {
  ref: 'CandidateScore',
  localField: '_id',
  foreignField: 'jobDescriptionId'
});

// Cascade delete CandidateScores when JobDescription is deleted
jobDescriptionSchema.pre('findOneAndDelete', async function() {
  const query = (this as any).getQuery();
  const jobDescriptionId = query._id;
  if (jobDescriptionId) {
    await CandidateScore.deleteMany({ jobDescriptionId });
  }
});

// We also need hooks for deleteMany if used
jobDescriptionSchema.pre('deleteMany', async function() {
  const query = (this as any).getQuery();
  const jobs = await JobDescription.find(query);
  for (const job of jobs) {
    await CandidateScore.deleteMany({ jobDescriptionId: job._id });
  }
});

export const JobDescription = mongoose.model<IJobDescription>("JobDescription", jobDescriptionSchema);
