import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIVIS-Q Abdomen CT",
  description: "성인 및 소아 복부 CT 고형장기 자동화 분할 소프트웨어",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

