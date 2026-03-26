"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import StatsCards from "@/components/StatsCards";
import FilterBar from "@/components/FilterBar";
import AdCard from "@/components/AdCard";
import type { Ad } from "@/components/AdCard";
import AdDetailModal from "@/components/AdDetailModal";
import Pagination from "@/components/Pagination";
import SkeletonCard from "@/components/SkeletonCard";
import Link from "next/link";

interface StatsData {
  totalAds: number;
  activeAds: number;
  totalAdvertisers: number;
  todayNew: number;
}

interface Advertiser {
  id: number;
  name: string;
  adCount: number;
}

interface Filters {
  search: string;
  advertiser: string;
  mediaType: string;
  country: string;
  sort: string;
}

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const filters: Filters = {
    search: searchParams.get("search") || "",
    advertiser: searchParams.get("advertiser") || "",
    mediaType: searchParams.get("mediaType") || "all",
    country: searchParams.get("country") || "KR",
    sort: searchParams.get("sort") || "newest",
  };
  const page = parseInt(searchParams.get("page") || "1");

  const updateUrl = useCallback(
    (newFilters: Filters, newPage?: number) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set("search", newFilters.search);
      if (newFilters.advertiser)
        params.set("advertiser", newFilters.advertiser);
      if (newFilters.mediaType !== "all")
        params.set("mediaType", newFilters.mediaType);
      if (newFilters.country !== "KR")
        params.set("country", newFilters.country);
      if (newFilters.sort !== "newest") params.set("sort", newFilters.sort);
      if (newPage && newPage > 1) params.set("page", String(newPage));
      const qs = params.toString();
      router.push(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router]
  );

  // Fetch stats and advertisers on mount
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/advertisers")
      .then((r) => r.json())
      .then((d) => setAdvertisers(d.data || []))
      .catch(() => {});
  }, []);

  // Fetch ads when filters/page change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filters.search) params.set("search", filters.search);
    if (filters.advertiser) params.set("advertiser", filters.advertiser);
    if (filters.mediaType !== "all")
      params.set("mediaType", filters.mediaType);
    if (filters.country !== "ALL") params.set("country", filters.country);
    params.set("sort", filters.sort);

    fetch(`/api/ads?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setAds(d.data || []);
        setTotalPages(d.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [
    page,
    filters.search,
    filters.advertiser,
    filters.mediaType,
    filters.country,
    filters.sort,
  ]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === ads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ads.map((a) => a.id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    setBulkDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adIds: Array.from(selectedIds) }),
      });
      const { data } = await res.json();
      if (!data) return;

      for (const item of data) {
        for (let i = 0; i < item.mediaUrls.length; i++) {
          const url = item.mediaUrls[i];
          const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
          const a = document.createElement("a");
          a.href = proxyUrl;
          const ext = item.mediaType === "video" ? "mp4" : "jpg";
          a.download = `${item.advertiserName}_${item.adId}_${i + 1}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🎮 게임 광고 라이브러리</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                selectMode
                  ? "bg-blue-600 text-white"
                  : "text-[#888] hover:text-white bg-[#1a1a1a]"
              }`}
            >
              {selectMode ? "선택 취소" : "선택 모드"}
            </button>
            <Link
              href="/collect"
              className="text-sm text-[#888] hover:text-white transition-colors"
            >
              수집 관리 →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={(newFilters) => updateUrl(newFilters, 1)}
          advertisers={advertisers}
        />

        {/* Bulk action bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <button
              onClick={selectAll}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {selectedIds.size === ads.length ? "전체 해제" : "전체 선택"}
            </button>
            <span className="text-sm text-[#888]">
              {selectedIds.size}개 선택됨
            </span>
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="ml-auto px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {bulkDownloading ? "다운로드 중..." : `선택 다운로드 (${selectedIds.size})`}
            </button>
          </div>
        )}

        {/* Ad Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20 text-[#666]">
            <p className="text-lg mb-2">광고가 없습니다</p>
            <p className="text-sm">
              수집 관리 페이지에서 광고를 수집하거나 필터를 조정해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="relative">
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(ad.id)}
                    className={`absolute top-3 left-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(ad.id)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-[#555] bg-black/50 hover:border-blue-500"
                    }`}
                  >
                    {selectedIds.has(ad.id) && (
                      <span className="text-xs">&#10003;</span>
                    )}
                  </button>
                )}
                <AdCard
                  ad={ad}
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(ad.id);
                    } else {
                      setSelectedAd(ad);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => updateUrl(filters, p)}
        />
      </main>

      {/* Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-[#888]">
          로딩 중...
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
