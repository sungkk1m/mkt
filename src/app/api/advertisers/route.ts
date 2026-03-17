import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { advertisers, adCreatives } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const genre = searchParams.get("genre");

    const conditions = genre ? eq(advertisers.genre, genre) : undefined;

    const data = await db
      .select({
        id: advertisers.id,
        name: advertisers.name,
        pageId: advertisers.pageId,
        genre: advertisers.genre,
        country: advertisers.country,
        createdAt: advertisers.createdAt,
        adCount: count(adCreatives.id),
      })
      .from(advertisers)
      .leftJoin(adCreatives, eq(advertisers.id, adCreatives.advertiserId))
      .where(conditions)
      .groupBy(advertisers.id)
      .orderBy(advertisers.name);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 에러";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
