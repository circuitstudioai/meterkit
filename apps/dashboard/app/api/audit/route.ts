import { NextResponse } from "next/server";
import { db, auditLog } from "@/lib/db";
import { desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(100);
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
