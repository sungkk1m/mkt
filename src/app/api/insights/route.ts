import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adInsights, adCreatives } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

// GET: List insights with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const adId = searchParams.get("adId");
    const offset = (page - 1) * limit;

    const conditions = adId ? eq(adInsights.adCreativeId, parseInt(adId)) : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(adInsights)
      .where(conditions);

    const data = await db
      .select()
      .from(adInsights)
      .where(conditions)
      .orderBy(desc(adInsights.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create insight for an ad (placeholder for Stage 2 AI integration)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.COLLECT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adCreativeId } = body;

    if (!adCreativeId) {
      return NextResponse.json({ error: "adCreativeId required" }, { status: 400 });
    }

    // Verify ad exists
    const ad = await db
      .select()
      .from(adCreatives)
      .where(eq(adCreatives.id, adCreativeId))
      .limit(1);

    if (ad.length === 0) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // TODO: Stage 2 - Call AI model to analyze the ad
    // For now, return a placeholder indicating the endpoint is ready
    return NextResponse.json({
      message: "Stage 2 AI analysis endpoint ready. AI integration pending.",
      adCreativeId,
      status: "not_implemented",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
