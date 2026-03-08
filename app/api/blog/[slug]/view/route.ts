import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const conn = await dbConnect();
    if (!conn) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const result = await Blog.findOneAndUpdate(
      { slug },
      { $inc: { readCount: 1 } },
      { new: true }
    );
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ readCount: result.readCount });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
