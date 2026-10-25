import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.visforthearts.com"),
  title: {
    default: "VIS Contemporary Culture",
    template: "%s | VIS Contemporary Culture",
  },
  description: "Assembly of Culture, Objects and Ideas. 聚焦於美學、生活、工藝與當代文化的匯聚之所。",
  applicationName: "VIS Contemporary Culture",
  authors: [{ name: "VIS Team" }],
  creator: "VIS Contemporary Culture",
  publisher: "VIS Contemporary Culture",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://www.visforthearts.com",
    title: "VIS Contemporary Culture",
    description: "Assembly of Culture, Objects and Ideas. 聚焦於美學、生活、工藝與當代文化的匯聚之所。",
    siteName: "VIS Contemporary Culture",
    images: [
      {
        url: "https://www.visforthearts.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "VIS Contemporary Culture",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VIS Contemporary Culture",
    description: "Assembly of Culture, Objects and Ideas. 聚焦於美學、生活、工藝與當代文化的匯聚之所。",
    images: ["https://www.visforthearts.com/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f5f5f5] selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
