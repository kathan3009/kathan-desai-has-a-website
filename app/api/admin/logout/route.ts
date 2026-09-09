import type { NextRequest } from "next/server";
import { clearAdminSession } from "@/lib/auth";
import { adminJson, requireAdminOrigin, withAdminErrors } from "@/lib/adminRequest";

export async function POST(request: NextRequest) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    await clearAdminSession();
    return adminJson({ success: true });
  });
}
