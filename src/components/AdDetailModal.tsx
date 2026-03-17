"use client";

import { useEffect, useCallback } from "react";
import type { Ad } from "./AdCard";

interface AdDetailModalProps {
  ad: Ad;
  onClose: () => void;
}

export default function AdDetailModal({ ad, onClose }: AdDetailModalProps) {
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
  const text = [ad.textTitle, ad.textBody, ad.textDescription]
    .filter(Boolean)
    .join("\n\n");

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert("텍스트가 복사되었습니다!");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("텍스트가 복사되었습니다!");
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

            {/* Additional images for carousel */}
            {ad.mediaType === "carousel" && mediaUrls.length > 1 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {mediaUrls.slice(1, 4).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`carousel ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
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

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
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
