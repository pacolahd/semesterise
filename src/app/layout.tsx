import type { Metadata } from "next";
import React, { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { satoshi } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://semesterise.pacolahd.com/"),
  title: "Semesterise | Ashesi Academic Management",
  description:
    "An integrated platform for degree auditing, petition processing, and learning analytics at Ashesi University",
  keywords: [
    "academic management",
    "degree audit",
    "petition processing",
    "learning analytics",
    "higher education",
    "Ashesi University",
  ],
  authors: [{ name: "Ryan Tangu Mbun Tangwe" }],
  creator: "Ryan Tangu Mbun Tangwe",
  openGraph: {
    title: "Semesterise | Ashesi Academic Management",
    description:
      "An integrated platform for degree auditing, petition processing, and learning analytics at Ashesi University",
    images: ["/images/future-image.png"],
  },
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${satoshi.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster closeButton richColors />
      </body>
    </html>
  );
};

export default RootLayout;
