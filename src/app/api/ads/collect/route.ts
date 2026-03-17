import { NextRequest, NextResponse } from "next/server";
import { collectMultiple } from "@/lib/collector";
import { db } from "@/lib/db";
import { adCreatives, advertisers } from "@/lib/db/schema";
import { like, sql } from "drizzle-orm";
import { DEFAULT_SEARCH_TERMS, DEFAULT_GAME_TERMS } from "@/lib/constants";

// Vercel Hobby plan: max 60s (default 10s). Extend to handle multiple keywords.
export const maxDuration = 60;

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

function resolveSearchTerms(body: {
  searchTerms?: string[];
  useDefaultTerms?: "companies" | "games" | "all";
}): string[] {
  // useDefaultTerms: load keywords from server-side constants (avoids encoding issues)
  if (body.useDefaultTerms) {
    switch (body.useDefaultTerms) {
      case "companies":
        return DEFAULT_SEARCH_TERMS;
      case "games":
        return DEFAULT_GAME_TERMS;
      case "all":
        return [...DEFAULT_SEARCH_TERMS, ...DEFAULT_GAME_TERMS];
    }
  }
  return body.searchTerms || [];
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
    const { country = "KR", cleanSeed = false } = body;

    let seedCleaned = 0;
    if (cleanSeed) {
      seedCleaned = await cleanSeedData();
    }

    const searchTerms = resolveSearchTerms(body);

    if (searchTerms.length === 0) {
      if (cleanSeed) {
        return NextResponse.json({
          seedCleaned,
          message: `${seedCleaned}개 시드 데이터 삭제 완료`,
        });
      }
      return NextResponse.json(
        { error: "searchTerms 배열 또는 useDefaultTerms ('companies' | 'games' | 'all') 가 필요합니다" },
        { status: 400 }
      );
    }

    const results = await collectMultiple(searchTerms, country);

    const summary = {
      seedCleaned,
      totalKeywords: searchTerms.length,
      keywords: searchTerms,
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
