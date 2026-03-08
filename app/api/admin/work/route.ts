import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Work from "@/models/Work";

export async function GET() {
  const auth = await isAdminAuthenticated();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const items = await Work.find().sort({ order: 1 });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const auth = await isAdminAuthenticated();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const body = await request.json();
  const item = await Work.create(body);
  return NextResponse.json(item);
}
