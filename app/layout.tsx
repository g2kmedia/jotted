import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";
import { Recursive } from "next/font/google";

const recursiveFont = Recursive({
  subsets: ["latin-ext"],
  weight: "800",
});

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
          <Toaster position="top-center" richColors/>
        </ThemeProvider>
      </body>
    </html>
  );
}