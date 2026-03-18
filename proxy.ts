import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSelectionRoute = createRouteMatcher(["/select-organization(.*)"]);

function buildUrl(request: Request, pathname: string, returnTo?: string) {
  const url = new URL(pathname, request.url);

  if (returnTo) {
    url.searchParams.set("returnTo", returnTo);
  }

  return url;
}

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (isProtectedRoute(request)) {
    if (!session.userId) {
      return session.redirectToSignIn({
        returnBackUrl: request.url,
      });
    }

    if (!session.orgId) {
      return NextResponse.redirect(
        buildUrl(request, "/select-organization", returnTo),
      );
    }
  }

  if (isOrgSelectionRoute(request)) {
    if (!session.userId) {
      return session.redirectToSignIn({
        returnBackUrl: request.url,
      });
    }

    if (session.orgId) {
      return NextResponse.redirect(
        buildUrl(
          request,
          request.nextUrl.searchParams.get("returnTo") || "/dashboard",
        ),
      );
    }
  }

  if (isAuthRoute(request) && session.userId && session.orgId) {
    return NextResponse.redirect(buildUrl(request, "/dashboard"));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
