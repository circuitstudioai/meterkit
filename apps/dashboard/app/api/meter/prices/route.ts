import { NextRequest, NextResponse } from "next/server";
import { catalog } from "@/lib/meter-kit";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const prices = await catalog.list();
    return NextResponse.json({ prices });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      featureKey?: string;
      name?: string;
      creditsPerUnit?: number;
      unitLabel?: string;
    };
    if (!body.featureKey || !body.name || body.creditsPerUnit == null || !body.unitLabel) {
      return NextResponse.json({ error: "Missing price fields" }, { status: 400 });
    }
    await catalog.upsert({
      featureKey: body.featureKey,
      name: body.name,
      creditsPerUnit: body.creditsPerUnit,
      unitLabel: body.unitLabel,
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
