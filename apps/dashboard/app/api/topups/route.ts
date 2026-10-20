import { NextResponse, connection } from "next/server";
import { db, topups } from "@/lib/db";
import { desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  // Ledger reads must reflect this request, never the build-time database snapshot.
  await connection();
  try {
    const rows = await db.select().from(topups).orderBy(desc(topups.createdAt));
    return NextResponse.json({ topups: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
