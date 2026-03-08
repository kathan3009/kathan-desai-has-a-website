"use client";

import { useEffect, useState } from "react";

type FAQ = { _id: string; question: string; answer: string; order: number };

export default function AdminFAQPage() {
  const [items, setItems] = useState<FAQ[]>([]);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", order: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const res = await fetch("/api/admin/faq");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/admin/faq/${editing._id}` : "/api/admin/faq";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ question: "", answer: "", order: 0 });
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
    fetchItems();
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">FAQ</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-card rounded border border-border space-y-3">
        <input placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <textarea placeholder="Answer (40-60 words for AEO)" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" rows={4} required />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">{editing ? "Update" : "Add"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ question: "", answer: "", order: 0 }); }} className="px-4 py-2 text-muted hover:text-foreground">Cancel</button>}
        </div>
      </form>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="p-4 bg-card rounded border border-border flex justify-between items-start">
            <div>
              <p className="text-foreground font-medium">{item.question}</p>
              <p className="text-muted text-sm mt-1 line-clamp-2">{item.answer}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({ question: item.question, answer: item.answer, order: item.order }); }} className="text-accent hover:underline text-sm">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="text-red-400 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
