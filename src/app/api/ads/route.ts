import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adCreatives, advertisers } from "@/lib/db/schema";
import { eq, like, desc, asc, and, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const advertiser = searchParams.get("advertiser");
    const mediaType = searchParams.get("mediaType");
    const country = searchParams.get("country");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "newest";
    const isActive = searchParams.get("isActive");

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (advertiser) {
      // Find advertiser ID by name
      const adv = await db
        .select()
        .from(advertisers)
        .where(eq(advertisers.name, advertiser))
        .limit(1);
      if (adv.length > 0) {
        conditions.push(eq(adCreatives.advertiserId, adv[0].id));
      }
    }

    if (mediaType && mediaType !== "all") {
      conditions.push(eq(adCreatives.mediaType, mediaType));
    }

    if (country && country !== "ALL") {
      conditions.push(eq(adCreatives.country, country));
    }

    if (search) {
      conditions.push(
        sql`(${adCreatives.textBody} LIKE ${"%" + search + "%"} OR ${adCreatives.textTitle} LIKE ${"%" + search + "%"})`
      );
    }

    if (isActive === "true") {
      conditions.push(eq(adCreatives.isActive, 1));
    } else if (isActive === "false") {
      conditions.push(eq(adCreatives.isActive, 0));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const totalResult = await db
      .select({ count: count() })
      .from(adCreatives)
      .where(where);
    const total = totalResult[0].count;

    // Get data with advertiser name
    const orderBy =
      sort === "oldest"
        ? asc(adCreatives.createdAt)
        : desc(adCreatives.createdAt);

    const data = await db
      .select({
        id: adCreatives.id,
        advertiserId: adCreatives.advertiserId,
        advertiserName: advertisers.name,
        source: adCreatives.source,
        externalId: adCreatives.externalId,
        textBody: adCreatives.textBody,
        textTitle: adCreatives.textTitle,
        textDescription: adCreatives.textDescription,
        snapshotUrl: adCreatives.snapshotUrl,
        mediaType: adCreatives.mediaType,
        mediaUrls: adCreatives.mediaUrls,
        thumbnailUrl: adCreatives.thumbnailUrl,
        platform: adCreatives.platform,
        country: adCreatives.country,
        firstSeen: adCreatives.firstSeen,
        lastSeen: adCreatives.lastSeen,
        isActive: adCreatives.isActive,
        createdAt: adCreatives.createdAt,
      })
      .from(adCreatives)
      .leftJoin(advertisers, eq(adCreatives.advertiserId, advertisers.id))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 에러";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
