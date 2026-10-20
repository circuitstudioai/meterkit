import { NextResponse, connection } from "next/server";
import { db, endUsers } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  // Ledger reads must reflect this request, never the build-time database snapshot.
  await connection();
  try {
    const users = await db.select().from(endUsers);
    return NextResponse.json({ users });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
