import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import BackgroundCanvas from "@/components/BackgroundCanvas";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MM8 | The Gatekeepers Lose Today // Agentic AI Talent Platform",
  description: "The decentralized agentic layer for cinema. MM8 bypasses traditional gatekeepers in Mollywood using AI-driven matching and raw talent discovery. Talent is broken. Networks are rigged. Enter MM8.",
  keywords: ["MM8", "Mollywood", "AI Talent", "Cinema Platform", "Decentralized Casting", "Malayalam Film Industry", "Agentic AI", "Kochi Film", "Future of Cinema", "Talent Discovery", "Actor Casting", "Director Network"],
  authors: [{ name: "MM8 Team Vanguard" }],
  openGraph: {
    title: "MM8 | The Gatekeepers Lose Today",
    description: "The decentralized agentic layer for cinema. AI-driven talent discovery for Mollywood.",
    url: "https://mm8official.tech",
    siteName: "MM8",
    images: [
      {
        url: "/MM8 Logo BBG.png",
        width: 1200,
        height: 630,
        alt: "MM8 Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MM8 | The Gatekeepers Lose Today",
    description: "The decentralized agentic layer for cinema. AI-driven talent discovery.",
    images: ["/MM8 Logo BBG.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-black text-white selection:bg-brand-red selection:text-white">
        <BackgroundCanvas />
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
