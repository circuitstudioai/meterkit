import { NextResponse } from "next/server";
import { db, ledgerEntries } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.type, "debit"))
      .orderBy(desc(ledgerEntries.createdAt));
    return NextResponse.json({ usage: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
