"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/components/admin/api";
import { UploadCorsSetup } from "@/components/admin/uploadCorsSetup";
import { uploadFileDirect } from "@/components/admin/upload";
import { Feedback } from "@/components/admin/Feedback";
import { useUnsavedChanges } from "@/components/admin/useCollection";

const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/avif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];
type UploadResult = { url: string; name: string };

export default function AdminUploadsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [subdir, setSubdir] = useState("");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const locked = useRef(false);
  useUnsavedChanges(files.length > 0 || uploading);

  function handleFiles(list: FileList | null) {
    if (!list?.length || locked.current) return;
    const selected = Array.from(list);
    for (const file of selected) {
      const mime = file.type.toLowerCase();
      const image = imageTypes.includes(mime);
      if (!image && !videoTypes.includes(mime)) { setError(`“${file.name}” has an unsupported type. Choose a JPEG, PNG, GIF, WebP, AVIF, MP4, WebM, or MOV file.`); return; }
      const limit = image ? 5 : 25;
      if (!file.size || file.size > limit * 1024 * 1024) { setError(`“${file.name}” must be nonempty and no larger than ${limit} MB.`); return; }
    }
    setError(""); setNotice(""); setFiles(previous => [...previous, ...selected]);
  }
  async function copyLink(url: string) {
    setCopied(null);
    try { await navigator.clipboard.writeText(url); setCopied(url); setError(""); }
    catch { setError("Could not copy the link. Select the URL below and copy it manually."); }
  }
  async function upload() {
    if (locked.current || !files.length) return;
    locked.current = true; setUploading(true); setError(""); setNotice("");
    const queue = [...files]; let completed = 0;
    try {
      for (const file of queue) {
        const url = await uploadFileDirect(file, subdir, message => {
          setProgress(`${completed + 1} of ${queue.length}: ${file.name} — ${message}`);
        });
        // Commit each confirmed result immediately so later failures cannot hide its link.
        setResults(previous => [{ url, name: file.name }, ...previous]);
        completed += 1;
        setFiles(queue.slice(completed));
      }
      setNotice(`${completed} ${completed === 1 ? "file uploaded" : "files uploaded"}. Copy the links below to use them on your site.`);
    } catch (error) {
      setError(`Upload stopped at “${queue[completed]?.name}”. ${completed} of ${queue.length} confirmed; remaining files stay selected. ${errorMessage(error)}`);
    } finally { locked.current = false; setUploading(false); setProgress(""); }
  }
  return <section><header className="admin-heading"><div><h1>Uploads</h1><p>Upload images up to 5 MB or videos up to 25 MB to R2, then use their links in your content.</p></div></header>
    <Feedback error={error} notice={notice} />
    <UploadCorsSetup disabled={uploading} />
    <label className="admin-field"><span>Folder <small>(optional)</small></span><input placeholder="For example, blog or photos" value={subdir} disabled={uploading} onChange={event => setSubdir(event.target.value)} /><small>Groups uploaded files into a folder.</small></label>
    <div className="admin-upload-zone" data-active={dragActive} onDrop={event => { event.preventDefault(); setDragActive(false); handleFiles(event.dataTransfer.files); }} onDragOver={event => { event.preventDefault(); if (!uploading) setDragActive(true); }} onDragLeave={() => setDragActive(false)}>
      <label htmlFor="admin-files">Drop files here or choose files</label><input type="file" id="admin-files" multiple accept={[...imageTypes, ...videoTypes].join(",")} disabled={uploading} onChange={event => { handleFiles(event.target.files); event.target.value = ""; }} /><p>Images: JPEG, PNG, GIF, WebP, AVIF · Videos: MP4, WebM, MOV</p>
    </div>
    {!!files.length && <><h2>Selected files ({files.length})</h2><ul className="admin-upload-queue">{files.map((file,index) => <li key={`${index}-${file.name}`}><span>{file.name}</span><small>{(file.size / 1024).toFixed(1)} KB</small><button className="admin-danger" disabled={uploading} aria-label={`Remove ${file.name}`} onClick={() => setFiles(previous => previous.filter((_,i) => i !== index))}>Remove</button></li>)}</ul><button className="admin-button" disabled={uploading} onClick={upload}>{uploading ? "Uploading…" : "Upload to R2"}</button></>}
    {progress && <p role="status" className="admin-muted">{progress}</p>}
    {!!results.length && <div className="admin-upload-links"><div className="admin-list-heading"><h2>Uploaded links</h2></div><p className="admin-muted">Links from this session. Copy them into your content before leaving this page.</p>{results.map((result,index) => <div className="admin-record" key={`${result.url}-${index}`}><label className="admin-record-copy admin-field"><span>{result.name}</span><input aria-label={`URL for ${result.name}`} readOnly value={result.url} onFocus={event => event.target.select()} /></label><button className="admin-button-secondary" onClick={() => copyLink(result.url)}>{copied === result.url ? "Copied" : "Copy link"}</button></div>)}</div>}
  </section>;
}
