import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { sanitizeForMongo } from "@/lib/sanitize";
import FAQ from "@/models/FAQ";
import {
  adminJson, readAdminJson, requireAdminAuthentication,
  requireAdminDatabase, requireAdminOrigin, withAdminErrors,
} from "@/lib/adminRequest";

export async function GET() {
  return withAdminErrors(async () => {
    await requireAdminAuthentication();
    requireAdminDatabase(await dbConnect());
    const items = await FAQ.find().sort({ order: 1 });
    return adminJson(items);
  });
}

export async function POST(request: NextRequest) {
  return withAdminErrors(async () => {
    requireAdminOrigin(request);
    await requireAdminAuthentication();
    const body = await readAdminJson(request);
    requireAdminDatabase(await dbConnect());
    const item = await FAQ.create(sanitizeForMongo(body));
    return adminJson(item);
  });
}
