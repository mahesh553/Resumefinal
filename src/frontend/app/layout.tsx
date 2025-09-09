import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  title: "QoderResume - AI-Powered Resume Optimization",
  description:
    "Transform your resume with AI-powered optimization, ATS scoring, and job matching.",
  keywords: ["resume", "AI", "ATS", "job search", "career"],
  authors: [{ name: "QoderResume Team" }],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "QoderResume - AI-Powered Resume Optimization",
    description:
      "Transform your resume with AI-powered optimization, ATS scoring, and job matching.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen">
        <ErrorBoundary>
          <Providers>
            {children}
            <ToastProvider />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
