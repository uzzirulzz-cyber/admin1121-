import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayBeat — Premium Beats Marketplace",
  description:
    "Buy exclusive and lease licenses for high-quality beats. Trap, drill, R&B, boom bap and more — instant checkout with secure license delivery.",
  keywords: ["beats", "beat store", "instrumentals", "music licensing", "PlayBeat"],
  openGraph: {
    title: "PlayBeat — Premium Beats Marketplace",
    description: "Buy exclusive and lease licenses for high-quality beats.",
    siteName: "PlayBeat",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
