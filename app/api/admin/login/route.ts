import type { NextRequest } from "next/server";
import { verifyAdmin, setAdminSession } from "@/lib/auth";
import { isValidCredential } from "@/lib/adminSession";
import {
  adminJson, AdminRequestError, readAdminJson, requireAdminOrigin, withAdminErrors,
} from "@/lib/adminRequest";

export async function POST(request: NextRequest) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    const { username, password } = await readAdminJson(request);
    if (!isValidCredential(username) || !isValidCredential(password)) {
      throw new AdminRequestError(400, "Missing or malformed credentials");
    }
    if (!(await verifyAdmin(username, password))) {
      throw new AdminRequestError(401, "Invalid credentials");
    }
    await setAdminSession();
    return adminJson({ success: true });
  });
}
