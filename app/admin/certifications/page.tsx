"use client";

import { useEffect, useState } from "react";

type Cert = { _id: string; name: string; issuer: string; date: string; url: string; credentialId: string; order: number };

export default function AdminCertificationsPage() {
  const [items, setItems] = useState<Cert[]>([]);
  const [editing, setEditing] = useState<Cert | null>(null);
  const [form, setForm] = useState({ name: "", issuer: "", date: "", url: "", credentialId: "", order: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const res = await fetch("/api/admin/certifications");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchItems().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/admin/certifications/${editing._id}` : "/api/admin/certifications";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ name: "", issuer: "", date: "", url: "", credentialId: "", order: 0 });
      setEditing(null);
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/admin/certifications/${id}`, { method: "DELETE" });
    fetchItems();
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-6">Certifications</h1>
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-card rounded border border-border space-y-3">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <input placeholder="Issuer" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <input placeholder="Date (e.g. 2024)" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" required />
        <input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <input placeholder="Credential ID" value={form.credentialId} onChange={(e) => setForm({ ...form, credentialId: e.target.value })} className="w-full px-3 py-2 bg-card border border-border rounded text-foreground" />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-accent text-black font-medium rounded">{editing ? "Update" : "Add"}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm({ name: "", issuer: "", date: "", url: "", credentialId: "", order: 0 }); }} className="px-4 py-2 text-muted hover:text-foreground">Cancel</button>}
        </div>
      </form>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="p-4 bg-card rounded border border-border flex justify-between items-center">
            <span className="text-foreground">{item.name} · {item.issuer} ({item.date})</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setForm({ name: item.name, issuer: item.issuer, date: item.date, url: item.url || "", credentialId: item.credentialId || "", order: item.order }); }} className="text-accent hover:underline text-sm">Edit</button>
              <button onClick={() => handleDelete(item._id)} className="text-red-600 hover:underline text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
