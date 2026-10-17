import { NextRequest, NextResponse } from "next/server";
import { InsufficientCreditsError, FeatureNotPricedError } from "@meterkit/sdk";
import { meterKit } from "@/lib/meter-kit";
import { db, auditLog } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      featureKey?: string;
      userId?: string;
      units?: number;
      idempotencyKey?: string;
    };
    if (!body.featureKey || !body.userId || !body.units) {
      return NextResponse.json({ error: "featureKey, userId, units required" }, { status: 400 });
    }
    const result = await meterKit.meter(body.featureKey, {
      userId: body.userId,
      units: body.units,
      idempotencyKey: body.idempotencyKey,
    });
    await db.insert(auditLog).values({
      appId: 1,
      action: "feature_debit",
      details: JSON.stringify({
        userId: body.userId,
        featureKey: body.featureKey,
        credits: result.credits,
      }),
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          userId: error.userId,
          required: error.required,
          balance: error.balance,
        },
        { status: 402 }
      );
    }
    if (error instanceof FeatureNotPricedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
