import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "◼️",
  description: "1:1の映像だけが、padding 0でびっしり並ぶ。",
  openGraph: {
    title: "◼️",
    description: "1:1の映像だけが、padding 0でびっしり並ぶ。",
    images: [
      {
        url: "https://og-api-self.vercel.app/api/og?title=BLACK%20SQUARE&category=Video%20%26%20Media",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>{children}</body>
    </html>
  );
}
