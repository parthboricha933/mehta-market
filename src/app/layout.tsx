import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mehta Super Market, Rajula | Fresh Groceries Delivered to Your Doorstep",
  description: "Order fresh groceries, fruits, vegetables, dairy, snacks & household items from Mehta Super Market, Rajula. Free home delivery on orders above ₹500. Order online or via WhatsApp.",
  keywords: [
    "Mehta Super Market", "Rajula grocery", "Rajula supermarket", "online grocery Rajula",
    "home delivery Rajula", "fresh fruits Rajula", "vegetables Rajula", "dairy Rajula",
    "Amreli grocery delivery", "Gujarat online supermarket"
  ],
  authors: [{ name: "Mehta Super Market" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mehta Super Market",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "Mehta Super Market, Rajula",
    description: "Fresh Groceries Delivered to Your Doorstep in Rajula. Free home delivery on orders above ₹500.",
    siteName: "Mehta Super Market",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mehta Super Market, Rajula",
    description: "Fresh Groceries Delivered to Your Doorstep in Rajula.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a7a3c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mehta Super Market" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
