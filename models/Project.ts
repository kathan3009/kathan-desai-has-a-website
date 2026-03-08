import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    techStack: [{ type: String }],
    repoUrl: { type: String, default: "" },
    liveUrl: { type: String, default: "" },
    image: { type: String, default: "" },
    type: { type: String, enum: ["py", "other"], default: "other" },
    publishedAt: { type: Date, default: Date.now },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
