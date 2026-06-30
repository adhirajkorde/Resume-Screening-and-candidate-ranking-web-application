import mongoose, { Document, Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Resume } from "./Resume";
import { JobDescription } from "./JobDescription";
import { CandidateScore } from "./CandidateScore";

export interface IUser {
  _id: string;
  email: string;
  password?: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => uuidv4() },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
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

// Cascade delete Resumes, JobDescriptions, and Scores when User is deleted
userSchema.pre('findOneAndDelete', async function() {
  const query = (this as any).getQuery();
  const userId = query._id;
  if (userId) {
    await Resume.deleteMany({ userId });
    await JobDescription.deleteMany({ userId });
    // CandidateScore deletion is handled by cascading down from Resume and JobDescription, 
    // or we can manually delete them here just to be safe.
  }
});

export const User = mongoose.model<IUser>("User", userSchema);
