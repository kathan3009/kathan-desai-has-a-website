"use client";

import { useEffect, useState } from "react";

type WorkItem = {
  _id: string;
  company: string;
  role: string;
  period: string;
  description: string;
  url: string;
  order: number;
};

export default function AdminWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [form, setForm] = useState({ company: "", role: "", period: "", description: "", url: "", order: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const res = await fetch("/api/admin/work");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/admin/work/${editing._id}` : "/api/admin/work";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ company: "", role: "", period: "", description: "", url: "", order: 0 });
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/work/${id}`, { method: "DELETE" });
    fetchItems();
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Work Experience</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 card space-y-3">
        <input
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
          required
        />
        <input
          placeholder="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
          required
        />
        <input
          placeholder="Period (e.g. 2020 - Present)"
          value={form.period}
          onChange={(e) => setForm({ ...form, period: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
          rows={3}
        />
        <input
          placeholder="URL"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
        />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">
            {editing ? "Update" : "Add"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setForm({ company: "", role: "", period: "", description: "", url: "", order: 0 }); }} className="px-4 py-2 text-muted hover:text-accent">
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="card p-4 flex justify-between items-start">
            <div>
              <p className="text-foreground font-medium">{item.role} at {item.company}</p>
              <p className="text-muted text-sm">{item.period}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({ company: item.company, role: item.role, period: item.period, description: item.description, url: item.url, order: item.order }); }} className="text-accent hover:underline text-sm">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
