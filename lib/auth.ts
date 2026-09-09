import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  getAdminCredentials,
  isValidCredential,
  verifyAdminSession,
} from "./adminSession";

export { getAdminCredentials } from "./adminSession";

export async function verifyAdmin(username: unknown, password: unknown): Promise<boolean> {
  if (!isValidCredential(username) || !isValidCredential(password)) return false;
  const creds = getAdminCredentials();
  if (!creds) return false;
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  // Compare fixed-size hashes, evaluating both comparisons without short-circuiting.
  const usernameMatches = timingSafeEqual(digest(username), digest(creds.username));
  const passwordMatches = timingSafeEqual(digest(password), digest(creds.password));
  return usernameMatches && passwordMatches;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setAdminSession(): Promise<void> {
  const session = await createAdminSession();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, session, {
    ...cookieOptions,
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(value);
}
