import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Space_Mono, Bodoni_Moda } from "next/font/google";
import { SerwistProvider } from "./serwist";
import SyncHandler from "./components/SyncHandler";

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
    icon: "/icons/favicon.svg",
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

const spaceMono = Space_Mono({ weight: ["400", "700"], variable: "--font-heading" });
const BodoniModa = Bodoni_Moda({ variable: "--font-main" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${BodoniModa.variable}`} suppressHydrationWarning>
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