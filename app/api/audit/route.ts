import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const companyId = 1;

    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.companyId, companyId))
      .orderBy(sql`${auditLog.createdAt} DESC`)
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
