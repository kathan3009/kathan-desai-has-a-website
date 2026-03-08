import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import dbConnect from "@/lib/db";
import FAQ from "@/models/FAQ";

export async function GET() {
  const auth = await isAdminAuthenticated();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const items = await FAQ.find().sort({ order: 1 });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await isAdminAuthenticated();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const body = await request.json();
  const item = await FAQ.create(body);
  return NextResponse.json(item);
}
