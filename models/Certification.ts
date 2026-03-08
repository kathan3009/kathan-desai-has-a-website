import mongoose from "mongoose";

const CertificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    date: { type: String, required: true },
    url: { type: String, default: "" },
    credentialId: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Certification || mongoose.model("Certification", CertificationSchema);
