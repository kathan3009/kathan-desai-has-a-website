import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Archivo_Black } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KonamiTerminal from "@/components/KonamiTerminal";
import DotGrid from "@/components/DotGrid";
import CursorTrail from "@/components/CursorTrail";
import SpideyProvider from "@/components/spidey/SpideyProvider";
import SpideyLayers from "@/components/spidey/SpideyLayers";
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

// Display face for web-slinger mode only — never render-blocking for the default site.
const archivoBlack = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

// Restores the mode before first paint so there is no flash of the beige theme.
const SPIDEY_INIT = `try{if(localStorage.getItem("web-slinger-mode")==="on"){document.documentElement.dataset.theme="spidey"}}catch(e){}`;

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
    <ViewTransitions>
      <html
        lang="en"
        className={`${geistMono.variable} ${archivoBlack.variable}`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: SPIDEY_INIT }} />
          <link rel="preconnect" href="https://pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" />
          <link rel="dns-prefetch" href="https://pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" />
          <link rel="preconnect" href="https://img.youtube.com" />
          <link rel="dns-prefetch" href="https://img.youtube.com" />
          <PersonSchema />
          <OrganizationSchema />
        </head>
        <body className={`${dmSans.className} antialiased min-h-screen flex flex-col`}>
          <SpideyProvider>
            <DotGrid />
            <CursorTrail />
            <SpideyLayers />
            <Header />
            <main className="flex-1 min-h-0">{children}</main>
            <Footer />
            <KonamiTerminal />
          </SpideyProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
