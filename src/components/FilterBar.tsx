"use client";

import { useEffect, useRef, useState } from "react";
import { MEDIA_TYPES, COUNTRIES } from "@/lib/constants";

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

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  advertisers: Advertiser[];
}

export default function FilterBar({
  filters,
  onFilterChange,
  advertisers,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: value });
    }, 300);
  };

  const update = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] mb-6">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="광고 텍스트 검색..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Advertiser */}
        <select
          value={filters.advertiser}
          onChange={(e) => update("advertiser", e.target.value)}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">전체 광고주</option>
          {advertisers.map((adv) => (
            <option key={adv.id} value={adv.name}>
              {adv.name} ({adv.adCount})
            </option>
          ))}
        </select>

        {/* Media Type */}
        <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
          {MEDIA_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => update("mediaType", type.value)}
              className={`px-3 py-2 text-sm transition-colors ${
                filters.mediaType === type.value
                  ? "bg-blue-600 text-white"
                  : "bg-[#0f0f0f] text-[#888] hover:text-white"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Country */}
        <select
          value={filters.country}
          onChange={(e) => update("country", e.target.value)}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>
    </div>
  );
}
