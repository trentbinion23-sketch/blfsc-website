import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicSiteUrl } from "./src/lib/site-config";

const canonicalHost = new URL(publicSiteUrl).host;
const wwwHost = canonicalHost.startsWith("www.") ? canonicalHost : `www.${canonicalHost}`;

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.host === wwwHost && canonicalHost !== wwwHost) {
    url.host = canonicalHost;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
