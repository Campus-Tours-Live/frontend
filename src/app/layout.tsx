import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";
import "./globals.css";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
// Import the provider DIRECTLY (not via the barrel): the barrel re-exports the
// client-only query hooks/apiFetch, which a Server Component must not pull in.
import { QueryProvider } from "@/lib/data-access/QueryProvider";

// Brand fonts wired through next/font → exposed as CSS variables that
// globals.css maps to --font-sans / --font-display.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CampusToursLive.ai — Live-guided virtual campus tours",
  description:
    "Explore campus with someone who actually studies there. Book a live tour with a verified student guide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} ${quicksand.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          {children}
          <SessionExpiredModal />
        </QueryProvider>
      </body>
    </html>
  );
}
