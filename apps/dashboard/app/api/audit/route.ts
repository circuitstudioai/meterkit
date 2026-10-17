import { NextResponse } from "next/server";
import { db, auditLog } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const companyId = 1;

    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.companyId, companyId))
      .orderBy(desc(auditLog.createdAt))
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to fetch logs") },
      { status: 500 }
    );
  }
}
