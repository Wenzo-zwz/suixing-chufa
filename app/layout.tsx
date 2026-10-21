import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "随性出发 · 下一站，听心的",
  description: "随机抽取旅行目的地，发现美食与风景，一个人或和朋友随性出发。",
  icons: {
    icon: "/web/assets/brand/suixing-chufa-avatar-v3-plane-rider.png",
    shortcut: "/web/assets/brand/suixing-chufa-avatar-v3-plane-rider.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
