"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DEFAULT_SEARCH_TERMS, DEFAULT_GAME_TERMS } from "@/lib/constants";

interface CollectResult {
  keyword: string;
  result?: { total: number; new: number; updated: number };
  error?: string;
}

interface LogEntry {
  id: number;
  source: string;
  searchTerm: string;
  adsFound: number;
  adsNew: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface AdvertiserEntry {
  id: number;
  name: string;
  pageId?: string;
  genre?: string;
  country?: string;
  adCount: number;
}

export default function CollectPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("KR");
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<CollectResult[]>([]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [advertisers, setAdvertisers] = useState<AdvertiserEntry[]>([]);

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
      } else {
        setAuthError("비밀번호가 올바르지 않습니다");
      }
    } catch {
      setAuthError("서버 연결에 실패했습니다");
    }
  };

  const loadData = async () => {
    try {
      const [statsRes, advRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/advertisers"),
      ]);
      const statsData = await statsRes.json();
      const advData = await advRes.json();
      setLogs(statsData.recentLogs || []);
      setAdvertisers(advData.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  const handleCollect = async () => {
    const terms = keywords
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (terms.length === 0) {
      alert("검색어를 입력해주세요");
      return;
    }

    setCollecting(true);
    setResults([]);
    setProgress(`수집 시작... (${terms.length}개 검색어)`);

    try {
      const res = await fetch("/api/ads/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "my-secret-key-123",
        },
        body: JSON.stringify({ searchTerms: terms, country }),
      });
      const data = await res.json();

      if (data.error) {
        setProgress(`에러: ${data.error}`);
      } else {
        setResults(data.details || []);
        setProgress(
          `완료! 총 ${data.totalAdsFound}개 발견, ${data.totalNew}개 신규`
        );
        loadData();
      }
    } catch (error) {
      setProgress("수집 중 에러가 발생했습니다");
    } finally {
      setCollecting(false);
    }
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-6 text-center">
            🔐 수집 관리
          </h1>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-blue-500"
          />
          {authError && (
            <p className="text-red-400 text-sm mb-3">{authError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors"
          >
            로그인
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-[#888] mt-4 hover:text-white"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const keywordCount = keywords
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">🔧 수집 관리</h1>
          <Link
            href="/"
            className="text-sm text-[#888] hover:text-white transition-colors"
          >
            ← 대시보드
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Collection Panel */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h2 className="text-lg font-semibold mb-4">수집 실행</h2>

          {/* Quick buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setKeywords(DEFAULT_SEARCH_TERMS.join(", "))}
              className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-sm transition-colors"
            >
              기본 검색어
            </button>
            <button
              onClick={() => setKeywords(DEFAULT_GAME_TERMS.join(", "))}
              className="px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-sm transition-colors"
            >
              인기 게임
            </button>
          </div>

          {/* Input */}
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="검색어를 입력하세요 (쉼표 또는 줄바꿈으로 구분)"
            rows={3}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />

          {/* Country + info */}
          <div className="flex items-center gap-4 mb-4">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm"
            >
              <option value="KR">한국 (KR)</option>
              <option value="JP">일본 (JP)</option>
              <option value="US">미국 (US)</option>
            </select>
            {keywordCount > 0 && (
              <span className="text-sm text-[#888]">
                검색어 {keywordCount}개 → 예상 API 호출 약{" "}
                {keywordCount}~{keywordCount * 3}회
              </span>
            )}
          </div>

          {/* Collect button */}
          <button
            onClick={handleCollect}
            disabled={collecting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {collecting ? "수집 중..." : "수집 시작"}
          </button>

          {/* Progress */}
          {progress && (
            <p className="mt-4 text-sm text-[#ccc]">{progress}</p>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-4 space-y-1">
              {results.map((r, i) => (
                <div key={i} className="text-sm">
                  {r.error ? (
                    <span className="text-red-400">
                      {r.keyword}: {r.error}
                    </span>
                  ) : (
                    <span className="text-green-400">
                      {r.keyword}: {r.result?.total}개 발견, {r.result?.new}개
                      신규
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collection Logs */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h2 className="text-lg font-semibold mb-4">수집 이력</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-[#666]">수집 이력이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#888] border-b border-[#2a2a2a]">
                    <th className="text-left py-2 pr-4">날짜</th>
                    <th className="text-left py-2 pr-4">검색어</th>
                    <th className="text-right py-2 pr-4">발견</th>
                    <th className="text-right py-2 pr-4">신규</th>
                    <th className="text-left py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[#1f1f1f]"
                    >
                      <td className="py-2 pr-4 text-[#888]">
                        {new Date(log.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="py-2 pr-4">{log.searchTerm}</td>
                      <td className="py-2 pr-4 text-right">{log.adsFound}</td>
                      <td className="py-2 pr-4 text-right">{log.adsNew}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            log.status === "success"
                              ? "bg-green-900/50 text-green-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Advertisers */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
          <h2 className="text-lg font-semibold mb-4">광고주 목록</h2>
          {advertisers.length === 0 ? (
            <p className="text-sm text-[#666]">등록된 광고주가 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {advertisers.map((adv) => (
                <div
                  key={adv.id}
                  className="flex items-center justify-between bg-[#0f0f0f] rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{adv.name}</p>
                    {adv.genre && (
                      <p className="text-xs text-[#888]">{adv.genre}</p>
                    )}
                  </div>
                  <span className="text-sm text-[#888]">
                    {adv.adCount}개 광고
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
