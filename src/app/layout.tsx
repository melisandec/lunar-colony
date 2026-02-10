import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FarcasterProvider } from "@/components/farcaster-provider";
import { MobileProvider } from "@/components/mobile";
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

const miniAppEmbed = {
  version: "1",
  imageUrl: `${appUrl}/api/frames/image`,
  button: {
    title: "🚀 Play Now",
    action: {
      type: "launch_miniapp",
      name: "Lunar Colony Tycoon",
      url: `${appUrl}/dashboard`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#0a0a1a",
    },
  },
};

/** Viewport config — optimises for mobile Warpcast viewing */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a1a",
};

export const metadata: Metadata = {
  title: "Lunar Colony Tycoon",
  description:
    "Build your lunar industrial empire and earn $LUNAR tokens on Farcaster!",
  openGraph: {
    title: "Lunar Colony Tycoon",
    description: "Build your lunar industrial empire on Farcaster",
    images: [`${appUrl}/api/frames/image`],
  },
  other: {
    // Farcaster Mini App meta tag (current standard)
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    // Backward compatibility for legacy clients
    "fc:frame": JSON.stringify(miniAppEmbed),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FarcasterProvider>
          <MobileProvider>{children}</MobileProvider>
        </FarcasterProvider>
      </body>
    </html>
  );
}
