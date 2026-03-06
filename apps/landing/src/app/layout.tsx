import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d4922a",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://paystream.dev"),
  title: {
    default: "PayStream — Bitcoin-Native Micropayments for the AI Economy",
    template: "%s | PayStream",
  },
  description:
    "x402-powered payment protocol for AI agents and humans. Pay for APIs, content, and compute with sBTC and USDCx on Stacks. One-line integration.",
  keywords: [
    "x402 protocol",
    "micropayments",
    "Bitcoin payments",
    "sBTC",
    "USDCx",
    "Stacks blockchain",
    "AI agent payments",
    "streaming payments",
    "HTTP 402",
    "Clarity smart contracts",
    "DeFi",
    "developer SDK",
    "API monetization",
  ],
  authors: [{ name: "PayStream Team" }],
  creator: "PayStream",
  publisher: "PayStream",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PayStream — Bitcoin-Native Micropayments",
    description:
      "Pay for anything with Bitcoin. x402 + sBTC + USDCx streaming micropayments on Stacks.",
    type: "website",
    locale: "en_US",
    siteName: "PayStream",
    url: "https://paystream.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayStream — Bitcoin-Native Micropayments",
    description:
      "Pay for anything with Bitcoin. x402 + sBTC + USDCx streaming micropayments on Stacks.",
    creator: "@paystream_dev",
  },
  alternates: { canonical: "https://paystream.dev" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PayStream",
  applicationCategory: "DeveloperApplication",
  description:
    "Bitcoin-native micropayment protocol for AI agents and humans using x402, sBTC and USDCx on Stacks.",
  operatingSystem: "Cross-platform",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: {
    "@type": "Organization",
    name: "PayStream",
    url: "https://paystream.dev",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
