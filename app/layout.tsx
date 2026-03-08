import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PersonSchema } from "@/components/schema/Person";
import { OrganizationSchema } from "@/components/schema/Organization";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kathan Desai | Founder of bugbase",
    template: "Kathan Desai | %s",
  },
  description:
    "Kathan Desai is the Founder of bugbase, a platform for bug bounty and security research. Explore my work, projects, and insights.",
  openGraph: {
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <head>
        <PersonSchema />
        <OrganizationSchema />
      </head>
      <body className={`${dmSans.className} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1 min-h-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
