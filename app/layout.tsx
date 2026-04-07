import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Recursive } from "next/font/google";
import { SerwistProvider } from "./serwist";
import SyncHandler from "./components/SyncHandler";
import { initializeCleanup } from "@/lib/database";

const APP_NAME = "Jotted";
const APP_DEFAULT_TITLE = "Jotted";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION = "One place for everything on your mind. Think it, jot it, keep it.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: "/icons/favicon-light.ico",
      },
      {
        url: "/icons/favicon-dark.ico",
        media: "(prefers-color-scheme: dark)"
      },
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

const recursiveFont = Recursive();

if (typeof window === "undefined") {
    initializeCleanup();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={recursiveFont.className} suppressHydrationWarning>
      {/* CSS changes to the body are done inside globals.css */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SerwistProvider swUrl="/sw.js" /* disable={process.env.NODE_ENV === "development"} */>
            <SyncHandler />
            {children}
          </SerwistProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}