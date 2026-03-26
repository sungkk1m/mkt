// SearchAPI.io Meta Ad Library response types
// Field names use flexible mapping since the API may return different field names
// depending on the engine version

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SearchApiPageResult {
  // Page search may return name under different keys
  page_id?: string;
  id?: string;
  page_name?: string;
  name?: string;
  page_category?: string;
  category?: string;
  likes?: number;
  page_profile_picture_url?: string;
  profile_picture_url?: string;
  // Allow any other fields
  [key: string]: any;
}

export interface SearchApiAdSnapshot {
  body_text?: string;
  body?: string;
  title?: string;
  description?: string;
  link_url?: string;
  images?: Array<{
    original_image_url?: string;
    resized_image_url?: string;
    url?: string;
    [key: string]: any;
  }>;
  videos?: Array<{
    video_url?: string;
    video_hd_url?: string;
    video_sd_url?: string;
    video_preview_image_url?: string;
    preview_image_url?: string;
    [key: string]: any;
  }>;
  cards?: Array<{
    body?: string;
    title?: string;
    link_url?: string;
    // Card images may be under different keys
    image_url?: string;
    original_image_url?: string;
    resized_image_url?: string;
    image?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface SearchApiAd {
  ad_id?: string;
  ad_archive_id?: string;
  archive_id?: string;
  id?: string;
  page_id?: string;
  page_name?: string;
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  is_active?: boolean;
  publisher_platforms?: string[];
  snapshot?: SearchApiAdSnapshot;
  // Flat fields (some APIs return these at top level)
  body?: string;
  title?: string;
  description?: string;
  images?: Array<{ original_image_url?: string; [key: string]: any }>;
  videos?: Array<{ video_url?: string; video_hd_url?: string; [key: string]: any }>;
  [key: string]: any;
}

export interface SearchApiPageSearchResponse {
  page_results?: SearchApiPageResult[];
  results?: SearchApiPageResult[];
  search_metadata?: {
    status?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SearchApiAdSearchResponse {
  ad_results?: SearchApiAd[];
  ads?: SearchApiAd[];
  results?: SearchApiAd[];
  next_page_token?: string;
  serpapi_pagination?: {
    next_page_token?: string;
  };
  search_metadata?: {
    status?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Normalized types for internal use
export interface NormalizedAd {
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
