# Security Audit Report

**Date:** March 8, 2025  
**Scope:** Pre-Vercel deployment, with focus on content upload/update routes

---

## Summary

A security audit was performed on the personal-website codebase. Several vulnerabilities were identified and **fixed**. Remaining recommendations are documented below.

---

## Fixes Applied

### 1. Local File Upload (`lib/upload.ts`) — **FIXED**

| Issue | Severity | Fix |
|------|----------|-----|
| No file type validation | High | Added allowlist: JPEG, PNG, GIF, WebP, AVIF only |
| No file size limit | High | Added 5MB max |
| Path traversal via `subdir` | High | Sanitize `subdir` (strip `..`, leading/trailing slashes), resolve path and verify it stays within `UPLOAD_DIR` |
| Extension spoofing | Medium | Whitelist allowed extensions; fallback to `.bin` for unknown |

### 2. R2 Upload (`lib/r2.ts`)

- Already had MIME validation, size limits, and `sanitizeSubdir` — no changes needed.

### 3. NoSQL / Operator Injection — **FIXED**

| Issue | Severity | Fix |
|------|----------|-----|
| Raw JSON passed to `create()` / `findByIdAndUpdate()` | High | Added `sanitizeForMongo()` to strip keys starting with `$` or containing `.` |
| No schema validation on updates | Medium | Added `runValidators: true` to all `findByIdAndUpdate` calls |

Applied to: FAQ, Blog, Projects, Photos, About, Work, Skills, Certifications.

### 4. Blog View Endpoint (`/api/blog/[slug]/view`) — **FIXED**

| Issue | Severity | Fix |
|------|----------|-----|
| Unvalidated slug (injection risk) | Medium | Slug must match `/^[a-zA-Z0-9_-]+$/` |

### 5. XSS in Markdown Links — **FIXED**

| Issue | Severity | Fix |
|------|----------|-----|
| `javascript:` and `data:` URLs in links | High | Only allow `http://` and `https://` in link hrefs |
| Unescaped href in attributes | Medium | Escape `"` to `&quot;` in href |

### 6. Video Embed XSS (`MediaBlock.tsx`) — **FIXED**

| Issue | Severity | Fix |
|------|----------|-----|
| Arbitrary iframe HTML passed through | High | Only allow YouTube embeds; reject other iframe sources |

### 7. Security Headers — **ADDED**

Added in `next.config.ts`:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation disabled)
- `X-DNS-Prefetch-Control: on`

---

## What Was Already Secure

- **Authentication:** All admin API routes check `isAdminAuthenticated()` before mutations.
- **Session cookie:** `httpOnly`, `secure` in production, `sameSite: lax`.
- **Admin path obfuscation:** `NEXT_PUBLIC_ADMIN_PATH` allows custom admin URL.
- **Middleware:** Redirects unauthenticated users from admin pages; blocks default `/admin` when custom path is set.
- **R2 upload:** MIME allowlist, size limits, subdir sanitization.

---

## Recommendations (Not Implemented)

### 1. Login Rate Limiting

**Risk:** Brute-force attacks on `/api/admin/login`.

**Suggestion:** Use Vercel’s rate limiting or a service like Upstash Redis. For a single-admin site, a strong password is usually sufficient.

### 2. Strong Admin Password

Ensure `ADMIN_PASSWORD` is long and random (e.g. 20+ chars). Avoid common words.

### 3. Environment Variables on Vercel

- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Vercel env (not in code).
- Use a unique `NEXT_PUBLIC_ADMIN_PATH` (e.g. `admikathanhai`) instead of `admin`.
- Never commit `.env.local`; ensure it’s in `.gitignore`.

### 4. MongoDB

- Use IP allowlist in MongoDB Atlas if possible.
- Prefer a dedicated DB user with minimal privileges.

### 5. Blog Read Count Abuse

`/api/blog/[slug]/view` can be spammed to inflate counts. For a personal blog this is usually acceptable. For stricter control, consider:

- Upstash rate limiting
- One count per session/IP per post (requires state)

### 6. Content Security Policy (CSP)

Consider adding a CSP header for stronger XSS protection. This may require tuning for YouTube embeds and other third-party content.

---

## Checklist Before Deploy

- [ ] `ADMIN_PASSWORD` is strong and unique
- [ ] `NEXT_PUBLIC_ADMIN_PATH` is set to a non-default value
- [ ] `.env.local` is not committed
- [ ] All required env vars are set in Vercel (MONGODB_URI, R2_*, etc.)
- [ ] MongoDB Atlas network access is configured appropriately
