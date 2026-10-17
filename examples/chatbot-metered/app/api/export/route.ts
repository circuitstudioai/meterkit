import "@/lib/meterkit";
import { NextRequest, NextResponse } from "next/server";
import { InsufficientCreditsError } from "@meterkit/sdk";
import { exportPdf } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { title?: string; body?: string; userId?: string };
    const pdf = await exportPdf(body.userId || "user_alex", body.title || "Chat", body.body || "");
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=chat.pdf",
      },
    });
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
