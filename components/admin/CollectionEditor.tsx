"use client";

import { useRef, useState } from "react";
import { Feedback } from "./Feedback";
import { useCollection, useUnsavedChanges } from "./useCollection";

type Field = { key: string; label: string; required?: boolean; kind?: "textarea" | "number" | "list"; hint?: string; options?: { value: string; label: string }[] };
export type CollectionConfig = { resource: string; title: string; singular: string; description: string; fields: Field[]; titleKeys: string[]; detailKeys: string[]; photos?: boolean };
type RecordItem = { _id: string } & Record<string, unknown>;
type Form = Record<string, string | number>;

export default function CollectionEditor({ config }: { config: CollectionConfig }) {
  const collection = useCollection<RecordItem>(config.resource);
  const empty = (): Form => Object.fromEntries(config.fields.map(field => [field.key, field.kind === "number" ? 0 : field.options?.[0].value ?? ""]));
  const [form, setForm] = useState<Form>(empty);
  const [baseline, setBaseline] = useState<Form>(empty);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const editor = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useUnsavedChanges(dirty || collection.pending);
  const title = (item: RecordItem) => config.titleKeys.map(key => String(item[key] ?? "")).filter(Boolean).join(" · ") || config.singular;
  const detail = (item: RecordItem) => config.detailKeys.map(key => Array.isArray(item[key]) ? (item[key] as unknown[]).join(", ") : String(item[key] ?? "")).filter(Boolean).join(" · ");
  function reset() { const next = empty(); setForm(next); setBaseline(next); setEditing(null); }
  function edit(item: RecordItem) {
    if (dirty && !confirm("Discard unsaved changes and edit this item?")) return;
    const next = Object.fromEntries(config.fields.map(field => [field.key, field.kind === "list" ? (Array.isArray(item[field.key]) ? (item[field.key] as unknown[]).join(", ") : "") : item[field.key] ?? (field.kind === "number" ? 0 : field.options?.[0].value ?? "")])) as Form;
    setForm(next); setBaseline(next); setEditing(item);
    editor.current?.scrollIntoView({ behavior: "instant", block: "start" });
    editor.current?.querySelector("input")?.focus({ preventScroll: true });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = Object.fromEntries(config.fields.map(field => [field.key, field.kind === "list" ? String(form[field.key]).split(",").map(value => value.trim()).filter(Boolean) : form[field.key]]));
    if (await collection.save(body, editing?._id)) reset();
  }
  return <section>
    <header className="admin-heading"><div><h1>{config.title}</h1><p>{config.description}</p></div></header>
    <Feedback error={collection.error} notice={collection.notice} />
    <form ref={editor} onSubmit={submit} onChangeCapture={collection.clearNotice} className="admin-form">
      <div className="admin-form-heading"><h2>{editing ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2><span>{dirty ? "Unsaved changes" : ""}</span></div>
      <fieldset disabled={collection.pending} className="admin-fields">
        {config.fields.map(field => <label key={field.key} className={field.kind === "textarea" ? "admin-field admin-field-wide" : "admin-field"}>
          <span>{field.label}{!field.required && <small> (optional)</small>}</span>
          {field.options ? <select value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.kind === "textarea" ? <textarea rows={5} required={field.required} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: event.target.value })} /> : <input type={field.kind === "number" ? "number" : "text"} step={field.kind === "number" ? 1 : undefined} required={field.required} value={form[field.key]} onChange={event => setForm({ ...form, [field.key]: field.kind === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value })} />}
          {field.hint && <small>{field.hint}</small>}
        </label>)}
        <div className="admin-actions admin-field-wide"><button className="admin-button" type="submit">{collection.pending ? "Saving…" : editing ? "Save changes" : `Add ${config.singular}`}</button>{(editing || dirty) && <button type="button" className="admin-button-secondary" onClick={() => { if (!dirty || confirm("Discard unsaved changes?")) reset(); }}>Cancel</button>}</div>
      </fieldset>
    </form>
    <div className="admin-list-heading"><h2>Saved {config.title.toLowerCase()} {!collection.loading && `(${collection.items.length})`}</h2><button className="admin-text-button" onClick={collection.refresh} disabled={collection.loading || collection.pending}>{collection.loading ? "Loading…" : "Refresh list"}</button></div>
    {collection.loading && <p role="status" className="admin-muted">Loading {config.title.toLowerCase()}…</p>}
    {!collection.loading && !collection.error && !collection.items.length && <p className="admin-empty">No {config.title.toLowerCase()} yet. Add your first {config.singular} above.</p>}
    <div className={config.photos ? "admin-photo-grid" : "admin-list"} aria-busy={collection.loading}>
      {collection.items.map(item => <article key={item._id} className="admin-record">
        {config.photos && <div className="admin-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(item.image)} alt={String(item.caption || "Gallery photograph")} loading="lazy" />
        </div>}
        <div className="admin-record-copy"><h3>{title(item)}</h3><p>{detail(item)}</p><small>Order {Number(item.order ?? 0)}</small></div>
        <div className="admin-actions"><button className="admin-text-button" disabled={collection.pending} onClick={() => edit(item)} aria-label={`Edit ${title(item)}`}>Edit</button><button className="admin-danger" disabled={collection.pending} onClick={async () => { if (await collection.remove(item, title(item))) { if (editing?._id === item._id) reset(); } }} aria-label={`Delete ${title(item)}`}>Delete</button></div>
      </article>)}
    </div>
  </section>;
}
