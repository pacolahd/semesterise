import { NextRequest, NextResponse } from "next/server";

import { getSessionCookie } from "better-auth/cookies";

import { ServerSession, ServerSessionUser } from "@/lib/auth/auth";
import { authClient } from "@/lib/auth/auth-client";

const PUBLIC_ROUTES = ["/about"];
const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];
const ADMIN_ROUTES = ["/admin"];
const STUDENT_ROUTE_PREFIX = "/student";
const STAFF_ROUTE_PREFIX = "/staff";
const ONBOARDING_ROUTE = "/onboarding";

// Session cache with 2-second TTL
const sessionCache = new Map<
  string,
  { session: ServerSession | null; timestamp: number }
>();
const SESSION_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

async function getOptimizedSession(
  request: NextRequest
): Promise<ServerSession | null> {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) return null;

  // Check cache first
  const cached = sessionCache.get(sessionCookie);
  if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
    // console.log(`\n\n\nSession: ${cached.session}\n\n\n`);
    return cached.session;
  }

  try {
    const { data } = await authClient.getSession({
      fetchOptions: {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      },
      query: { disableCookieCache: true },
    });

    // @ts-ignore
    const session: ServerSession | null = data;
    // Update cache
    sessionCache.set(sessionCookie, { session, timestamp: Date.now() });
    // console.log(`\n\n\nSession: ${session}\n\n\n`);
    return session as ServerSession;
  } catch (error) {
    console.error("Session fetch error:", error);
    return null;
  }
}

async function getRawSession(
  request: NextRequest
): Promise<ServerSession | null> {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) return null;

  try {
    const { data } = await authClient.getSession({
      fetchOptions: {
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      },
      // query: { disableCookieCache: true },
    });

    // @ts-ignore
    const session: ServerSession | null = data;
    // Update cache
    sessionCache.set(sessionCookie, { session, timestamp: Date.now() });
    return session as ServerSession;
  } catch (error) {
    console.error("Session fetch error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes - immediate return
  if (isPublicRoute(pathname)) return NextResponse.next();

  // 2. Auth routes - lightweight check
  if (isAuthRoute(pathname)) {
    const hasSession = !!getSessionCookie(request);
    return hasSession ? redirectTo("/", request) : NextResponse.next();
  }

  // 3. Admin routes - validate session once
  if (isAdminRoute(pathname)) {
    const session = await getOptimizedSession(request);
    return handleAdminRoutes(request, session);
  }

  if (pathname.startsWith(ONBOARDING_ROUTE)) {
    let previousPath = null;
    const referer = request.headers.get("referer");
    if (referer) {
      const refererUrl = new URL(referer);
      previousPath = refererUrl.pathname;
    }
    if (previousPath === ONBOARDING_ROUTE) {
      // @ts-ignore
      const session: ServerSession = await getOptimizedSession(request);
      if (!session?.user) return redirectToSignIn(request);
      if (session?.user.onboardingCompleted) {
        return redirectToBasePath(session?.user?.role, request);
      } else {
        return NextResponse.next();
      }
    } else {
      // @ts-ignore
      const latestSession: ServerSession = await getRawSession(request);
      if (!latestSession?.user) return redirectToSignIn(request);
      if (latestSession?.user.onboardingCompleted) {
        return redirectToBasePath(latestSession?.user?.role, request);
      } else {
        return NextResponse.next();
      }
    }
  }

  // 4. All other routes - single session validation
  const session = await getOptimizedSession(request);
  return handleProtectedRoutes(request, session, pathname);
}

// Route handlers
function handleAdminRoutes(
  request: NextRequest,
  session: ServerSession | null
) {
  if (!session?.user) return redirectToSignIn(request);
  if (session.user.role === "student") return redirectToUnauthorized(request);
  return NextResponse.next();
}

function handleProtectedRoutes(
  request: NextRequest,
  cachedSession: ServerSession | null,
  pathname: string,
  rawSession?: ServerSession | null
) {
  if (!cachedSession?.user) return redirectToSignIn(request);

  // Onboarding check
  if (cachedSession.user.onboardingCompleted === false) {
    // Allow access to any onboarding sub-paths
    if (!pathname.startsWith(ONBOARDING_ROUTE)) {
      return redirectTo(ONBOARDING_ROUTE, request);
    }
    return NextResponse.next();
  }

  // Redirect from onboarding paths when completed
  if (pathname === "/") {
    return redirectToBasePath(cachedSession.user.role, request);
  }

  // Role-based routing
  const isStudent = cachedSession.user.role === "student";

  if (pathname.startsWith(STUDENT_ROUTE_PREFIX)) {
    return isStudent
      ? handleStudentPath(pathname, request)
      : redirectToStaff(request);
  }

  if (pathname.startsWith(STAFF_ROUTE_PREFIX) && isStudent) {
    return redirectToStudent(request);
  }

  return NextResponse.next();
}

// Helper functions
const redirectToSignIn = (request: NextRequest) =>
  NextResponse.redirect(new URL("/sign-in", request.url));

const redirectToUnauthorized = (request: NextRequest) =>
  NextResponse.redirect(new URL("/unauthorized", request.url));

const redirectTo = (path: string, request: NextRequest) =>
  NextResponse.redirect(new URL(path, request.url));

function redirectToBasePath(role: string, request: NextRequest) {
  return redirectTo(
    role === "student" ? "/student/degree-audit" : "/staff",
    request
  );
}

function handleStudentPath(pathname: string, request: NextRequest) {
  return pathname === "/student"
    ? redirectTo("/student/degree-audit", request)
    : NextResponse.next();
}

function redirectToStaff(request: NextRequest) {
  return redirectTo("/staff", request);
}

function redirectToStudent(request: NextRequest) {
  return redirectTo("/student/degree-audit", request);
}

// Route checkers
const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

const isAuthRoute = (pathname: string) =>
  AUTH_ROUTES.some((route) => pathname.startsWith(route));

const isAdminRoute = (pathname: string) =>
  ADMIN_ROUTES.some((route) => pathname.startsWith(route));

export const config = {
  matcher: [
    "/((?!api/auth|api/transcript|api/student|api/pusher|_next/static|_next/image|static|images|favicon.ico|.*\\.(?:png|css|js)$).*)",
  ],
};
