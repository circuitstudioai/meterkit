import "@/lib/meterkit";
import { NextRequest, NextResponse } from "next/server";
import { InsufficientCreditsError } from "@meterkit/sdk";
import { chat } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { prompt?: string; userId?: string };
    const text = await chat(body.userId || "user_alex", body.prompt || "Hello");
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message, code: error.code, balance: error.balance },
        { status: 402 }
      );
    }
    throw error;
  }
}
