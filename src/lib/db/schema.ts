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
