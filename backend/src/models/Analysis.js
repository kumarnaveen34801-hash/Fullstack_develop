import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    resumeName: { type: String, required: true, maxlength: 255 },
    jobDescription: { type: String, required: true, trim: true, maxlength: 20000 },
    score: { type: Number, required: true, min: 0, max: 100 },
    foundSkills: { type: [String], required: true },
    missingSkills: { type: [String], required: true },
    usedJobDescription: { type: Boolean, required: true },
    fellBackToList: { type: Boolean, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Analysis", analysisSchema);
