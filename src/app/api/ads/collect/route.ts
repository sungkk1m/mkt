import { NextRequest, NextResponse } from "next/server";
import { collectMultiple } from "@/lib/collector";

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
    const { searchTerms, country = "KR" } = body;

    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      return NextResponse.json(
        { error: "searchTerms 배열이 필요합니다" },
        { status: 400 }
      );
    }

    const results = await collectMultiple(searchTerms, country);

    const summary = {
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
