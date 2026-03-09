import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/web/NavBar";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Portfolio to showcase my skills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-mono">
      <body className="min-h-dvh flex md:flex-col flex-col ">
        <TooltipProvider>
          <NavBar />
          <main className="flex-1 flex flex-col">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
