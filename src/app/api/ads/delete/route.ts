import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adCreatives, advertisers, collectionLogs } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";

// POST /api/ads/delete
// Body: { advertiserName: string } — deletes all ads for that advertiser name
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.COLLECT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { advertiserName } = body;

    if (!advertiserName || typeof advertiserName !== "string") {
      return NextResponse.json(
        { error: "advertiserName (문자열) 이 필요합니다" },
        { status: 400 }
      );
    }

    // Find all advertiser records with this name
    const advs = await db
      .select({ id: advertisers.id, pageId: advertisers.pageId })
      .from(advertisers)
      .where(eq(advertisers.name, advertiserName));

    if (advs.length === 0) {
      return NextResponse.json(
        { error: `광고주 "${advertiserName}"를 찾을 수 없습니다` },
        { status: 404 }
      );
    }

    const advIds = advs.map((a) => a.id);

    // Count ads to be deleted
    const countResult = await db
      .select({ count: count() })
      .from(adCreatives)
      .where(
        advIds.length === 1
          ? eq(adCreatives.advertiserId, advIds[0])
          : sql`${adCreatives.advertiserId} IN (${sql.raw(advIds.join(","))})`
      );
    const adsToDelete = countResult[0].count;

    if (adsToDelete === 0) {
      return NextResponse.json({
        deleted: 0,
        message: `"${advertiserName}" 광고주에 삭제할 광고가 없습니다`,
      });
    }

    // Delete ads
    if (advIds.length === 1) {
      await db.delete(adCreatives).where(eq(adCreatives.advertiserId, advIds[0]));
    } else {
      await db.delete(adCreatives).where(
        sql`${adCreatives.advertiserId} IN (${sql.raw(advIds.join(","))})`
      );
    }

    // Delete orphan advertisers (those with 0 ads remaining)
    await db.delete(advertisers).where(
      sql`${advertisers.id} IN (${sql.raw(advIds.join(","))}) AND ${advertisers.id} NOT IN (SELECT DISTINCT ${adCreatives.advertiserId} FROM ${adCreatives} WHERE ${adCreatives.advertiserId} IS NOT NULL)`
    );

    // Log deletion
    await db.insert(collectionLogs).values({
      source: "meta",
      searchTerm: `[삭제] ${advertiserName}`,
      adsFound: adsToDelete,
      adsNew: 0,
      status: "success",
      errorMessage: `bulk_delete: ${adsToDelete}개 광고 삭제`,
    });

    return NextResponse.json({
      deleted: adsToDelete,
      advertisersRemoved: advIds.length,
      message: `"${advertiserName}" 광고 ${adsToDelete}개 삭제 완료`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "삭제 중 에러 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
