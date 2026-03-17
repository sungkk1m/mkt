"use client";

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

export default function AdCard({ ad, onClick }: AdCardProps) {
  const badge = mediaTypeBadge[ad.mediaType || "image"] || mediaTypeBadge.image;
  const text = ad.textBody || ad.textTitle || ad.textDescription || "";

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[#3a3a3a] hover:shadow-lg hover:shadow-black/20"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#111] overflow-hidden">
        {ad.thumbnailUrl ? (
          <img
            src={ad.thumbnailUrl}
            alt="ad thumbnail"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#555] text-sm">
            No Image
          </div>
        )}
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
