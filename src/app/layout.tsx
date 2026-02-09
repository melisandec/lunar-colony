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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Lunar Colony Tycoon",
  description:
    "Build your lunar industrial empire and earn $LUNAR tokens on Farcaster!",
  openGraph: {
    title: "Lunar Colony Tycoon",
    description: "Build your lunar industrial empire on Farcaster",
    images: [`${appUrl}/api/frames?img=landing`],
  },
  other: {
    // Farcaster Frame meta tags
    "fc:frame": "vNext",
    "fc:frame:image": `${appUrl}/api/frames?img=landing`,
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:post_url": `${appUrl}/api/frames`,
    "fc:frame:button:1": "🚀 Play Now",
    "fc:frame:button:1:action": "post",
    "fc:frame:button:2": "📊 Leaderboard",
    "fc:frame:button:2:action": "post",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
