import { NextRequest, NextResponse } from "next/server";
import { searchPages } from "@/lib/searchapi-client";

// GET /api/pages?q=Supercell&country=KR
// Returns matching Facebook pages for the user to select from.
// Does NOT modify any data — read-only name→page resolution.
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.COLLECT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  const country = request.nextUrl.searchParams.get("country") || "KR";

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  try {
    const pages = await searchPages(q.trim(), country);

    // Map to a clean response format
    const results = pages.slice(0, 10).map((page) => ({
      pageId: page.page_id || page.id || "",
      pageName: page.page_name || page.name || "Unknown",
      category: page.page_category || page.category || "",
      likes: page.likes || 0,
      profilePicture: page.page_profile_picture_url || page.profile_picture_url || "",
    }));

    return NextResponse.json({ results, total: pages.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
