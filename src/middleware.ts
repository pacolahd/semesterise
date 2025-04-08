// TODO: Update middleware to work with new authorization and authentication system
import { NextRequest, NextResponse } from "next/server";

import { betterFetch } from "@better-fetch/fetch";
import { getSessionCookie } from "better-auth/cookies";

import { ServerSession } from "@/lib/auth/auth";
import { authClient } from "@/lib/auth/auth-client";

const PUBLIC_ROUTES = ["/about"];
const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];
const ADMIN_ROUTES = ["/admin"];
const STUDENT_ROLE = "student";

async function getFullSession(
  request: NextRequest
): Promise<ServerSession | null> {
  try {
    /*   const { data: session } = await betterFetch<ServerSession>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      }
    ); */

    const { data: session } = await authClient.getSession({
      fetchOptions: {
        credentials: "include",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      },
      query: { disableCookieCache: true },
    });

    return session as ServerSession;
  } catch (error) {
    console.error("Session fetch error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes - no authentication needed
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Auth routes - prevent authenticated access
  if (isAuthRoute(pathname)) {
    return handleAuthRoutes(request);
  }

  // 3. Admin routes - strict role validation
  if (isAdminRoute(pathname)) {
    return handleAdminRoutes(request);
  }

  // 4. All other routes - require valid session
  return handleProtectedRoutes(request);
}

// Helper functions
function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string) {
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

async function handleAuthRoutes(request: NextRequest) {
  if (await hasValidSession(request, { requireFresh: true })) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

async function handleAdminRoutes(request: NextRequest) {
  const session = await getFullSession(request);

  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (session.user.role === STUDENT_ROLE) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

async function handleProtectedRoutes(request: NextRequest) {
  // Without fresh, if cookie exists, the user will be allowed access, even if the user is no longer the database (if the user was somehow deleted directly on the databse while they were still signed in on their end.)
  // Means it will go on if the cookie exists even without an actual user existing in the db. But I actually think that they won't be able to do stuff in the app because a subsequent getSession will not return a user. Hmn let's see how it goes.
  // Well it means they've used the app before and the route they're trying to access is not an admin route, so it should be fine.
  if (await hasValidSession(request, { requireFresh: false })) {
    // TODO: Add functionality to check if the user has completed onboarding and to redirect them to the onboarding page for them to continue if need be.
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

async function hasValidSession(
  request: NextRequest,
  options = { requireFresh: true }
): Promise<boolean> {
  // Quick cookie check first
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) return false;

  // Return early if fresh validation not required
  if (!options.requireFresh) return true;

  // Full session validation
  const session = await getFullSession(request);
  if (session) {
    console.log(
      `\n\n\nMiddleware User Details: ${session?.user?.role} ${
        session?.user?.userType
      } ${session?.user?.onboardingCompleted}\n\n`
    );
  }

  return !!session?.user;
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|static|images|favicon.ico|.*\\.png$).*)",
  ],
};

// export const config = {
//   matcher: ["/((?!api/auth|_next/static|_next/image|.*\\.png$).*)"],
// };
