import type { Metadata } from "next";
import '@fontsource/manrope/latin-400.css';
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-500.css';
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KonamiTerminal from "@/components/KonamiTerminal";
import SpideyProvider from "@/components/spidey/SpideyProvider";
import SpideyLayers from "@/components/spidey/SpideyLayers";
import { PersonSchema } from "@/components/schema/Person";
import { OrganizationSchema } from "@/components/schema/Organization";

// Restores the mode before first paint so there is no flash of the beige theme.
const SPIDEY_INIT = `try{if(localStorage.getItem("web-slinger-mode")==="on"){document.documentElement.dataset.theme="spidey"}}catch(e){}`;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kathandesai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kathan Desai | Founder of BugBase",
    template: "Kathan Desai | %s",
  },
  description:
    "Kathan Desai is a founder of BugBase, now in San Francisco and building AI products for security. Projects, writing, and photographs.",
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
    <html
      lang="en"
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
        <body className="antialiased min-h-screen flex flex-col">
          <SpideyProvider>
            <SpideyLayers />
            <a href="#main-content" className="skip-link">Skip to content</a>
            <Header />
            <main id="main-content" className="flex-1 min-h-0" tabIndex={-1}>{children}</main>
            <Footer />
            <KonamiTerminal />
          </SpideyProvider>
        </body>
    </html>
  );
}
