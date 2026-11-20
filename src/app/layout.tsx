import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Outfit } from "next/font/google";
import "./globals.css";

const ui = Outfit({ variable: "--font-ui", subsets: ["latin", "latin-ext"] });
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "MOXIE — Got your MOXIE?", template: "%s · MOXIE" },
  description: "Gerçek insanlar, gerçek kıyafetler, aldıkları beden. Sana benzeyen vücutlarda kıyafetin nasıl durduğunu gör.",
  applicationName: "Moxie",
  appleWebApp: { capable: true, title: "MOXIE", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F7F2EB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${ui.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
