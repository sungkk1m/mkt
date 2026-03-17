// SearchAPI.io Meta Ad Library response types

export interface SearchApiPageResult {
  page_id: string;
  page_name: string;
  page_category?: string;
  likes?: number;
  page_profile_picture_url?: string;
}

export interface SearchApiAdSnapshot {
  body_text?: string;
  title?: string;
  description?: string;
  link_url?: string;
  images?: Array<{
    original_image_url?: string;
    resized_image_url?: string;
  }>;
  videos?: Array<{
    video_url?: string;
    video_hd_url?: string;
    video_sd_url?: string;
    video_preview_image_url?: string;
  }>;
  cards?: Array<{
    body?: string;
    title?: string;
    link_url?: string;
    image_url?: string;
  }>;
}

export interface SearchApiAd {
  ad_id?: string;
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
  images?: Array<{ original_image_url?: string }>;
  videos?: Array<{ video_url?: string; video_hd_url?: string }>;
}

export interface SearchApiPageSearchResponse {
  page_results?: SearchApiPageResult[];
  search_metadata?: {
    status?: string;
  };
}

export interface SearchApiAdSearchResponse {
  ad_results?: SearchApiAd[];
  ads?: SearchApiAd[];
  next_page_token?: string;
  serpapi_pagination?: {
    next_page_token?: string;
  };
  search_metadata?: {
    status?: string;
  };
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
