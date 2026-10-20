import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { prompt?: string; userId?: string };
  const text = await chat(body.userId || "user_alex", body.prompt || "Hello");
  return NextResponse.json({ text });
}
