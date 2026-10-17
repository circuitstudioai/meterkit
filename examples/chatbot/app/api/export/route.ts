import { NextRequest, NextResponse } from "next/server";
import { exportPdf } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { title?: string; body?: string };
  const pdf = exportPdf(body.title || "Chat", body.body || "");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=chat.pdf",
    },
  });
}
