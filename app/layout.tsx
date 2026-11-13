import type { Metadata, Viewport } from "next";
import { Host_Grotesk } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const host = Host_Grotesk({ variable: "--font-host", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sayara",
  description: "Lend your parked car at the airport, earn credits, spend them on a car where you land.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Runs before the page paints, so the right theme is there from the first frame:
// the person's saved choice, or else what their device asks for. Kept in step by components/theme.ts.
const THEME_SCRIPT = `try{var t=localStorage.getItem("sayara-theme");document.documentElement.dataset.theme=t==="light"?t:"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The script above sets data-theme before React loads, which React would otherwise report as a mismatch.
    <html lang="en" className={`${host.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
