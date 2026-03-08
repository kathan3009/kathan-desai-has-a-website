import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "admin";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const adminPrefix = `/${ADMIN_PATH}`;

  // Only allow when path exactly matches env (e.g. /admikathanhai or /admikathanhai/login)
  const isAdminPath =
    path === adminPrefix || path.startsWith(adminPrefix + "/");

  if (!isAdminPath) {
    // Block direct /admin access when env path is different (exact match to avoid /adminkathanhai matching)
    if (path === "/admin" || path.startsWith("/admin/")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Path matches env - allow with auth check
  const isLoginPage = path === `${adminPrefix}/login`;
  if (!isLoginPage) {
    const auth = request.cookies.get("admin-auth")?.value;
    if (auth !== "authenticated") {
      return NextResponse.redirect(new URL(`${adminPrefix}/login`, request.url));
    }
  }

  // Rewrite to internal /admin route (app/admin/ folder)
  if (ADMIN_PATH !== "admin") {
    const internalPath = "/admin" + (path.slice(adminPrefix.length) || "");
    return NextResponse.rewrite(new URL(internalPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Must be static - middleware checks admin path dynamically
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
