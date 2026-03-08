"use client";

import { useEffect, useState } from "react";

type Photo = { _id: string; image: string; caption: string; category: string; order: number };

export default function AdminPhotosPage() {
  const [items, setItems] = useState<Photo[]>([]);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [form, setForm] = useState({ image: "", caption: "", category: "", order: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const res = await fetch("/api/admin/photos");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/admin/photos/${editing._id}` : "/api/admin/photos";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ image: "", caption: "", category: "", order: 0 });
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    fetchItems();
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Photography</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-card rounded border border-border space-y-3">
        <input placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded text-foreground" required />
        <textarea placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded text-foreground" rows={2} />
        <input placeholder="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded text-foreground" />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">{editing ? "Update" : "Add"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ image: "", caption: "", category: "", order: 0 }); }} className="px-4 py-2 text-muted hover:text-foreground">Cancel</button>}
        </div>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item._id} className="group relative">
            <div className="aspect-square rounded overflow-hidden bg-card mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.caption} className="w-full h-full object-cover" />
            </div>
            <p className="text-muted text-sm line-clamp-2">{item.caption || "—"}</p>
            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(item); setForm({ image: item.image, caption: item.caption || "", category: item.category || "", order: item.order }); }} className="text-accent hover:underline text-xs">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:underline text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
