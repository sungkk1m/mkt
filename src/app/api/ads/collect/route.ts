import { NextRequest, NextResponse } from "next/server";
import { collectByKeyword, collectByPageId, collectByGoogleAdvertiser } from "@/lib/collector";
import { db } from "@/lib/db";
import { adCreatives, advertisers } from "@/lib/db/schema";
import { like, sql } from "drizzle-orm";
import { DEFAULT_SEARCH_TERMS, DEFAULT_GAME_TERMS } from "@/lib/constants";

async function cleanSeedData(): Promise<number> {
  const seedAds = await db
    .select({ id: adCreatives.id })
    .from(adCreatives)
    .where(like(adCreatives.externalId, "seed_%"));

  if (seedAds.length > 0) {
    await db.delete(adCreatives).where(like(adCreatives.externalId, "seed_%"));
  }

  await db.delete(advertisers).where(
    sql`${advertisers.id} NOT IN (SELECT DISTINCT ${adCreatives.advertiserId} FROM ${adCreatives} WHERE ${adCreatives.advertiserId} IS NOT NULL)`
  );

  return seedAds.length;
}

// GET: Return available default keyword lists (for client to iterate)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.COLLECT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preset = request.nextUrl.searchParams.get("preset");
  let terms: string[] = [];
  switch (preset) {
    case "companies":
      terms = DEFAULT_SEARCH_TERMS;
      break;
    case "games":
      terms = DEFAULT_GAME_TERMS;
      break;
    case "all":
      terms = [...DEFAULT_SEARCH_TERMS, ...DEFAULT_GAME_TERMS];
      break;
    default:
      terms = [...DEFAULT_SEARCH_TERMS, ...DEFAULT_GAME_TERMS];
  }

  return NextResponse.json({ terms });
}

// POST: Process a SINGLE keyword per call to stay within Vercel Hobby 10s limit.
// Client should call this endpoint once per keyword.
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.COLLECT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, pageId, pageName, country = "KR", cleanSeed = false, nextPageToken,
            googleAdvertiserId, googleDomain, googleRegion } = body;

    let seedCleaned = 0;
    if (cleanSeed) {
      seedCleaned = await cleanSeedData();
    }

    // Mode 0: Google Ads Transparency Center collection (SerpAPI)
    if (googleAdvertiserId || googleDomain) {
      const identifier = googleAdvertiserId || googleDomain;
      const idType = googleAdvertiserId ? "advertiser_id" as const : "domain" as const;
      const region = googleRegion || "anywhere";
      const result = await collectByGoogleAdvertiser(identifier, idType, region, nextPageToken);
      return NextResponse.json({ source: "google", ...result });
    }

    // Mode 1: Direct page ID collection (skip keyword search)
    // Supports client-driven pagination via nextPageToken
    if (pageId && typeof pageId === "string") {
      const name = pageName || pageId;
      const result = await collectByPageId(pageId, name, country, nextPageToken);
      return NextResponse.json({ seedCleaned, pageId, ...result });
    }

    // Mode 2: Keyword-based collection
    if (!keyword || typeof keyword !== "string") {
      if (cleanSeed) {
        return NextResponse.json({
          seedCleaned,
          message: `${seedCleaned}개 시드 데이터 삭제 완료`,
        });
      }
      return NextResponse.json(
        { error: "keyword 또는 pageId가 필요합니다" },
        { status: 400 }
      );
    }

    const result = await collectByKeyword(keyword, country);

    return NextResponse.json({
      seedCleaned,
      keyword,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "수집 중 에러 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
