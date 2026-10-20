import { NextRequest, NextResponse } from "next/server";
import { meterKit } from "@/lib/meter-kit";
import { errorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      amount?: number;
      idempotencyKey?: string;
      paypalTransactionId?: string;
    };
    if (!body.userId || !body.amount) {
      return NextResponse.json({ error: "userId and amount required" }, { status: 400 });
    }
    const entry = await meterKit.credit({
      userId: body.userId,
      amount: body.amount,
      idempotencyKey: body.idempotencyKey,
      paypalTransactionId: body.paypalTransactionId,
    });
    return NextResponse.json({ entry });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
