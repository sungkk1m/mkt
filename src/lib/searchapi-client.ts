import axios, { AxiosError } from "axios";
import type {
  SearchApiPageResult,
  SearchApiAd,
  SearchApiPageSearchResponse,
  SearchApiAdSearchResponse,
  NormalizedAd,
} from "@/types/searchapi";

const BASE_URL = "https://www.searchapi.io/api/v1/search";
const MAX_PAGINATION = 1;
const RETRY_DELAY = 5000;
const MAX_RETRIES = 2;
const INTER_CALL_DELAY = 1000;

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
    const response = await axios.get<T>(url, { params, timeout: 8000 });
    // Validate API-level errors in response body
    const data = response.data as Record<string, unknown>;
    if (data?.search_metadata) {
      const meta = data.search_metadata as Record<string, unknown>;
      if (meta.status === "Error" || meta.status === "error") {
        throw new Error(
          `SearchAPI 응답 에러: ${meta.error || meta.message || JSON.stringify(meta)}`
        );
      }
    }
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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isTemplateVariable(text: string): boolean {
  return /\{\{.*?\}\}/.test(text);
}

// Flexible page name extraction - tries multiple possible field names
function getPageName(page: SearchApiPageResult): string {
  return page.page_name || page.name || (page as Record<string, unknown>).title as string || "Unknown";
}

// Flexible page ID extraction
function getPageId(page: SearchApiPageResult): string {
  return page.page_id || page.id || "";
}

// Extract any image URL from a card object, trying all possible field names
function getCardImageUrl(card: Record<string, unknown>): string | undefined {
  return (
    (card.image_url as string) ||
    (card.original_image_url as string) ||
    (card.resized_image_url as string) ||
    (card.image as string) ||
    (card.thumbnail_url as string) ||
    (card.media_url as string) ||
    undefined
  );
}

// Extract any image URL from an image object
function getImageUrl(img: Record<string, unknown>): string | undefined {
  return (
    (img.original_image_url as string) ||
    (img.resized_image_url as string) ||
    (img.url as string) ||
    (img.image_url as string) ||
    undefined
  );
}

// Safely extract string value — if it's an object, stringify it
function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    // Could be { text: "..." } or similar nested structure
    const obj = val as Record<string, unknown>;
    if (obj.text && typeof obj.text === "string") return obj.text;
    if (obj.content && typeof obj.content === "string") return obj.content;
    if (obj.markup && typeof obj.markup === "string") return obj.markup;
    return JSON.stringify(val);
  }
  return String(val);
}

function normalizeAd(ad: SearchApiAd, country: string): NormalizedAd {
  const snapshot = ad.snapshot;
  const body = safeString(snapshot?.body_text || snapshot?.body || ad.body || "");
  const description = safeString(snapshot?.description || ad.description || "");

  // Extract title, filtering out template variables like {{product.name}}
  let title = safeString(snapshot?.title || ad.title || "");
  if (isTemplateVariable(title)) {
    const cardTitle = snapshot?.cards?.find(
      (card) => card.title && !isTemplateVariable(card.title)
    )?.title;
    title = cardTitle || description || "";
  }

  // Clean template variables from body/description too
  const cleanBody = isTemplateVariable(body) ? "" : body;
  const cleanDescription = isTemplateVariable(description) ? "" : description;

  // Extract image URLs - try multiple field names
  const images = snapshot?.images || ad.images || [];
  const imageUrls = images
    .map((img) => getImageUrl(img as Record<string, unknown>))
    .filter(Boolean) as string[];

  // Extract video URLs
  const videos = snapshot?.videos || ad.videos || [];
  const videoUrls = videos
    .map((v) => {
      const vid = v as Record<string, unknown>;
      return (vid.video_hd_url as string) || (vid.video_url as string) || (vid.video_sd_url as string);
    })
    .filter(Boolean) as string[];

  // Extract carousel card image URLs - try all possible field names
  const cards = snapshot?.cards || [];
  const cardImageUrls = cards
    .map((card) => getCardImageUrl(card as Record<string, unknown>))
    .filter(Boolean) as string[];

  // Determine media type
  let mediaType: "image" | "video" | "carousel" = "image";
  if (cards.length > 1) {
    mediaType = "carousel";
  } else if (videoUrls.length > 0) {
    mediaType = "video";
  }

  // Combine all media URLs
  let mediaUrls: string[];
  if (mediaType === "video") {
    mediaUrls = videoUrls;
  } else if (mediaType === "carousel") {
    mediaUrls = cardImageUrls.length > 0 ? cardImageUrls : imageUrls;
  } else {
    mediaUrls = imageUrls;
  }

  // Thumbnail: try all sources
  const thumbnailUrl =
    imageUrls[0] ||
    cardImageUrls[0] ||
    (videos[0] as Record<string, unknown>)?.video_preview_image_url as string ||
    (videos[0] as Record<string, unknown>)?.preview_image_url as string ||
    undefined;

  // Platform
  const platforms = ad.publisher_platforms || [];
  const platform = platforms[0] || "facebook";

  return {
    // CRITICAL: ad.id is often a result index (1,2,3...) NOT a unique ad identifier.
    // Use ad_archive_id or ad_id which are truly unique per ad.
    // Fallback includes page_id to avoid cross-advertiser collisions.
    externalId: ad.ad_archive_id || ad.ad_id || ad.archive_id || `${ad.page_id || "unknown"}_${ad.ad_delivery_start_time || ""}_${Date.now()}`,
    textBody: cleanBody || undefined,
    textTitle: title || undefined,
    textDescription: cleanDescription || undefined,
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
    engine: "meta_ad_library_page_search",
    q: keyword,
    country,
    api_key: apiKey,
  });
  // Try multiple possible response field names
  return data.page_results || data.results || [];
}

export interface PagedAdResult {
  ads: NormalizedAd[];
  nextPageToken?: string;
}

// Fetch ONE page of ads for a given page_id.
// Pass nextPageToken from a previous call to get the next page.
export async function getAdsByPageIdPaged(
  pageId: string,
  options?: { mediaType?: string; country?: string; nextPageToken?: string }
): Promise<PagedAdResult> {
  const apiKey = getApiKey();
  const country = options?.country || "KR";

  const params: Record<string, string> = {
    engine: "meta_ad_library",
    page_id: pageId,
    country,
    ad_type: "all",
    api_key: apiKey,
  };

  if (options?.mediaType && options.mediaType !== "all") {
    params.media_type = options.mediaType;
  }

  if (options?.nextPageToken) {
    params.next_page_token = options.nextPageToken;
  }

  const data = await requestWithRetry<SearchApiAdSearchResponse>(
    BASE_URL,
    params
  );
  const ads = data.ad_results || data.ads || data.results || [];
  const normalized = ads.map((ad) => normalizeAd(ad, country));

  const nextToken =
    data.next_page_token ||
    data.serpapi_pagination?.next_page_token ||
    undefined;

  return { ads: normalized, nextPageToken: nextToken };
}

// Legacy: fetch all pages at once (limited by MAX_PAGINATION for keyword search within timeout)
export async function getAdsByPageId(
  pageId: string,
  options?: { mediaType?: string; country?: string }
): Promise<NormalizedAd[]> {
  const allAds: NormalizedAd[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGINATION; page++) {
    const result = await getAdsByPageIdPaged(pageId, {
      ...options,
      nextPageToken,
    });
    allAds.push(...result.ads);
    nextPageToken = result.nextPageToken;
    if (!nextPageToken) break;
    if (page < MAX_PAGINATION - 1) await delay(INTER_CALL_DELAY);
  }

  return allAds;
}

export interface SearchAndCollectResult {
  pageName: string;
  pageId: string;
  ads: NormalizedAd[];
  method: "page_search";
}

export interface CollectDebugInfo {
  pagesFound: number;
  pageNames: string[];
  adsPerPage: Record<string, number>;
  rawFirstPage?: Record<string, unknown>;
  rawFirstAd?: Record<string, unknown>;
  rawFirstSnapshot?: Record<string, unknown>;
  rawFirstCard?: Record<string, unknown>;
}

export async function searchAndCollect(
  keyword: string,
  country: string = "KR"
): Promise<{ results: SearchAndCollectResult[]; debug: CollectDebugInfo }> {
  const results: SearchAndCollectResult[] = [];
  const debug: CollectDebugInfo = {
    pagesFound: 0,
    pageNames: [],
    adsPerPage: {},
  };

  const pages = await searchPages(keyword, country);
  debug.pagesFound = pages.length;
  debug.pageNames = pages.slice(0, 5).map((p) => `${getPageName(p)} (${getPageId(p)})`);

  // Capture raw first page result for debugging field names
  if (pages.length > 0) {
    debug.rawFirstPage = { ...pages[0] } as Record<string, unknown>;
  }

  if (pages.length > 0) {
    // Process top 1 page to stay within Vercel Hobby 10s timeout
    const topPage = pages[0];
    const pageName = getPageName(topPage);
    const pageId = getPageId(topPage);

    if (pageId) {
      await delay(INTER_CALL_DELAY);
      const ads = await getAdsByPageId(pageId, { country });
      debug.adsPerPage[pageName] = ads.length;

      // Capture raw first ad for debugging
      // We need the raw ad, not the normalized one - fetch again from the API response
      // Actually, we can capture during normalization. For now, just report the count.

      if (ads.length > 0) {
        results.push({
          pageName,
          pageId,
          ads,
          method: "page_search",
        });
      }
    }
  }

  return { results, debug };
}
