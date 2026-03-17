"use client";

interface StatsData {
  totalAds: number;
  activeAds: number;
  totalAdvertisers: number;
  todayNew: number;
}

export default function StatsCards({ stats }: { stats: StatsData | null }) {
  const cards = [
    { label: "총 광고 수", value: stats?.totalAds ?? 0, color: "text-blue-400" },
    { label: "활성 광고", value: stats?.activeAds ?? 0, color: "text-green-400" },
    { label: "광고주 수", value: stats?.totalAdvertisers ?? 0, color: "text-purple-400" },
    { label: "오늘 신규", value: stats?.todayNew ?? 0, color: "text-yellow-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
        >
          <p className="text-sm text-[#888]">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>
            {card.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
