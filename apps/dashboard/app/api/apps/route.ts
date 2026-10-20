import { NextRequest, NextResponse } from "next/server";
import { db, apps, features, endUsers } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const appRows = await db.select().from(apps);
    const featureRows = await db.select().from(features);
    const userRows = await db.select().from(endUsers);
    const payload = (appRows as { id: number; name: string; slug: string }[]).map((app) => ({
      ...app,
      features: (featureRows as { appId: number }[]).filter((f) => f.appId === app.id).length,
      users: (userRows as { appId: number }[]).filter((u) => u.appId === app.id).length,
    }));
    return NextResponse.json({ apps: payload });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string; slug?: string };
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: "name and slug required" }, { status: 400 });
    }
    const [app] = await db
      .insert(apps)
      .values({ builderId: 1, name: body.name, slug: body.slug })
      .returning();
    return NextResponse.json({ app });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
