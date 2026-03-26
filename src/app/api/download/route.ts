import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adCreatives, advertisers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Proxy download to avoid CORS issues with Meta CDN
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow known CDN domains
  const allowed = [
    "scontent",
    "video",
    "facebook.com",
    "fbcdn.net",
    "cdninstagram.com",
    "searchapi.io",
  ];
  const isAllowed = allowed.some((domain) => url.includes(domain));
  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    // Determine filename from URL
    const urlPath = new URL(url).pathname;
    const ext = contentType.includes("video")
      ? ".mp4"
      : contentType.includes("png")
        ? ".png"
        : ".jpg";
    const filename = urlPath.split("/").pop()?.split("?")[0] || `media${ext}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
  }
}

// Bulk download: return all media URLs for selected ad IDs
export async function POST(request: NextRequest) {
  try {
    const { adIds } = await request.json();

    if (!Array.isArray(adIds) || adIds.length === 0) {
      return NextResponse.json({ error: "adIds array required" }, { status: 400 });
    }

    if (adIds.length > 100) {
      return NextResponse.json({ error: "Max 100 ads at a time" }, { status: 400 });
    }

    const results: {
      adId: number;
      advertiserName: string;
      mediaType: string;
      mediaUrls: string[];
      thumbnailUrl: string | null;
    }[] = [];

    for (const adId of adIds) {
      const rows = await db
        .select({
          id: adCreatives.id,
          advertiserName: advertisers.name,
          mediaType: adCreatives.mediaType,
          mediaUrls: adCreatives.mediaUrls,
          thumbnailUrl: adCreatives.thumbnailUrl,
        })
        .from(adCreatives)
        .leftJoin(advertisers, eq(adCreatives.advertiserId, advertisers.id))
        .where(eq(adCreatives.id, adId))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        results.push({
          adId: row.id,
          advertiserName: row.advertiserName || "Unknown",
          mediaType: row.mediaType || "image",
          mediaUrls: row.mediaUrls ? JSON.parse(row.mediaUrls) : [],
          thumbnailUrl: row.thumbnailUrl,
        });
      }
    }

    return NextResponse.json({ data: results });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
