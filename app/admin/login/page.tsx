"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_PATH } from "@/lib/adminPath";
import { adminRequest, errorMessage } from "@/components/admin/api";
import { Feedback } from "@/components/admin/Feedback";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const locked = useRef(false);
  const router = useRouter();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (locked.current) return;
    locked.current = true; setError(""); setLoading(true);
    try {
      await adminRequest("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      router.push(`/${ADMIN_PATH}`); router.refresh();
    } catch (error) { setError(errorMessage(error).includes("session has expired") ? "The username or password was not accepted. Please try again." : errorMessage(error)); }
    finally { locked.current = false; setLoading(false); }
  }
  return <div className="admin-login"><h1>Welcome to Studio.</h1><p>Sign in to manage your website.</p><Feedback error={error} />
    <form onSubmit={submit}><label className="admin-field"><span>Username</span><input name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} disabled={loading} /></label><label className="admin-field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={loading} /></label><button className="admin-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form>
    <Link href="/">Back to site</Link>
  </div>;
}
