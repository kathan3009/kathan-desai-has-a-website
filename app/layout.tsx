import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
// Archivo Black only dresses the web-slinger mode, and Newsreader is the
// reader's serif.
import '@fontsource/archivo-black/latin-400.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-500.css';
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KonamiTerminal from "@/components/KonamiTerminal";
import SpideyProvider from "@/components/spidey/SpideyProvider";
import SpideyLayers from "@/components/spidey/SpideyLayers";
import GestureProvider from "@/components/gestures/GestureProvider";
import GestureGuide from "@/components/gestures/GestureGuide";
import { PersonSchema } from "@/components/schema/Person";
import { OrganizationSchema } from "@/components/schema/Organization";
import { WebSiteSchema } from "@/components/schema/WebSite";
import { AUTHOR, FEED_ALTERNATE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

// Bricolage Grotesque sets every word on the site, from captions to the title
// card; its optical size and width axes do the work of a second family.
// Martian Mono only draws the characters in the ASCII scenes.
const bricolage = localFont({
  src: "../assets/fonts/bricolage-grotesque-latin-standard-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
});
const martian = localFont({
  src: "../assets/fonts/martian-mono-latin-standard-normal.woff2",
  variable: "--font-martian",
  weight: "100 800",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 112.5%" }],
});

// Restores the mode before first paint so there is no flash of the default theme.
const SPIDEY_INIT = `try{if(localStorage.getItem("web-slinger-mode")==="on"){document.documentElement.dataset.theme="spidey"}}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "Kathan Desai | %s",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "technology",
  alternates: {
    types: FEED_ALTERNATE,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    creator: AUTHOR.handle,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

// The page paints edge to edge and the browser chrome matches the page in each
// appearance. Zoom is never disabled; inputs are 16px so Safari never needs it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1320" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${martian.variable}`}
      suppressHydrationWarning
    >
        <head>
          <script dangerouslySetInnerHTML={{ __html: SPIDEY_INIT }} />
          <link rel="preconnect" href="https://pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" />
          <link rel="dns-prefetch" href="https://pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" />
          <link rel="preconnect" href="https://img.youtube.com" />
          <link rel="dns-prefetch" href="https://img.youtube.com" />
          <WebSiteSchema />
          <PersonSchema />
          <OrganizationSchema />
        </head>
        <body className="antialiased min-h-screen flex flex-col">
          <SpideyProvider>
            <GestureProvider>
              <SpideyLayers />
              <a href="#main-content" className="skip-link">Skip to content</a>
              <Header />
              <main id="main-content" className="flex-1 min-h-0" tabIndex={-1} data-gesture-scope>{children}</main>
              <Footer />
              <KonamiTerminal />
              <GestureGuide />
            </GestureProvider>
          </SpideyProvider>
        </body>
    </html>
  );
}
