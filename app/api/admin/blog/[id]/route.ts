import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { sanitizeForMongo } from "@/lib/sanitize";
import Blog from "@/models/Blog";
import {
  adminJson, AdminRequestError, parseAdminId, readAdminJson,
  requireAdminAuthentication, requireAdminDatabase, requireAdminOrigin, withAdminErrors,
} from "@/lib/adminRequest";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    await requireAdminAuthentication();
    const id = parseAdminId((await params).id);
    const body = sanitizeForMongo(await readAdminJson(request));
    if (body.content || body.title) body.dateModified = new Date();
    requireAdminDatabase(await dbConnect());
    const item = await Blog.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!item) throw new AdminRequestError(404, "Not found");
    return adminJson(item);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    await requireAdminAuthentication();
    const id = parseAdminId((await params).id);
    requireAdminDatabase(await dbConnect());
    const item = await Blog.findByIdAndDelete(id);
    if (!item) throw new AdminRequestError(404, "Not found");
    return adminJson({ success: true });
  });
}
