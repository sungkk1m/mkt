import { NextRequest, NextResponse } from "next/server";
import { collectMultiple } from "@/lib/collector";
import { db } from "@/lib/db";
import { adCreatives, advertisers } from "@/lib/db/schema";
import { like, sql } from "drizzle-orm";

async function cleanSeedData(): Promise<number> {
  // Delete seed ads (externalId starts with 'seed_')
  const seedAds = await db
    .select({ id: adCreatives.id })
    .from(adCreatives)
    .where(like(adCreatives.externalId, "seed_%"));

  if (seedAds.length > 0) {
    await db.delete(adCreatives).where(like(adCreatives.externalId, "seed_%"));
  }

  // Delete orphaned advertisers (no ads referencing them)
  await db.delete(advertisers).where(
    sql`${advertisers.id} NOT IN (SELECT DISTINCT ${adCreatives.advertiserId} FROM ${adCreatives} WHERE ${adCreatives.advertiserId} IS NOT NULL)`
  );

  return seedAds.length;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.COLLECT_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { searchTerms, country = "KR", cleanSeed = false } = body;

    let seedCleaned = 0;
    if (cleanSeed) {
      seedCleaned = await cleanSeedData();
    }

    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      if (cleanSeed) {
        return NextResponse.json({
          seedCleaned,
          message: `${seedCleaned}개 시드 데이터 삭제 완료`,
        });
      }
      return NextResponse.json(
        { error: "searchTerms 배열이 필요합니다" },
        { status: 400 }
      );
    }

    const results = await collectMultiple(searchTerms, country);

    const summary = {
      seedCleaned,
      totalKeywords: searchTerms.length,
      totalAdsFound: results.reduce((sum, r) => sum + (r.result?.total || 0), 0),
      totalNew: results.reduce((sum, r) => sum + (r.result?.new || 0), 0),
      totalUpdated: results.reduce(
        (sum, r) => sum + (r.result?.updated || 0),
        0
      ),
      details: results,
    };

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "수집 중 에러 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
