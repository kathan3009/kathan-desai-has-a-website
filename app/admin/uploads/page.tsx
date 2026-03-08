"use client";

import { useState, useCallback } from "react";

const IMAGE_MAX_MB = 5;
const VIDEO_MAX_MB = 25;

type UploadResult = { url: string; name: string };

export default function AdminUploadsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [subdir, setSubdir] = useState("");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const validateFiles = useCallback((fileList: File[]): string | null => {
    const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/avif"];
    const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

    for (const file of fileList) {
      const mime = file.type?.toLowerCase();
      const isImage = imageTypes.includes(mime);
      const isVideo = videoTypes.includes(mime);

      if (!isImage && !isVideo) {
        return `"${file.name}" has invalid type. Allowed: images (JPEG, PNG, GIF, WebP, AVIF) and videos (MP4, WebM, MOV).`;
      }
      if (isImage && file.size > IMAGE_MAX_MB * 1024 * 1024) {
        return `"${file.name}" exceeds ${IMAGE_MAX_MB}MB limit for images.`;
      }
      if (isVideo && file.size > VIDEO_MAX_MB * 1024 * 1024) {
        return `"${file.name}" exceeds ${VIDEO_MAX_MB}MB limit for videos.`;
      }
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const arr = Array.from(fileList);
      const err = validateFiles(arr);
      if (err) {
        setError(err);
        return;
      }
      setError("");
      setFiles((prev) => [...prev, ...arr]);
    },
    [validateFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  async function handleUpload() {
    if (!files.length) {
      setError("Select at least one file.");
      return;
    }

    setUploading(true);
    setError("");
    const newResults: UploadResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      if (subdir.trim()) formData.append("subdir", subdir.trim());

      const res = await fetch("/api/admin/upload-r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      newResults.push({ url: data.url, name: file.name });
    }

    setResults((prev) => [...newResults, ...prev]);
    setFiles([]);
    setUploading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">Uploads</h1>
      <p className="text-muted text-sm mb-6">
        Upload images (max {IMAGE_MAX_MB}MB) or videos (max {VIDEO_MAX_MB}MB) to R2. Copy the link to use anywhere.
      </p>

      <div className="mb-6 p-4 bg-card rounded border border-border space-y-3">
        <label className="block text-sm font-medium text-foreground">Folder (optional)</label>
        <input
          placeholder="e.g. blog, photos"
          value={subdir}
          onChange={(e) => setSubdir(e.target.value)}
          className="w-full max-w-xs px-3 py-2 bg-background border border-border rounded text-foreground"
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mb-6 p-8 rounded border-2 border-dashed transition-colors ${
          dragActive ? "border-accent bg-accent/5" : "border-border bg-card/50"
        }`}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <label
          htmlFor="file-input"
          className="flex flex-col items-center justify-center cursor-pointer text-center"
        >
          <span className="text-muted mb-2">Drag & drop or click to select</span>
          <span className="text-sm text-muted">Images: JPEG, PNG, GIF, WebP, AVIF · Videos: MP4, WebM, MOV</span>
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-2">Selected ({files.length})</p>
          <ul className="space-y-2 mb-4">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between py-2 px-3 bg-card rounded border border-border">
                <span className="text-foreground truncate">{f.name}</span>
                <span className="text-muted text-sm">{(f.size / 1024).toFixed(1)} KB</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-2 bg-accent text-black font-medium rounded disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload to R2"}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-foreground mb-3">Uploaded links</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-card rounded border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted truncate">{r.name}</p>
                  <p className="text-foreground text-sm truncate font-mono">{r.url}</p>
                </div>
                <button
                  onClick={() => copyLink(r.url)}
                  className="px-3 py-1.5 text-sm bg-accent text-black font-medium rounded shrink-0"
                >
                  {copied === r.url ? "Copied!" : "Copy link"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
