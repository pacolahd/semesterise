import type { Metadata } from "next";
import React, { ReactNode } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { Providers } from "@/components/providers/providers";
import { satoshi } from "@/lib/fonts";
import { useRealtimeNotifications } from "@/lib/petition-system/use-realtime-notifications";

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
        {/* Providers are used to wrap the application with necessary context providers */}
        {/* This includes theming, query client, etc. */}
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
