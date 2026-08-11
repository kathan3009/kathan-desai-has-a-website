"use client";

import { useEffect, useState } from "react";

type Project = {
  _id: string;
  name: string;
  description: string;
  techStack: string[];
  repoUrl: string;
  liveUrl: string;
  image: string;
  type: "py" | "other";
  status: "active" | "in-development" | "production" | "beta" | "prototype" | "concept" | "archived";
  order: number;
};

type ProjectStatus = Project["status"];

const emptyForm = {
  name: "",
  description: "",
  techStack: "",
  repoUrl: "",
  liveUrl: "",
  image: "",
  type: "other" as "py" | "other",
  status: "active" as ProjectStatus,
  order: 0,
};

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const res = await fetch("/api/admin/projects");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, techStack: form.techStack.split(",").map((s) => s.trim()).filter(Boolean) };
    const url = editing ? `/api/admin/projects/${editing._id}` : "/api/admin/projects";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm(emptyForm);
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    fetchItems();
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Projects</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-card rounded border border-border space-y-3">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" rows={3} required />
        <input placeholder="Tech stack (comma-separated)" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <input placeholder="Repo URL" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <input placeholder="Live URL" value={form.liveUrl} onChange={(e) => setForm({ ...form, liveUrl: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "py" | "other" })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground">
          <option value="other">Other</option>
          <option value="py">Python</option>
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground">
          <option value="active">Active</option>
          <option value="in-development">In development</option>
          <option value="production">Production</option>
          <option value="beta">Beta</option>
          <option value="prototype">Prototype</option>
          <option value="concept">Concept</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">{editing ? "Update" : "Add"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="px-4 py-2 text-muted hover:text-foreground">Cancel</button>}
        </div>
      </form>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="p-4 bg-card rounded border border-border flex justify-between items-start">
            <div>
              <p className="text-foreground font-medium">{item.name}</p>
              <p className="text-muted text-sm">{item.status || "active"} · {item.type} · {item.techStack?.join(", ") || "—"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description, techStack: item.techStack?.join(", ") || "", repoUrl: item.repoUrl || "", liveUrl: item.liveUrl || "", image: item.image || "", type: item.type, status: item.status || "active", order: item.order }); }} className="text-accent hover:underline text-sm">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
