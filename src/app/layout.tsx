import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
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
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#FFFCFC] text-[#33272C] font-sans"
      >
        {children}
      </body>
    </html>
  );
}
