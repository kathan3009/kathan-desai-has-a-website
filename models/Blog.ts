import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    excerpt: { type: String, default: "" },
    publishedAt: { type: Date, default: Date.now },
    dateModified: { type: Date, default: Date.now },
    tags: [{ type: String }],
    category: { type: String, default: "" },
    author: {
      name: { type: String, default: "Kathan Desai" },
      url: { type: String, default: "" },
    },
    featuredImage: { type: String, default: "" },
    videoEmbed: { type: String, default: "" },
    audioUrl: { type: String, default: "" },
    readCount: { type: Number, default: 0 },
    isTopStory: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
