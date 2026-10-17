import { NextResponse } from "next/server";
import { db, builders } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const [builder] = await db.select().from(builders).limit(1);
    return NextResponse.json({
      user: builder
        ? { name: builder.name, email: builder.email, role: "builder" }
        : { name: "Demo builder", email: "maya@studio.demo", role: "builder" },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
