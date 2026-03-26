"use client";

import { useEffect, useCallback, useState } from "react";
import type { Ad } from "./AdCard";

interface AdDetailModalProps {
  ad: Ad;
  onClose: () => void;
}

export default function AdDetailModal({ ad, onClose }: AdDetailModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const mediaUrls: string[] = ad.mediaUrls
    ? JSON.parse(ad.mediaUrls)
    : [];
  const isVideo = ad.mediaType === "video";
  const isCarousel = ad.mediaType === "carousel";
  const text = [ad.textTitle, ad.textBody, ad.textDescription]
    .filter(Boolean)
    .join("\n\n");

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert("텍스트가 복사되었습니다!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("텍스트가 복사되었습니다!");
    }
  };

  const downloadSingle = async (url: string, index?: number) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
    const a = document.createElement("a");
    a.href = proxyUrl;
    const ext = isVideo ? "mp4" : "jpg";
    const name = ad.advertiserName || "ad";
    const suffix = index !== undefined ? `_${index + 1}` : "";
    a.download = `${name}_${ad.id}${suffix}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = async () => {
    if (mediaUrls.length === 0) return;
    setDownloading(true);
    try {
      for (let i = 0; i < mediaUrls.length; i++) {
        await downloadSingle(mediaUrls[i], i);
        // Small delay between downloads to prevent browser blocking
        if (i < mediaUrls.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 px-6 pb-6">
          {/* Media */}
          <div className="md:w-1/2 flex-shrink-0">
            {isVideo && mediaUrls[0] ? (
              <video
                src={mediaUrls[0]}
                controls
                className="w-full rounded-lg bg-black"
                poster={ad.thumbnailUrl || undefined}
              />
            ) : isCarousel && mediaUrls.length > 0 ? (
              /* Carousel viewer with navigation */
              <div className="relative">
                <img
                  src={mediaUrls[carouselIdx]}
                  alt={`carousel ${carouselIdx + 1}`}
                  className="w-full rounded-lg object-contain bg-black"
                />
                {/* Navigation arrows */}
                {mediaUrls.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIdx((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                    >
                      &#8249;
                    </button>
                    <button
                      onClick={() => setCarouselIdx((prev) => (prev + 1) % mediaUrls.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                    >
                      &#8250;
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {carouselIdx + 1} / {mediaUrls.length}
                    </div>
                  </>
                )}
              </div>
            ) : ad.thumbnailUrl || mediaUrls[0] ? (
              <img
                src={mediaUrls[0] || ad.thumbnailUrl || ""}
                alt="ad media"
                className="w-full rounded-lg object-contain bg-black"
              />
            ) : (
              <div className="w-full aspect-video bg-[#111] rounded-lg flex items-center justify-center text-[#555]">
                미디어 없음
              </div>
            )}

            {/* Carousel thumbnail strip */}
            {isCarousel && mediaUrls.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {mediaUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === carouselIdx ? "border-blue-500" : "border-transparent"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`thumb ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:w-1/2 space-y-4">
            <h2 className="text-xl font-bold">
              {ad.advertiserName || "Unknown"}
            </h2>

            {ad.textTitle && (
              <div>
                <p className="text-xs text-[#888] mb-1">제목</p>
                <p className="text-sm">{ad.textTitle}</p>
              </div>
            )}

            {ad.textBody && (
              <div>
                <p className="text-xs text-[#888] mb-1">본문</p>
                <p className="text-sm whitespace-pre-wrap">{ad.textBody}</p>
              </div>
            )}

            {ad.textDescription && (
              <div>
                <p className="text-xs text-[#888] mb-1">설명</p>
                <p className="text-sm">{ad.textDescription}</p>
              </div>
            )}

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#888]">플랫폼</p>
                <p className="capitalize">{ad.platform || "facebook"}</p>
              </div>
              <div>
                <p className="text-xs text-[#888]">국가</p>
                <p>{ad.country || "KR"}</p>
              </div>
              <div>
                <p className="text-xs text-[#888]">시작일</p>
                <p>{ad.firstSeen || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[#888]">마지막 확인</p>
                <p>{ad.lastSeen || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[#888]">상태</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    ad.isActive
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {ad.isActive ? "활성" : "종료"}
                </span>
              </div>
              <div>
                <p className="text-xs text-[#888]">미디어 타입</p>
                <p className="capitalize">{ad.mediaType || "image"}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* Download single / all */}
              {mediaUrls.length > 0 && (
                <>
                  {mediaUrls.length === 1 ? (
                    <button
                      onClick={() => downloadSingle(mediaUrls[0])}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      다운로드
                    </button>
                  ) : (
                    <button
                      onClick={downloadAll}
                      disabled={downloading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                    >
                      {downloading ? "다운로드 중..." : `전체 다운로드 (${mediaUrls.length})`}
                    </button>
                  )}
                </>
              )}

              {ad.snapshotUrl && (
                <a
                  href={ad.snapshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Meta에서 보기
                </a>
              )}
              {text && (
                <button
                  onClick={copyText}
                  className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg text-sm transition-colors"
                >
                  텍스트 복사
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
