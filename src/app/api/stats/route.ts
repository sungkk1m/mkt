import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adCreatives, advertisers, collectionLogs } from "@/lib/db/schema";
import { eq, count, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    // Total ads
    const totalAds = await db
      .select({ count: count() })
      .from(adCreatives);

    // Active ads
    const activeAds = await db
      .select({ count: count() })
      .from(adCreatives)
      .where(eq(adCreatives.isActive, 1));

    // Total advertisers
    const totalAdvertisers = await db
      .select({ count: count() })
      .from(advertisers);

    // Today's new ads (created today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayNew = await db
      .select({ count: count() })
      .from(adCreatives)
      .where(sql`${adCreatives.createdAt} >= ${todayStart.getTime() / 1000}`);

    // Recent collection logs (last 30)
    const recentLogs = await db
      .select()
      .from(collectionLogs)
      .orderBy(desc(collectionLogs.createdAt))
      .limit(30);

    return NextResponse.json({
      totalAds: totalAds[0].count,
      activeAds: activeAds[0].count,
      totalAdvertisers: totalAdvertisers[0].count,
      todayNew: todayNew[0].count,
      recentLogs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 에러";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
