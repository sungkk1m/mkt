import { db } from "./db";
import { advertisers, adCreatives, collectionLogs } from "./db/schema";
import { searchAndCollect } from "./searchapi-client";
import { eq, and } from "drizzle-orm";

interface CollectResult {
  total: number;
  new: number;
  updated: number;
}

export async function collectByKeyword(
  keyword: string,
  country: string = "KR"
): Promise<CollectResult> {
  let total = 0;
  let newCount = 0;
  let updatedCount = 0;

  try {
    const results = await searchAndCollect(keyword, country);

    for (const result of results) {
      // Upsert advertiser
      const existing = await db
        .select()
        .from(advertisers)
        .where(eq(advertisers.pageId, result.pageId))
        .limit(1);

      let advertiserId: number;
      if (existing.length === 0) {
        const inserted = await db
          .insert(advertisers)
          .values({
            name: result.pageName,
            pageId: result.pageId,
            country,
          })
          .returning({ id: advertisers.id });
        advertiserId = inserted[0].id;
      } else {
        advertiserId = existing[0].id;
        await db
          .update(advertisers)
          .set({ updatedAt: new Date() })
          .where(eq(advertisers.id, advertiserId));
      }

      // Process ads
      for (const ad of result.ads) {
        total++;

        const existingAd = await db
          .select()
          .from(adCreatives)
          .where(
            and(
              eq(adCreatives.source, "meta"),
              eq(adCreatives.externalId, ad.externalId)
            )
          )
          .limit(1);

        if (existingAd.length === 0) {
          await db.insert(adCreatives).values({
            advertiserId,
            source: "meta",
            externalId: ad.externalId,
            textBody: ad.textBody,
            textTitle: ad.textTitle,
            textDescription: ad.textDescription,
            snapshotUrl: ad.snapshotUrl,
            mediaType: ad.mediaType,
            mediaUrls: JSON.stringify(ad.mediaUrls),
            thumbnailUrl: ad.thumbnailUrl || ad.mediaUrls[0] || null,
            platform: ad.platform,
            country: ad.country,
            firstSeen: ad.firstSeen,
            lastSeen: new Date().toISOString().split("T")[0],
            isActive: ad.isActive ? 1 : 0,
          });
          newCount++;
        } else {
          await db
            .update(adCreatives)
            .set({
              lastSeen: new Date().toISOString().split("T")[0],
              isActive: ad.isActive ? 1 : 0,
            })
            .where(eq(adCreatives.id, existingAd[0].id));
          updatedCount++;
        }
      }
    }

    // Log success
    await db.insert(collectionLogs).values({
      source: "meta",
      searchTerm: keyword,
      adsFound: total,
      adsNew: newCount,
      status: "success",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    await db.insert(collectionLogs).values({
      source: "meta",
      searchTerm: keyword,
      adsFound: 0,
      adsNew: 0,
      status: "error",
      errorMessage: message,
    });
    throw error;
  }

  return { total, new: newCount, updated: updatedCount };
}

export async function collectMultiple(
  keywords: string[],
  country: string = "KR"
): Promise<{ keyword: string; result?: CollectResult; error?: string }[]> {
  const results: { keyword: string; result?: CollectResult; error?: string }[] =
    [];

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    try {
      const result = await collectByKeyword(keyword, country);
      results.push({ keyword, result });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      results.push({ keyword, error: message });
    }

    // Wait 2 seconds between keywords to avoid rate limiting
    if (i < keywords.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}
