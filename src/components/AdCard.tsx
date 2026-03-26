"use client";

import { useState, useCallback } from "react";

interface Ad {
  id: number;
  advertiserName?: string | null;
  textBody?: string | null;
  textTitle?: string | null;
  textDescription?: string | null;
  snapshotUrl?: string | null;
  mediaType?: string | null;
  mediaUrls?: string | null;
  thumbnailUrl?: string | null;
  platform?: string | null;
  country?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  isActive?: number | null;
}

interface AdCardProps {
  ad: Ad;
  onClick: () => void;
}

const mediaTypeBadge: Record<string, { label: string; color: string }> = {
  image: { label: "이미지", color: "bg-blue-600" },
  video: { label: "비디오", color: "bg-red-600" },
  carousel: { label: "캐러셀", color: "bg-green-600" },
};

function parseMediaUrls(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function AdThumbnail({ src, fallbackUrls }: { src?: string | null; fallbackUrls: string[] }) {
  const [failed, setFailed] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const handleError = useCallback(() => {
    // Try next fallback URL from mediaUrls
    if (fallbackIndex < fallbackUrls.length) {
      setFallbackIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  }, [fallbackIndex, fallbackUrls.length]);

  if (failed || (!src && fallbackUrls.length === 0)) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#555] text-sm">
        No Image
      </div>
    );
  }

  // Determine which URL to show: primary src first, then fallbacks
  let currentSrc: string;
  if (!failed && src && fallbackIndex === 0) {
    currentSrc = src;
  } else {
    const idx = src ? fallbackIndex - 1 : fallbackIndex;
    if (idx >= 0 && idx < fallbackUrls.length) {
      currentSrc = fallbackUrls[idx];
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center text-[#555] text-sm">
          No Image
        </div>
      );
    }
  }

  return (
    <img
      src={currentSrc}
      alt="ad thumbnail"
      className="w-full h-full object-cover"
      loading="lazy"
      onError={handleError}
    />
  );
}

export default function AdCard({ ad, onClick }: AdCardProps) {
  const badge = mediaTypeBadge[ad.mediaType || "image"] || mediaTypeBadge.image;
  const text = ad.textBody || ad.textTitle || ad.textDescription || "";
  const fallbackUrls = parseMediaUrls(ad.mediaUrls);

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[#3a3a3a] hover:shadow-lg hover:shadow-black/20"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#111] overflow-hidden">
        <AdThumbnail src={ad.thumbnailUrl} fallbackUrls={fallbackUrls} />
        {/* Media type badge */}
        <span
          className={`absolute top-2 right-2 ${badge.color} text-white text-xs px-2 py-0.5 rounded-full`}
        >
          {badge.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate">
          {ad.advertiserName || "Unknown"}
        </p>
        <p className="text-xs text-[#888] mt-1 line-clamp-2 min-h-[2rem]">
          {text || "텍스트 없음"}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-[#666]">
          <div className="flex items-center gap-2">
            <span className="capitalize">{ad.platform || "facebook"}</span>
            <span>{ad.firstSeen || ""}</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              ad.isActive
                ? "bg-green-900/50 text-green-400"
                : "bg-red-900/50 text-red-400"
            }`}
          >
            {ad.isActive ? "활성" : "종료"}
          </span>
        </div>
      </div>
    </div>
  );
}

export type { Ad };
