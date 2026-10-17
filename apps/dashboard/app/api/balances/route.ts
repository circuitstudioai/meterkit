import { NextResponse } from "next/server";
import { db, endUsers } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const users = await db.select().from(endUsers);
    return NextResponse.json({ users });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
