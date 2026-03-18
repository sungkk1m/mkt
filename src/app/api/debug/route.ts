import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BASE_URL = "https://www.searchapi.io/api/v1/search";

// Debug endpoint to inspect raw SearchAPI.io responses
// GET /api/debug?keyword=111%25&type=page_search
// GET /api/debug?page_id=371171589575669&type=ads
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.COLLECT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchApiKey = process.env.SEARCHAPI_KEY;
  if (!searchApiKey) {
    return NextResponse.json({ error: "SEARCHAPI_KEY not set" }, { status: 500 });
  }

  const type = request.nextUrl.searchParams.get("type") || "page_search";
  const keyword = request.nextUrl.searchParams.get("keyword") || "111%";
  const pageId = request.nextUrl.searchParams.get("page_id");
  const country = request.nextUrl.searchParams.get("country") || "KR";

  try {
    let params: Record<string, string>;

    if (type === "page_search") {
      params = {
        engine: "meta_ad_library_page_search",
        q: keyword,
        country,
        api_key: searchApiKey,
      };
    } else if (type === "ads" && pageId) {
      params = {
        engine: "meta_ad_library",
        page_id: pageId,
        country,
        ad_type: "all",
        api_key: searchApiKey,
      };
    } else {
      return NextResponse.json(
        { error: "type must be 'page_search' or 'ads' (with page_id)" },
        { status: 400 }
      );
    }

    const response = await axios.get(BASE_URL, { params, timeout: 8000 });
    const data = response.data;

    // Return raw response with key structure info
    const topLevelKeys = Object.keys(data);

    // For page search, inspect first page result structure
    let firstPageKeys: string[] = [];
    let firstPage: unknown = null;
    const pageResults = data.page_results || data.results || data.pages;
    if (Array.isArray(pageResults) && pageResults.length > 0) {
      firstPage = pageResults[0];
      firstPageKeys = Object.keys(pageResults[0]);
    }

    // For ad search, inspect first ad structure
    let firstAdKeys: string[] = [];
    let firstAd: unknown = null;
    let firstSnapshot: unknown = null;
    let firstCardKeys: string[] = [];
    const adResults = data.ad_results || data.ads || data.results;
    if (Array.isArray(adResults) && adResults.length > 0) {
      firstAd = adResults[0];
      firstAdKeys = Object.keys(adResults[0]);
      const snapshot = (adResults[0] as Record<string, unknown>).snapshot;
      if (snapshot && typeof snapshot === "object") {
        firstSnapshot = snapshot;
        const cards = (snapshot as Record<string, unknown>).cards;
        if (Array.isArray(cards) && cards.length > 0) {
          firstCardKeys = Object.keys(cards[0]);
        }
      }
    }

    return NextResponse.json({
      type,
      params: { ...params, api_key: "***" },
      topLevelKeys,
      totalResults: Array.isArray(pageResults)
        ? pageResults.length
        : Array.isArray(adResults)
          ? adResults.length
          : 0,
      firstPageKeys,
      firstPage,
      firstAdKeys,
      firstAd,
      firstSnapshot,
      firstCardKeys,
      // Include full raw response for complete inspection
      rawResponse: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
