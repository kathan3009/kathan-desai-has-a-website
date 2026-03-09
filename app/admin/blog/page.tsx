"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const emptyForm = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  tags: "",
  featuredImage: "",
  videoEmbed: "",
  category: "",
  isTopStory: false,
};

type Blog = {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
  featuredImage?: string;
  videoEmbed?: string;
  audioUrl?: string;
  category?: string;
  isTopStory?: boolean;
  readCount?: number;
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<Blog[]>([]);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  async function fetchItems() {
    const res = await fetch("/api/admin/blog");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Blog fetch failed:", res.status, data);
      setItems([]);
      return;
    }
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      slug: form.slug || slugify(form.title),
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      featuredImage: form.featuredImage.trim() || undefined,
      videoEmbed: form.videoEmbed.trim() || undefined,
      category: form.category.trim() || undefined,
      isTopStory: form.isTopStory,
    };
    const url = editing ? `/api/admin/blog/${editing._id}` : "/api/admin/blog";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setForm(emptyForm);
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    fetchItems();
  }

  async function handleGenerateAudio(item: Blog) {
    setGeneratingId(item._id);
    try {
      const res = await fetch(`/api/admin/blog/${item._id}/generate-audio`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        fetchItems();
      } else {
        alert(data.error || "Failed to generate audio");
      }
    } catch {
      alert("Failed to generate audio");
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Blogs</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-card rounded border border-border space-y-3">
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <input placeholder="Slug (auto-generated if empty)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <input placeholder="Featured image URL" value={form.featuredImage} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <div>
          <textarea placeholder="Video embed (YouTube URL or iframe HTML)" value={form.videoEmbed} onChange={(e) => setForm({ ...form, videoEmbed: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" rows={2} />
          <p className="text-muted text-xs mt-1">Paste the full YouTube URL here (e.g. https://youtube.com/watch?v=xxx) so the video thumbnail shows on the blog listing.</p>
        </div>
        <input placeholder="Category (e.g. Security, Development)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <textarea placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" rows={2} />
        <textarea placeholder="Content (Markdown supported)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" rows={8} required />
        <input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isTopStory} onChange={(e) => setForm({ ...form, isTopStory: e.target.checked })} className="rounded border-border" />
          <span className="text-foreground text-sm">Top Story (featured on blogs page)</span>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">{editing ? "Update" : "Add"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="px-4 py-2 text-muted hover:text-foreground">Cancel</button>}
        </div>
      </form>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="p-4 bg-card rounded border border-border flex justify-between items-start">
            <div>
              <p className="text-foreground font-medium">{item.title}</p>
              <p className="text-muted text-sm">
                {item.slug} · {new Date(item.publishedAt).toLocaleDateString()}
                {item.category && ` · ${item.category}`}
                {(item.readCount ?? 0) > 0 && ` · ${item.readCount} views`}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Link href={`/blogs/${item.slug}`} target="_blank" className="text-muted hover:text-foreground text-sm">View</Link>
              <button
                onClick={() => handleGenerateAudio(item)}
                disabled={generatingId === item._id}
                className="text-muted hover:text-foreground text-sm disabled:opacity-50"
                title={item.audioUrl ? "Regenerate audio" : "Generate audiobook"}
              >
                {generatingId === item._id ? "Generating…" : item.audioUrl ? "Regen audio" : "Generate audio"}
              </button>
              <button
                onClick={() => {
                  setEditing(item);
                  setForm({
                    ...emptyForm,
                    title: item.title,
                    slug: item.slug,
                    content: item.content || "",
                    excerpt: item.excerpt || "",
                    tags: item.tags?.join(", ") || "",
                    featuredImage: item.featuredImage || "",
                    videoEmbed: item.videoEmbed || "",
                    category: item.category || "",
                    isTopStory: item.isTopStory ?? false,
                  });
                }}
                className="text-accent hover:underline text-sm"
              >
                Edit
              </button>
              <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
