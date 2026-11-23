import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/language-context";
import { WebVitals } from "@/app/web-vitals";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pretty Corner Admin | Beauty & Personal Care Dashboard",
  description:
    "Administrator dashboard for Pretty Corner e-commerce boutique — orders, inventory, products, customers, and sales analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#FAF7F8] text-[#38262E] font-sans"
      >
        <WebVitals />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
