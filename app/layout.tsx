import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "借用車輛委託書電子簽署系統",
  description: "借用車輛委託書 HTML 電子簽署與 PDF 封存系統",
  icons: {
    icon: ["/favicon.ico", "/favicon.png"],
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className={noto.className}>{children}</body>
    </html>
  );
}
