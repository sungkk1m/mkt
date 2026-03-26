"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DEFAULT_SEARCH_TERMS, DEFAULT_GAME_TERMS } from "@/lib/constants";

interface CollectResult {
  keyword: string;
  total?: number;
  new?: number;
  updated?: number;
  methods?: string[];
  pages?: string[];
  error?: string;
  debug?: {
    pagesFound: number;
    pageNames: string[];
    adsPerPage: Record<string, number>;
  };
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
  const [apiKey, setApiKey] = useState("");

  const [collectMode, setCollectMode] = useState<"keyword" | "page">("keyword");
  const [keywords, setKeywords] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [pageNameInput, setPageNameInput] = useState("");
  const [country, setCountry] = useState("KR");
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<CollectResult[]>([]);
  const abortRef = useRef(false);

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
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        setAuthenticated(true);
      } else if (data.success) {
        setAuthError("서버에서 API 키를 받지 못했습니다. 환경변수를 확인하세요.");
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

  const collectSingleKeyword = async (
    keyword: string,
    cleanSeed: boolean = false
  ): Promise<CollectResult> => {
    try {
      const res = await fetch("/api/ads/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ keyword, country, cleanSeed }),
      });
      const data = await res.json();

      if (data.error) {
        return { keyword, error: data.error };
      }

      return {
        keyword,
        total: data.total || 0,
        new: data.new || 0,
        updated: data.updated || 0,
        methods: data.methods || [],
        pages: data.pages || [],
        debug: data.debug,
      };
    } catch {
      return { keyword, error: "네트워크 오류" };
    }
  };

  // Extract page ID from various Facebook URL formats
  const extractPageId = (input: string): string => {
    const trimmed = input.trim();
    // Already a numeric ID
    if (/^\d+$/.test(trimmed)) return trimmed;
    // Facebook URL patterns: /pages/PageName/123456 or /PageName or fb.com/123456
    const pageIdMatch = trimmed.match(/facebook\.com\/(?:pages\/[^/]+\/)?(\d+)/);
    if (pageIdMatch) return pageIdMatch[1];
    // Just return as-is (could be a page name for search)
    return trimmed;
  };

  // Fetch one page of ads, returns nextPageToken for continuation
  const collectSinglePage = async (
    pageId: string,
    pageName: string,
    nextPageToken?: string,
  ): Promise<CollectResult & { nextPageToken?: string }> => {
    try {
      const res = await fetch("/api/ads/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ pageId, pageName, country, nextPageToken }),
      });
      const data = await res.json();
      if (data.error) {
        return { keyword: pageName || pageId, error: data.error };
      }
      return {
        keyword: pageName || pageId,
        total: data.total || 0,
        new: data.new || 0,
        updated: data.updated || 0,
        methods: data.methods || [],
        pages: data.pages || [],
        nextPageToken: data.nextPageToken,
      };
    } catch {
      return { keyword: pageName || pageId, error: "네트워크 오류" };
    }
  };

  const handleCollectByPage = async () => {
    const pageId = extractPageId(pageInput);
    if (!pageId) {
      alert("페이지 ID 또는 URL을 입력해주세요");
      return;
    }

    setCollecting(true);
    setResults([]);
    abortRef.current = false;

    const name = pageNameInput || pageId;
    let nextToken: string | undefined;
    let pageNum = 0;
    let grandTotal = 0;
    let grandNew = 0;
    let grandUpdated = 0;

    // Client-driven pagination: keep calling until no more pages
    do {
      if (abortRef.current) {
        setProgress(`중단됨 (${pageNum}페이지까지 수집)`);
        break;
      }

      pageNum++;
      setProgress(`"${name}" 페이지 ${pageNum}번째 배치 수집 중... (누적: ${grandTotal}개 발견, ${grandNew}개 신규)`);

      const result = await collectSinglePage(pageId, name, nextToken);
      setResults((prev) => [...prev, { ...result, keyword: `${name} (배치 ${pageNum})` }]);

      if (result.error) {
        setProgress(`오류: ${result.error} (${pageNum}페이지, 누적 ${grandTotal}개)`);
        break;
      }

      grandTotal += result.total || 0;
      grandNew += result.new || 0;
      grandUpdated += result.updated || 0;
      nextToken = result.nextPageToken;

      // Small delay between pages
      if (nextToken) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } while (nextToken);

    if (!abortRef.current) {
      setProgress(
        `완료! 총 ${grandTotal}개 수집 (${grandNew}개 신규, ${grandUpdated}개 업데이트, ${pageNum}배치)`
      );
    }
    setCollecting(false);
    loadData();
  };

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
    abortRef.current = false;

    let totalFound = 0;
    let totalNew = 0;

    for (let i = 0; i < terms.length; i++) {
      if (abortRef.current) {
        setProgress(`중단됨 (${i}/${terms.length})`);
        break;
      }

      const keyword = terms[i];
      setProgress(`[${i + 1}/${terms.length}] "${keyword}" 수집 중...`);

      // Clean seed data on first keyword only
      const result = await collectSingleKeyword(keyword, i === 0);

      setResults((prev) => [...prev, result]);

      if (!result.error) {
        totalFound += result.total || 0;
        totalNew += result.new || 0;
      }
    }

    setProgress(
      `완료! 총 ${totalFound}개 발견, ${totalNew}개 신규 (${terms.length}개 키워드)`
    );
    setCollecting(false);
    loadData();
  };

  const handleStop = () => {
    abortRef.current = true;
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

          {/* Mode Tabs */}
          <div className="flex gap-1 mb-4 bg-[#0f0f0f] rounded-lg p-1 w-fit">
            <button
              onClick={() => setCollectMode("keyword")}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                collectMode === "keyword"
                  ? "bg-blue-600 text-white"
                  : "text-[#888] hover:text-white"
              }`}
            >
              키워드 검색
            </button>
            <button
              onClick={() => setCollectMode("page")}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                collectMode === "page"
                  ? "bg-blue-600 text-white"
                  : "text-[#888] hover:text-white"
              }`}
            >
              페이지 직접 수집
            </button>
          </div>

          {collectMode === "keyword" ? (
            <>
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
                    검색어 {keywordCount}개 (1개씩 순차 수집)
                  </span>
                )}
              </div>

              {/* Collect / Stop buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCollect}
                  disabled={collecting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {collecting ? "수집 중..." : "수집 시작"}
                </button>
                {collecting && (
                  <button
                    onClick={handleStop}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    중단
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Page ID direct input */}
              <div className="space-y-3 mb-4">
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="페이스북 페이지 ID 또는 URL (예: 123456789 또는 https://facebook.com/pages/GameName/123456789)"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  value={pageNameInput}
                  onChange={(e) => setPageNameInput(e.target.value)}
                  placeholder="페이지 이름 (선택, 예: Supercell)"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="KR">한국 (KR)</option>
                  <option value="JP">일본 (JP)</option>
                  <option value="US">미국 (US)</option>
                </select>
              </div>

              <button
                onClick={handleCollectByPage}
                disabled={collecting || !pageInput.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {collecting ? "수집 중..." : "페이지 수집"}
              </button>
            </>
          )}

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
                    <span className={r.total ? "text-green-400" : "text-yellow-400"}>
                      {r.keyword}: {r.total}개 수집 ({r.new}개 신규{r.updated ? `, ${r.updated}개 업데이트` : ""})
                      {r.debug && (
                        <span className="text-[#888] ml-2">
                          (페이지 {r.debug.pagesFound}개 발견
                          {r.debug.pageNames.length > 0 && `: ${r.debug.pageNames[0]}`})
                        </span>
                      )}
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
                              : log.status === "no_results"
                                ? "bg-yellow-900/50 text-yellow-400"
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
