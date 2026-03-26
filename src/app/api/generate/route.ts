import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatedCreatives, adInsights } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";

// GET: List generated creatives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sourceAdId = searchParams.get("sourceAdId");
    const offset = (page - 1) * limit;

    const conditions = sourceAdId
      ? eq(generatedCreatives.sourceAdId, parseInt(sourceAdId))
      : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(generatedCreatives)
      .where(conditions);

    const data = await db
      .select()
      .from(generatedCreatives)
      .where(conditions)
      .orderBy(desc(generatedCreatives.createdAt))
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

// POST: Request creative generation (placeholder for Stage 3)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.COLLECT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceAdId, sourceInsightId, creativeType, format, prompt } = body;

    if (!creativeType) {
      return NextResponse.json({ error: "creativeType required" }, { status: 400 });
    }

    // TODO: Stage 3 - Call AI model to generate creative
    // For now, return a placeholder indicating the endpoint is ready
    return NextResponse.json({
      message: "Stage 3 creative generation endpoint ready. AI integration pending.",
      sourceAdId,
      sourceInsightId,
      creativeType,
      format,
      status: "not_implemented",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
