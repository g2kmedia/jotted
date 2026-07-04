import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Bodoni_Moda, Space_Mono, Space_Grotesk} from "next/font/google";
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

const bodoniModa = Bodoni_Moda({ variable: "--font-hero" });
const spaceMono = Space_Mono({ weight: ["400", "700"], variable: "--font-titles"});
const spaceGrotesk = Space_Grotesk({ variable: "--font-main" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodoniModa.variable} ${spaceMono.variable} ${spaceGrotesk}`} suppressHydrationWarning>
      {/* CSS changes to the body are done inside globals.css */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SerwistProvider swUrl="/sw.js" /* disable={process.env.NODE_ENV === "development"} */ >
            <SyncHandler />
            {children}
          </SerwistProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "bg-background! text-foreground! border! border-muted!",
                success: "[&_svg]:text-[#6E8B5B]!",
                error: "[&_svg]:text-[#A14B3D]!",
                info: "[&_svg]:text-[#7A7167]!",
                warning: "[&_svg]:text-[#B57A2A]!"
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}