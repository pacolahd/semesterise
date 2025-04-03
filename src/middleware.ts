import { NextRequest, NextResponse } from "next/server";

import { betterFetch } from "@better-fetch/fetch";
import { createAuthClient } from "better-auth/client";
import { getSessionCookie } from "better-auth/cookies";

import { Session } from "@/lib/auth/auth";

const client = createAuthClient();

// Define routes that are public or require special handling
const authRoutes = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];
const publicRoutes = [
  ...authRoutes,
  "/api/auth",
  "/_next",
  "/static",
  "/images",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  // Skip middleware for public routes like API, static files, etc.
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // // Use Better Auth client to validate the session
  const { data: session } = await client.getSession({
    fetchOptions: {
      credentials: "include",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  });
  // Get session cookie without API call
  // const session = getSessionCookie(request);

  // Get session from berter-fetch
  // const { data: session } = await betterFetch<Session>(
  //   "/api/auth/get-session",
  //   {
  //     baseURL: request.nextUrl.origin,
  //     headers: {
  //       cookie: request.headers.get("cookie") || "", // Forward the cookies from the request
  //     },
  //   }
  // );

  console.log("\n\nSession check result:", !!session, "Path:", pathname);
  console.log(
    "Session User:",
    `${session?.user?.name} - ${session?.user?.email}\n\n`
  );

  // For auth routes (sign-in, sign-up, etc.)
  if (
    authRoutes.some((route) => pathname === route || pathname.startsWith(route))
  ) {
    // If user is already authenticated, redirect to home
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Otherwise, allow access to auth routes
    return NextResponse.next();
  }

  // For protected routes
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Allow access to protected routes if authenticated
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.png$).*)"],
};
