import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { advertisers, adCreatives } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const genre = searchParams.get("genre");

    const conditions = genre ? eq(advertisers.genre, genre) : undefined;

    // Group by advertiser NAME to merge duplicates (same company, different pageIds)
    const data = await db
      .select({
        id: sql<number>`MIN(${advertisers.id})`.as("id"),
        name: advertisers.name,
        pageId: sql<string>`GROUP_CONCAT(DISTINCT ${advertisers.pageId})`.as("page_id"),
        genre: sql<string>`MAX(${advertisers.genre})`.as("genre"),
        country: sql<string>`MAX(${advertisers.country})`.as("country"),
        createdAt: sql<number>`MIN(${advertisers.createdAt})`.as("created_at"),
        adCount: count(adCreatives.id),
      })
      .from(advertisers)
      .leftJoin(adCreatives, eq(advertisers.id, adCreatives.advertiserId))
      .where(conditions)
      .groupBy(advertisers.name)
      .orderBy(advertisers.name);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 에러";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
