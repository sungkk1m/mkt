"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const delta = 2;
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 rounded-lg text-sm bg-[#1a1a1a] border border-[#2a2a2a] disabled:opacity-30 hover:bg-[#222] transition-colors"
      >
        ◀
      </button>

      {getPages().map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-[#666]">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              currentPage === page
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#222]"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 rounded-lg text-sm bg-[#1a1a1a] border border-[#2a2a2a] disabled:opacity-30 hover:bg-[#222] transition-colors"
      >
        ▶
      </button>
    </div>
  );
}
