import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Recursive } from "next/font/google";

const recursiveFont = Recursive();

export const metadata = {
  title: "Jotted",
  description: "One place for everything on your mind. Think it, jot it, keep it.",
  icons: {
    icon: [
      {
        url: "/favicon-dark.ico"
      },
      {
        url: "/favicon-dark.ico",
        media: "(prefers-color-scheme: light)"
      },
      {
        url: "/favicon-light.ico",
        media: "(prefers-color-scheme: dark)"
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={recursiveFont.className} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}