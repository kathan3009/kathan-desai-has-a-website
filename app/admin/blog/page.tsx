"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ADMIN_PATH } from "@/lib/adminPath";
import { adminRequest } from "@/components/admin/api";
import { Feedback } from "@/components/admin/Feedback";
import { useCollection, useUnsavedChanges } from "@/components/admin/useCollection";

const emptyForm = { title: "", slug: "", content: "", excerpt: "", tags: "", featuredImage: "", videoEmbed: "", category: "", isTopStory: false, isDraft: false };
type Blog = { _id: string; title: string; slug: string; content: string; excerpt: string; publishedAt: string; tags: string[]; featuredImage?: string; videoEmbed?: string; audioUrl?: string; category?: string; isTopStory?: boolean; isDraft?: boolean; readCount?: number };
function slugify(value: string) { return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }

export default function AdminBlogPage() {
  const collection = useCollection<Blog>("blog");
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [baseline, setBaseline] = useState(emptyForm);
  const [preview, setPreview] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const editor = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useUnsavedChanges(dirty || collection.pending);
  const currentAudio = collection.items.find(item => item._id === editing?._id)?.audioUrl;
  function reset() { setForm(emptyForm); setBaseline(emptyForm); setEditing(null); setPreview(false); setValidationError(""); }
  function edit(item: Blog) {
    if (dirty && !confirm("Discard unsaved changes and edit this article?")) return;
    const next = { title: item.title, slug: item.slug, content: item.content || "", excerpt: item.excerpt || "", tags: item.tags?.join(", ") || "", featuredImage: item.featuredImage || "", videoEmbed: item.videoEmbed || "", category: item.category || "", isTopStory: item.isTopStory ?? false, isDraft: item.isDraft ?? false };
    setEditing(item); setForm(next); setBaseline(next); setPreview(false); setValidationError("");
    editor.current?.scrollIntoView({ behavior: "instant", block: "start" });
    editor.current?.querySelector("input")?.focus({ preventScroll: true });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setValidationError("");
    const slug = form.slug.trim() || slugify(form.title);
    if (!form.title.trim() || !form.content.trim() || !slug) {
      setValidationError("Add a title, article content, and a URL slug before saving."); setPreview(false); return;
    }
    const body = { ...form, slug, tags: form.tags.split(",").map(value => value.trim()).filter(Boolean), featuredImage: form.featuredImage.trim(), videoEmbed: form.videoEmbed.trim(), category: form.category.trim() };
    if (await collection.save(body, editing?._id)) reset();
  }
  async function generateAudio(item: Blog) {
    if (collection.pending) return;
    if (item._id === editing?._id && dirty) { setValidationError("Save this article before generating audio. Audio uses the saved article content."); return; }
    if (item.audioUrl && !confirm(`Replace the existing audio for “${item.title}”?`)) return;
    setGeneratingId(item._id);
    await collection.mutate(async () => {
      const result = await adminRequest<{ audioUrl?: string }>(`/api/admin/blog/${item._id}/generate-audio`, { method: "POST" });
      if (!result.audioUrl) throw new Error("The server did not return an audio link. Refresh the list before trying again.");
    }, `Audio generated for “${item.title}”.`);
    setGeneratingId(null);
  }
  const textField = (key: Exclude<keyof typeof emptyForm, "isTopStory" | "isDraft">, label: string, hint?: string) => <label className="admin-field"><span>{label}</span><input value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />{hint && <small>{hint}</small>}</label>;
  return <section>
    <header className="admin-heading"><div><h1>Writing</h1><p>Write, preview, and publish articles. Saved changes appear on your site.</p></div></header>
    <Feedback error={validationError || collection.error} notice={collection.notice} />
    <form id="editor" ref={editor} onSubmit={submit} onChangeCapture={collection.clearNotice} className="admin-form">
      <div className="admin-form-heading"><h2>{editing ? "Edit article" : "New article"}</h2><span>{dirty ? "Unsaved changes" : editing ? "Saved article" : "Not published"}</span></div>
      <fieldset disabled={collection.pending} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <div className="admin-editor-toolbar"><span>{preview ? "Preview of your current edits" : "Markdown supported"}</span><button type="button" className="admin-button-secondary" aria-pressed={preview} onClick={() => setPreview(!preview)}>{preview ? "Edit article" : "Preview article"}</button></div>
        {preview ? <article className="admin-preview"><h2>{form.title || "Untitled article"}</h2>{form.excerpt && <p>{form.excerpt}</p>}<MarkdownRenderer content={form.content || "Your article preview will appear here."} /></article> : <div className="admin-editor-layout"><div className="admin-editor-fields">
          <label className="admin-field"><span>Title</span><input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
          <label className="admin-field"><span>Excerpt</span><textarea rows={2} value={form.excerpt} onChange={event => setForm({ ...form, excerpt: event.target.value })} /></label>
          <label className="admin-field"><span>Article · Markdown</span><textarea required className="admin-markdown" rows={20} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} /></label>
          <details><summary>Formatting guide</summary><p className="admin-muted">Use # headings, **bold**, *italic*, lists, [links](https://example.com), fenced code blocks, tables, and Mermaid diagrams. Preview uses the site’s Markdown renderer.</p></details>
        </div><aside className="admin-editor-meta">
          <h3 className="admin-field-wide">Details</h3>
          {textField("slug", "URL slug", `Leave blank to generate from the title${form.title ? `: ${slugify(form.title)}` : "."}`)}
          {textField("category", "Category")}{textField("tags", "Tags", "Separate tags with commas.")}
          <label className="admin-check"><input type="checkbox" checked={form.isTopStory} onChange={event => setForm({ ...form, isTopStory: event.target.checked })} /><span>Top story on the writing page</span></label>
          <label className="admin-check"><input type="checkbox" checked={form.isDraft} onChange={event => setForm({ ...form, isDraft: event.target.checked })} /><span>Keep this article as a draft</span></label>
          <h3 className="admin-field-wide">Media</h3>
          {textField("featuredImage", "Featured image URL")}
          <label className="admin-field"><span>Video embed</span><textarea rows={3} value={form.videoEmbed} onChange={event => setForm({ ...form, videoEmbed: event.target.value })} /><small>Paste a YouTube URL or iframe HTML. A YouTube URL also supplies a listing thumbnail.</small></label>
          <Link className="admin-text-button" href={`/${ADMIN_PATH}/uploads`} target="_blank" rel="noopener noreferrer">Upload media ↗</Link>
          {currentAudio && <div className="admin-field-wide"><p className="admin-muted">Saved article audio</p><audio className="admin-audio" controls preload="none" src={currentAudio} /></div>}
          <small className="admin-field-wide">Generate audio from a saved article below. Generation uses its published content.</small>
        </aside></div>}
        <div className="admin-actions admin-editor-save"><button type="submit" className="admin-button">{collection.pending ? generatingId ? "Generating audio…" : "Saving…" : editing ? "Save changes" : form.isDraft ? "Save draft" : "Publish article"}</button>{(editing || dirty) && <button type="button" className="admin-button-secondary" onClick={() => { if (!dirty || confirm("Discard unsaved changes?")) reset(); }}>Cancel</button>}</div>
      </fieldset>
    </form>
    <div className="admin-list-heading"><h2>Articles {!collection.loading && `(${collection.items.length})`}</h2><button className="admin-text-button" onClick={collection.refresh} disabled={collection.loading || collection.pending}>{collection.loading ? "Loading…" : "Refresh list"}</button></div>
    {collection.loading && <p role="status" className="admin-muted">Loading articles…</p>}
    {!collection.loading && !collection.error && !collection.items.length && <p className="admin-empty">No articles yet. Write your first article above.</p>}
    <div className="admin-list admin-blog-list" aria-busy={collection.loading}>{collection.items.map(item => <article className="admin-record" key={item._id}>
      <div className="admin-record-copy"><h3>{item.title}</h3><p>{item.isDraft ? "Draft" : "Live"} · {item.slug} · {new Date(item.publishedAt).toLocaleDateString()}{item.category && ` · ${item.category}`} · {item.readCount ?? 0} views{item.isTopStory && " · Top story"}</p>{item.audioUrl && <a className="admin-text-button" href={item.audioUrl} target="_blank" rel="noopener noreferrer">Listen to audio ↗</a>}</div>
      <div className="admin-actions">{!item.isDraft && <Link className="admin-text-button" href={`/blogs/${item.slug}`} target="_blank" rel="noopener noreferrer">View</Link>}<button className="admin-text-button" disabled={collection.pending} onClick={() => generateAudio(item)}>{generatingId === item._id ? "Generating…" : item.audioUrl ? "Regenerate audio" : "Generate audio"}</button><button className="admin-text-button" disabled={collection.pending} onClick={() => edit(item)}>Edit</button><button className="admin-danger" disabled={collection.pending} onClick={async () => { if (await collection.remove(item, item.title)) { if (editing?._id === item._id) reset(); } }}>Delete</button></div>
    </article>)}</div>
  </section>;
}
