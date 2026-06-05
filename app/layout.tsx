import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Standard | Cafe - Bar - Social lounge in Beirut",
  description: "Standard: A Mar Mikhael specialty fixture that works as a quiet remote-work haven by day and a relaxed social lounge by night.",
  keywords: [
  "Standard Beirut",
  "Standard Mar Mikhael",
  "cafe bar Beirut",
  "remote work cafe Beirut"
],
  openGraph: {
    title: "Standard | Cafe - Bar - Social lounge in Beirut",
    description: "Standard: A Mar Mikhael specialty fixture that works as a quiet remote-work haven by day and a relaxed social lounge by night.",
    type: "website",
    locale: "en_US"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preload" as="image" href="/sequence/frame_001.webp" />
        <link rel="preload" as="image" href="/sequence/frame_002.webp" />
        <link rel="preload" as="image" href="/sequence/frame_003.webp" />
        <link rel="preload" as="image" href="/sequence/frame_004.webp" />
        <link rel="preload" as="image" href="/sequence/frame_005.webp" />
      </head>
      <body>{children}</body>
    </html>
  );
}
