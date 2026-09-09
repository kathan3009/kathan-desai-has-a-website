import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { sanitizeForMongo } from "@/lib/sanitize";
import Blog from "@/models/Blog";
import {
  adminJson, readAdminJson, requireAdminAuthentication,
  requireAdminDatabase, requireAdminOrigin, withAdminErrors,
} from "@/lib/adminRequest";

export async function GET() {
  return withAdminErrors(async () => {
    await requireAdminAuthentication();
    requireAdminDatabase(await dbConnect());
    const items = await Blog.find().sort({ publishedAt: -1 });
    return adminJson(items);
  });
}

export async function POST(request: NextRequest) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    await requireAdminAuthentication();
    const body = await readAdminJson(request);
    requireAdminDatabase(await dbConnect());
    const item = await Blog.create(sanitizeForMongo(body));
    return adminJson(item);
  });
}
