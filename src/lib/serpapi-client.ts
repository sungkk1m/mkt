import axios, { AxiosError } from "axios";
import type { NormalizedAd } from "@/types/searchapi";

// ── SerpAPI Google Ads Transparency Center Client ──
// Separate from searchapi-client.ts (which uses SearchAPI.io for Meta ads)
// Uses: https://serpapi.com/google-ads-transparency-center-api

const BASE_URL = "https://serpapi.com/search";
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // 2s base for exponential backoff

// ── Types ──

interface SerpApiAdCreative {
  position?: number;
  id?: string;
  advertiser?: {
    name?: string;
    id?: string;
    location?: string;
    verified?: boolean;
  };
  target_domain?: string;
  first_shown?: string;
  last_shown?: string;
  total_days_shown?: number;
  format?: string; // "Text" | "Image" | "Video"
  detail?: string; // URL to ad detail page
  [key: string]: unknown;
}

interface SerpApiResponse {
  ad_creatives?: SerpApiAdCreative[];
  serpapi_pagination?: {
    next_page_token?: string;
    next?: string;
  };
  search_metadata?: {
    status?: string;
    id?: string;
    [key: string]: unknown;
  };
  error?: string;
  [key: string]: unknown;
}

export interface GoogleAdsPagedResult {
  ads: NormalizedAd[];
  nextPageToken?: string;
  advertiserName?: string;
}

// ── Helpers ──

function getApiKey(): string {
  const key = process.env.SERPAPI_API_KEY;
  if (!key || key === "your_key_here") {
    throw new Error(
      "SERPAPI_API_KEY 환경변수가 설정되지 않았습니다. " +
      "Vercel Dashboard → Settings → Environment Variables에서 SERPAPI_API_KEY를 설정하세요. " +
      "키는 https://serpapi.com/dashboard 에서 발급받을 수 있습니다."
    );
  }
  return key;
}

async function requestWithRetry<T>(
  url: string,
  params: Record<string, string>,
  retries = 0
): Promise<T> {
  try {
    const response = await axios.get<T>(url, { params, timeout: 9000 });
    const data = response.data as Record<string, unknown>;

    // Check for API-level errors
    if (data?.error) {
      throw new Error(`SerpAPI 응답 에러: ${data.error}`);
    }

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const apiError = responseData?.error || "";

      if (status === 401) {
        throw new Error("SerpAPI 키가 올바르지 않습니다 (401 Unauthorized). Vercel 환경변수 SERPAPI_API_KEY를 확인하세요.");
      }
      if (status === 429 && retries < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retries);
        await new Promise((r) => setTimeout(r, delay));
        return requestWithRetry<T>(url, params, retries + 1);
      }
      if (status === 429) {
        throw new Error("SerpAPI 요청 한도 초과 (429 Too Many Requests). 잠시 후 다시 시도하세요.");
      }
      if (!error.response) {
        if (retries < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retries);
          await new Promise((r) => setTimeout(r, delay));
          return requestWithRetry<T>(url, params, retries + 1);
        }
        throw new Error(`SerpAPI에 연결할 수 없습니다 (${error.code || "NETWORK_ERROR"})`);
      }
      throw new Error(`SerpAPI 오류 (HTTP ${status}): ${apiError || error.message}`);
    }
    throw error;
  }
}

// ── Normalize SerpAPI ad to NormalizedAd ──

function normalizeGoogleAd(ad: SerpApiAdCreative, region: string): NormalizedAd {
  const format = (ad.format || "").toLowerCase();

  let mediaType: "image" | "video" | "carousel" = "image";
  if (format === "video") {
    mediaType = "video";
  } else if (format === "text") {
    mediaType = "image"; // Text ads don't have media; treat as image for schema compat
  }

  // Google Ads Transparency doesn't provide direct media URLs in the listing.
  // The ad detail page has the actual creative. We store what we have.
  const mediaUrls: string[] = [];

  return {
    externalId: ad.id || `google_${ad.position || Date.now()}`,
    textBody: undefined,
    textTitle: ad.advertiser?.name || undefined,
    textDescription: ad.target_domain || undefined,
    snapshotUrl: ad.detail || undefined,
    mediaType,
    mediaUrls,
    thumbnailUrl: undefined,
    platform: "google",
    country: region || "KR",
    firstSeen: ad.first_shown || undefined,
    isActive: true,
    pageName: ad.advertiser?.name || undefined,
    pageId: ad.advertiser?.id || undefined,
  };
}

// ── Public API ──

/**
 * Fetch one page of Google Ads by advertiser_id or domain.
 * Pass nextPageToken from a previous call to paginate.
 */
export async function getGoogleAdsPaged(
  identifier: string,
  options?: {
    identifierType?: "advertiser_id" | "domain";
    region?: string;
    nextPageToken?: string;
  }
): Promise<GoogleAdsPagedResult> {
  const apiKey = getApiKey();
  const region = options?.region || "anywhere";
  const idType = options?.identifierType || "advertiser_id";

  const params: Record<string, string> = {
    engine: "google_ads_transparency_center",
    api_key: apiKey,
  };

  if (idType === "domain") {
    params.domain = identifier;
  } else {
    params.advertiser_id = identifier;
  }

  if (region !== "anywhere") {
    params.region = region;
  }

  if (options?.nextPageToken) {
    params.next_page_token = options.nextPageToken;
  }

  const data = await requestWithRetry<SerpApiResponse>(BASE_URL, params);

  const adCreatives = data.ad_creatives || [];
  const normalized = adCreatives.map((ad) => normalizeGoogleAd(ad, region));

  const nextToken =
    data.serpapi_pagination?.next_page_token || undefined;

  // Extract advertiser name from first ad if available
  const advertiserName = adCreatives[0]?.advertiser?.name || undefined;

  return {
    ads: normalized,
    nextPageToken: nextToken,
    advertiserName,
  };
}
