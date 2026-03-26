import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const advertisers = sqliteTable("advertisers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pageId: text("page_id"),
  genre: text("genre"),
  country: text("country").default("KR"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const adCreatives = sqliteTable(
  "ad_creatives",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    advertiserId: integer("advertiser_id").references(() => advertisers.id),
    source: text("source").notNull().default("meta"),
    externalId: text("external_id"),
    textBody: text("text_body"),
    textTitle: text("text_title"),
    textDescription: text("text_description"),
    snapshotUrl: text("snapshot_url"),
    mediaType: text("media_type"), // "image" | "video" | "carousel"
    mediaUrls: text("media_urls"), // JSON stringified array
    thumbnailUrl: text("thumbnail_url"),
    platform: text("platform"), // "facebook" | "instagram" etc.
    country: text("country"),
    firstSeen: text("first_seen"),
    lastSeen: text("last_seen"),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("source_external_id_idx").on(table.source, table.externalId),
  ]
);

// ── Stage 2: AI Insights (광고 분석 & Winning Creative 요소 추출) ──
export const adInsights = sqliteTable("ad_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adCreativeId: integer("ad_creative_id")
    .notNull()
    .references(() => adCreatives.id),
  // AI-generated analysis
  summary: text("summary"), // 광고 요약
  winningElements: text("winning_elements"), // JSON: winning creative 요소 목록
  targetAudience: text("target_audience"), // 타겟 오디언스 분석
  emotionalAppeal: text("emotional_appeal"), // 감정적 어필 요소
  ctaAnalysis: text("cta_analysis"), // CTA 분석
  visualStyle: text("visual_style"), // 비주얼 스타일 (color palette, layout 등)
  copyTone: text("copy_tone"), // 카피 톤 분석
  tags: text("tags"), // JSON: AI-generated tags
  score: integer("score"), // 0-100 AI 품질 점수
  // Metadata
  aiModel: text("ai_model"), // 사용된 AI 모델명
  analysisVersion: text("analysis_version"), // 분석 버전
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ── Stage 3: Creative Generation (AI 크리에이티브 제작) ──
export const generatedCreatives = sqliteTable("generated_creatives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Source references
  sourceAdId: integer("source_ad_id").references(() => adCreatives.id), // 참고한 원본 광고
  sourceInsightId: integer("source_insight_id").references(() => adInsights.id), // 참고한 인사이트
  // Generation config
  prompt: text("prompt"), // 생성에 사용된 프롬프트
  creativeType: text("creative_type"), // "banner" | "video" | "copy"
  format: text("format"), // "1200x628" | "1080x1080" | "9:16" 등
  // Generated output
  outputUrl: text("output_url"), // 생성된 크리에이티브 파일 URL
  outputThumbnailUrl: text("output_thumbnail_url"),
  generatedCopy: text("generated_copy"), // AI 생성 카피
  generatedCta: text("generated_cta"), // AI 생성 CTA
  // Metadata
  aiModel: text("ai_model"),
  status: text("status").default("pending"), // "pending" | "generating" | "completed" | "failed"
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ── Collection Logs ──
export const collectionLogs = sqliteTable("collection_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source"),
  searchTerm: text("search_term"),
  adsFound: integer("ads_found").default(0),
  adsNew: integer("ads_new").default(0),
  status: text("status"), // "success" | "error"
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
