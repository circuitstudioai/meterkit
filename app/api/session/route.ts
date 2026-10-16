import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user });

    // Set session cookie
    response.cookies.set("user_session", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Error switching user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to switch user" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("user_session");

    if (!sessionCookie) {
      // Default to admin user
      const [defaultUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, "admin@northwind.demo"))
        .limit(1);

      return NextResponse.json({ user: defaultUser || null });
    }

    const user = JSON.parse(sessionCookie.value);
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get session" },
      { status: 500 }
    );
  }
}
