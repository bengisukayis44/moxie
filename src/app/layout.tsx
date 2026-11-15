import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin", "latin-ext"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Moxie — Kombini gör. Bedenini bil.", template: "%s · Moxie" },
  description: "Gerçek insanlar, gerçek kıyafetler, aldıkları beden. Sana benzeyen vücutlarda kıyafetin nasıl durduğunu gör.",
  applicationName: "Moxie",
  appleWebApp: { capable: true, title: "Moxie", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F9F4F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${dmSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
