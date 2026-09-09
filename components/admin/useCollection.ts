"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest, errorMessage } from "./api";

export function useCollection<T extends { _id: string }>(resource: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const endpoint = `/api/admin/${resource}`;

  const reload = useCallback(async () => {
    const data = await adminRequest<T[]>(endpoint);
    if (!Array.isArray(data)) throw new Error("The server returned an invalid list. Please reload.");
    setItems(data);
  }, [endpoint]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { await reload(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }, [reload]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function mutate(action: () => Promise<unknown>, message: string) {
    if (locked.current) return false;
    locked.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      try { await reload(); }
      catch (error) { setError(`The change succeeded, but the list could not refresh. ${errorMessage(error)}`); }
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  function save(body: unknown, id?: string) {
    return mutate(() => adminRequest(id ? `${endpoint}/${id}` : endpoint, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }), id ? "Changes saved to your site." : "Added to your site.");
  }

  async function remove(item: T, title: string) {
    if (!window.confirm(`Delete “${title}” from your site? This cannot be undone.`)) return false;
    return mutate(() => adminRequest(`${endpoint}/${item._id}`, { method: "DELETE" }), "Deleted from your site.");
  }

  return { items, loading, pending, error, notice, refresh, save, remove, mutate, clearNotice: () => setNotice("") };
}

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const beforeLeave = (event: Event) => { if (!window.confirm("Leave this page and discard unsaved changes?")) event.preventDefault(); };
    window.addEventListener("admin:before-leave", beforeLeave);
    window.addEventListener("beforeunload", beforeUnload);
    const onLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Leave this page and discard unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("admin:before-leave", beforeLeave); window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [dirty]);
}
