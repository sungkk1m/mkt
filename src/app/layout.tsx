import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "게임 광고 라이브러리",
  description: "경쟁사 게임 광고 크리에이티브 수집 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-[#0f0f0f] text-[#ededed]">
        {children}
      </body>
    </html>
  );
}
