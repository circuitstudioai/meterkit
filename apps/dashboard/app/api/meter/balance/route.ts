import { NextRequest, NextResponse } from "next/server";
import { meterKit } from "@/lib/meter-kit";
import { errorMessage } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const balance = await meterKit.getBalance(userId);
    return NextResponse.json({ balance });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
