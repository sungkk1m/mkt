import axios, { AxiosError } from "axios";
import type {
  SearchApiPageResult,
  SearchApiAd,
  SearchApiPageSearchResponse,
  SearchApiAdSearchResponse,
  NormalizedAd,
} from "@/types/searchapi";

const BASE_URL = "https://www.searchapi.io/api/v1/search";
const MAX_PAGES = 3;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 2;

function getApiKey(): string {
  const key = process.env.SEARCHAPI_KEY;
  if (!key || key === "여기에_키_입력") {
    throw new Error("SEARCHAPI_KEY 환경변수를 설정해주세요");
  }
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
      if (error.response?.status === 401) {
        throw new Error("API 키가 올바르지 않습니다");
      }
      if (error.response?.status === 429 && retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        return requestWithRetry<T>(url, params, retries + 1);
      }
      if (!error.response) {
        throw new Error("SearchAPI.io에 연결할 수 없습니다");
      }
    }
    throw error;
  }
}

function normalizeAd(ad: SearchApiAd, country: string): NormalizedAd {
  const snapshot = ad.snapshot;
  const body = snapshot?.body_text || ad.body || "";
  const title = snapshot?.title || ad.title || "";
  const description = snapshot?.description || ad.description || "";

  // Extract image URLs
  const images: Array<{ original_image_url?: string; resized_image_url?: string }> =
    snapshot?.images || ad.images || [];
  const imageUrls = images
    .map((img) => img.original_image_url || img.resized_image_url)
    .filter(Boolean) as string[];

  // Extract video URLs
  const videos: Array<{ video_url?: string; video_hd_url?: string; video_sd_url?: string; video_preview_image_url?: string }> =
    snapshot?.videos || ad.videos || [];
  const videoUrls = videos
    .map((v) => v.video_hd_url || v.video_url || v.video_sd_url)
    .filter(Boolean) as string[];

  // Determine media type
  let mediaType: "image" | "video" | "carousel" = "image";
  if (snapshot?.cards && snapshot.cards.length > 1) {
    mediaType = "carousel";
  } else if (videoUrls.length > 0) {
    mediaType = "video";
  }

  // Combine all media URLs
  const mediaUrls = mediaType === "video" ? videoUrls : imageUrls;

  // Thumbnail: first image, or video preview
  const thumbnailUrl =
    imageUrls[0] ||
    videos[0]?.video_preview_image_url ||
    undefined;

  // Platform
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

export async function searchPages(
  keyword: string,
  country: string = "KR"
): Promise<SearchApiPageResult[]> {
  const apiKey = getApiKey();
  const data = await requestWithRetry<SearchApiPageSearchResponse>(BASE_URL, {
    engine: "meta_ad_library",
    search_type: "page",
    q: keyword,
    country,
    api_key: apiKey,
  });
  return data.page_results || [];
}

export async function searchAdsByKeyword(
  keyword: string,
  country: string = "KR"
): Promise<NormalizedAd[]> {
  const apiKey = getApiKey();
  const allAds: NormalizedAd[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = {
      engine: "meta_ad_library",
      search_type: "keyword_unordered",
      q: keyword,
      country,
      ad_type: "all",
      api_key: apiKey,
    };

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const data = await requestWithRetry<SearchApiAdSearchResponse>(
      BASE_URL,
      params
    );
    const ads = data.ad_results || data.ads || [];
    const normalized = ads.map((ad) => normalizeAd(ad, country));
    allAds.push(...normalized);

    nextPageToken =
      data.next_page_token ||
      data.serpapi_pagination?.next_page_token;
    if (!nextPageToken) break;
  }

  return allAds;
}

export async function getAdsByPageId(
  pageId: string,
  options?: { mediaType?: string; country?: string }
): Promise<NormalizedAd[]> {
  const apiKey = getApiKey();
  const country = options?.country || "KR";
  const allAds: NormalizedAd[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = {
      engine: "meta_ad_library",
      search_type: "keyword_unordered",
      page_id: pageId,
      country,
      ad_type: "all",
      api_key: apiKey,
    };

    if (options?.mediaType && options.mediaType !== "all") {
      params.media_type = options.mediaType;
    }

    if (nextPageToken) {
      params.next_page_token = nextPageToken;
    }

    const data = await requestWithRetry<SearchApiAdSearchResponse>(
      BASE_URL,
      params
    );
    const ads = data.ad_results || data.ads || [];
    const normalized = ads.map((ad) => normalizeAd(ad, country));
    allAds.push(...normalized);

    nextPageToken =
      data.next_page_token ||
      data.serpapi_pagination?.next_page_token;
    if (!nextPageToken) break;
  }

  return allAds;
}

export interface SearchAndCollectResult {
  pageName: string;
  pageId: string;
  ads: NormalizedAd[];
  method: "page_search" | "keyword_search";
}

export async function searchAndCollect(
  keyword: string,
  country: string = "KR"
): Promise<SearchAndCollectResult[]> {
  const results: SearchAndCollectResult[] = [];

  // Strategy 1: Search for advertiser pages
  const pages = await searchPages(keyword, country);

  if (pages.length > 0) {
    // Process top 3 pages instead of just 1
    const topPages = pages.slice(0, 3);

    for (const page of topPages) {
      const ads = await getAdsByPageId(page.page_id, { country });
      if (ads.length > 0) {
        results.push({
          pageName: page.page_name,
          pageId: page.page_id,
          ads,
          method: "page_search",
        });
      }
    }
  }

  // Strategy 2: If page search yielded no ads, search ads by keyword directly
  if (results.length === 0 || results.every((r) => r.ads.length === 0)) {
    const keywordAds = await searchAdsByKeyword(keyword, country);
    if (keywordAds.length > 0) {
      // Group by page
      const pageMap = new Map<string, NormalizedAd[]>();
      for (const ad of keywordAds) {
        const key = ad.pageId || "unknown";
        if (!pageMap.has(key)) {
          pageMap.set(key, []);
        }
        pageMap.get(key)!.push(ad);
      }

      for (const [pageId, ads] of pageMap) {
        results.push({
          pageName: ads[0].pageName || keyword,
          pageId,
          ads,
          method: "keyword_search",
        });
      }
    }
  }

  return results;
}
