import { NextResponse } from "next/server";
import { db, apps, endUsers, ledgerEntries, topups, payouts, features } from "@/lib/db";
import { eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";
import { creditsToUsd } from "@/lib/credits";

export async function GET() {
  try {
    const appList = await db.select().from(apps);
    const users = await db.select().from(endUsers);
    const entries = await db.select().from(ledgerEntries);
    const topupRows = await db.select().from(topups);
    const payoutRows = await db.select().from(payouts);
    const featureRows = await db.select().from(features);

    const creditsOnBooks = (users as { balance: number }[]).reduce(
      (sum, u) => sum + Number(u.balance),
      0
    );
    const topupUsd = (topupRows as { usdAmount: number; status: string }[])
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.usdAmount), 0);
    const payoutUsd = (payoutRows as { usdAmount: number }[]).reduce(
      (sum, p) => sum + Number(p.usdAmount),
      0
    );
    const usageCredits = (entries as { type: string; amount: number }[])
      .filter((e) => e.type === "debit")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);

    return NextResponse.json({
      apps: appList.length,
      endUsers: users.length,
      features: featureRows.length,
      creditsOnBooks,
      outstandingUsd: creditsToUsd(creditsOnBooks),
      topupUsd,
      payoutUsd,
      usageCredits,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
