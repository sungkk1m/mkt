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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🎮 게임 광고 라이브러리</h1>
          <Link
            href="/collect"
            className="text-sm text-[#888] hover:text-white transition-colors"
          >
            수집 관리 →
          </Link>
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
              <AdCard
                key={ad.id}
                ad={ad}
                onClick={() => setSelectedAd(ad)}
              />
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
