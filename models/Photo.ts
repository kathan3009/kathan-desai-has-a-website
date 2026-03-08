import mongoose from "mongoose";

const PhotoSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    caption: { type: String, default: "" },
    category: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Photo || mongoose.model("Photo", PhotoSchema);
