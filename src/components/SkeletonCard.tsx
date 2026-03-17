export default function SkeletonCard() {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden animate-pulse">
      <div className="aspect-video bg-[#222]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[#222] rounded w-1/3" />
        <div className="h-3 bg-[#222] rounded w-full" />
        <div className="h-3 bg-[#222] rounded w-2/3" />
        <div className="flex justify-between mt-3">
          <div className="h-3 bg-[#222] rounded w-1/4" />
          <div className="h-3 bg-[#222] rounded w-1/6" />
        </div>
      </div>
    </div>
  );
}
