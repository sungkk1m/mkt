import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { like, sql } from "drizzle-orm";
import { advertisers, adCreatives, collectionLogs } from "../src/lib/db/schema";

// Re-implement collection logic inline to avoid Next.js module resolution issues
import axios, { AxiosError } from "axios";

const BASE_URL = "https://www.searchapi.io/api/v1/search";

interface NormalizedAd {
  externalId: string;
  textBody?: string;
  textTitle?: string;
  textDescription?: string;
  snapshotUrl?: string;
  mediaType: "image" | "video" | "carousel";
  mediaUrls: string[];
  thumbnailUrl?: string;
  platform: string;
  country: string;
  firstSeen?: string;
  isActive: boolean;
  pageName?: string;
  pageId?: string;
}

function getApiKey(): string {
  const key = process.env.SEARCHAPI_KEY;
  if (!key) throw new Error("SEARCHAPI_KEY 환경변수를 설정해주세요");
  return key;
}

async function requestWithRetry<T>(
  url: string,
  params: Record<string, string>,
  retries = 0
): Promise<T> {
  try {
    const response = await axios.get<T>(url, { params, timeout: 30000 });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) throw new Error("API 키가 올바르지 않습니다");
      if (error.response?.status === 429 && retries < 2) {
        console.log(`  Rate limited, waiting 5s... (retry ${retries + 1})`);
        await new Promise((r) => setTimeout(r, 5000));
        return requestWithRetry<T>(url, params, retries + 1);
      }
    }
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAd(ad: any, country: string): NormalizedAd {
  const snapshot = ad.snapshot;
  const body = snapshot?.body_text || ad.body || "";
  const title = snapshot?.title || ad.title || "";
  const description = snapshot?.description || ad.description || "";

  const images = snapshot?.images || ad.images || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrls = images.map((img: any) => img.original_image_url || img.resized_image_url).filter(Boolean) as string[];

  const videos = snapshot?.videos || ad.videos || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoUrls = videos.map((v: any) => v.video_hd_url || v.video_url || v.video_sd_url).filter(Boolean) as string[];

  let mediaType: "image" | "video" | "carousel" = "image";
  if (snapshot?.cards && snapshot.cards.length > 1) {
    mediaType = "carousel";
  } else if (videoUrls.length > 0) {
    mediaType = "video";
  }

  const mediaUrls = mediaType === "video" ? videoUrls : imageUrls;
  const thumbnailUrl = imageUrls[0] || videos[0]?.video_preview_image_url || undefined;
  const platforms = ad.publisher_platforms || [];
  const platform = platforms[0] || "facebook";

  return {
    externalId: ad.ad_id || ad.id || `${ad.page_id}_${Date.now()}`,
    textBody: body || undefined,
    textTitle: title || undefined,
    textDescription: description || undefined,
    snapshotUrl: ad.ad_snapshot_url || undefined,
    mediaType,
    mediaUrls,
    thumbnailUrl,
    platform,
    country,
    firstSeen: ad.ad_delivery_start_time || undefined,
    isActive: ad.is_active !== false,
    pageName: ad.page_name || undefined,
    pageId: ad.page_id || undefined,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error("DATABASE_URL 환경변수를 설정해주세요");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);
  const apiKey = getApiKey();

  // Step 1: 시드 데이터 삭제
  console.log("=== Step 1: 시드 데이터 삭제 ===");

  const seedAds = await db
    .select({ id: adCreatives.id })
    .from(adCreatives)
    .where(like(adCreatives.externalId, "seed_%"));

  if (seedAds.length > 0) {
    await db.delete(adCreatives).where(like(adCreatives.externalId, "seed_%"));
    console.log(`  ${seedAds.length}개 시드 광고 삭제 완료`);
  } else {
    console.log("  시드 광고 없음 (이미 삭제됨)");
  }

  // 시드 광고주 삭제 (orphaned)
  const seedAdvPageIds = ["nexon_kr", "devsisters", "mihoyo_global"];
  for (const pageId of seedAdvPageIds) {
    const { rows } = await client.execute({
      sql: `DELETE FROM advertisers WHERE page_id = ? AND id NOT IN (SELECT DISTINCT advertiser_id FROM ad_creatives WHERE advertiser_id IS NOT NULL)`,
      args: [pageId],
    });
    if (rows.length > 0 || (rows as unknown as number) > 0) {
      console.log(`  광고주 ${pageId} 삭제`);
    }
  }
  // Simpler approach - delete orphaned advertisers
  await client.execute(`DELETE FROM advertisers WHERE id NOT IN (SELECT DISTINCT advertiser_id FROM ad_creatives WHERE advertiser_id IS NOT NULL)`);
  console.log("  고아 광고주 정리 완료");

  // Step 2: 실제 데이터 수집
  console.log("\n=== Step 2: SearchAPI.io로 실제 데이터 수집 ===");

  const keywords = ["원신", "쿠키런", "메이플스토리", "리니지", "블루아카이브"];

  for (let ki = 0; ki < keywords.length; ki++) {
    const keyword = keywords[ki];
    console.log(`\n[${ki + 1}/${keywords.length}] "${keyword}" 검색 중...`);

    try {
      // Search pages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageData = await requestWithRetry<any>(BASE_URL, {
        engine: "meta_ad_library_page_search",
        q: keyword,
        country: "KR",
        api_key: apiKey,
      });

      const pages = pageData.page_results || [];
      if (pages.length === 0) {
        console.log(`  "${keyword}" 관련 페이지 없음`);
        continue;
      }

      const topPage = pages[0];
      console.log(`  페이지 발견: ${topPage.page_name} (${topPage.page_id})`);

      // Get ads for page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adData = await requestWithRetry<any>(BASE_URL, {
        engine: "meta_ad_library",
        page_id: topPage.page_id,
        country: "KR",
        ad_type: "all",
        api_key: apiKey,
      });

      const rawAds = adData.ad_results || adData.ads || [];
      const normalizedAds = rawAds.map((ad: unknown) => normalizeAd(ad, "KR"));
      console.log(`  ${normalizedAds.length}개 광고 발견`);

      if (normalizedAds.length === 0) continue;

      // Upsert advertiser
      const existingAdv = await db
        .select()
        .from(advertisers)
        .where(sql`${advertisers.pageId} = ${topPage.page_id}`)
        .limit(1);

      let advertiserId: number;
      if (existingAdv.length === 0) {
        const inserted = await db
          .insert(advertisers)
          .values({
            name: topPage.page_name,
            pageId: topPage.page_id,
            country: "KR",
          })
          .returning({ id: advertisers.id });
        advertiserId = inserted[0].id;
        console.log(`  광고주 생성: ${topPage.page_name} (ID: ${advertiserId})`);
      } else {
        advertiserId = existingAdv[0].id;
        console.log(`  기존 광고주 사용: ${topPage.page_name} (ID: ${advertiserId})`);
      }

      // Insert ads
      let newCount = 0;
      let updatedCount = 0;

      for (const ad of normalizedAds) {
        const existingAd = await db
          .select()
          .from(adCreatives)
          .where(sql`${adCreatives.source} = 'meta' AND ${adCreatives.externalId} = ${ad.externalId}`)
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
            .where(sql`${adCreatives.id} = ${existingAd[0].id}`);
          updatedCount++;
        }
      }

      console.log(`  결과: 신규 ${newCount}개, 업데이트 ${updatedCount}개`);

      // Log
      await db.insert(collectionLogs).values({
        source: "meta",
        searchTerm: keyword,
        adsFound: normalizedAds.length,
        adsNew: newCount,
        status: "success",
      });

      // Wait between keywords
      if (ki < keywords.length - 1) {
        console.log("  2초 대기...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  오류: ${message}`);

      await db.insert(collectionLogs).values({
        source: "meta",
        searchTerm: keyword,
        adsFound: 0,
        adsNew: 0,
        status: "error",
        errorMessage: message,
      });
    }
  }

  // Step 3: 결과 확인
  console.log("\n=== Step 3: 최종 결과 ===");
  const allAds = await db.select({ id: adCreatives.id }).from(adCreatives);
  const allAdv = await db.select({ id: advertisers.id, name: advertisers.name }).from(advertisers);

  console.log(`총 광고주: ${allAdv.length}개`);
  for (const adv of allAdv) {
    console.log(`  - ${adv.name}`);
  }
  console.log(`총 광고: ${allAds.length}개`);

  // Show sample ad to verify media URLs
  const sampleAd = await db
    .select({
      title: adCreatives.textTitle,
      mediaType: adCreatives.mediaType,
      thumbnailUrl: adCreatives.thumbnailUrl,
      snapshotUrl: adCreatives.snapshotUrl,
    })
    .from(adCreatives)
    .limit(1);

  if (sampleAd.length > 0) {
    console.log("\n--- 샘플 광고 ---");
    console.log(`  제목: ${sampleAd[0].title}`);
    console.log(`  미디어: ${sampleAd[0].mediaType}`);
    console.log(`  썸네일: ${sampleAd[0].thumbnailUrl?.substring(0, 80)}...`);
    console.log(`  Meta URL: ${sampleAd[0].snapshotUrl?.substring(0, 80)}...`);
  }

  console.log("\n완료!");
  process.exit(0);
}

main().catch((err) => {
  console.error("실패:", err);
  process.exit(1);
});
