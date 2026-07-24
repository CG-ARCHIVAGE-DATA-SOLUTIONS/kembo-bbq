import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirection de confort uniquement. Le middleware s'exécute sur le runtime Edge,
 * où la vérification de signature (node:crypto) n'est pas disponible : la
 * validation réelle de la session a lieu côté serveur, dans sessionCourante().
 * Ici on se contente d'éviter d'afficher une page vide à qui n'est pas connecté.
 */
const PUBLIC = ["/connexion", "/hors-ligne", "/manifest.webmanifest", "/sw.js"];

export function middleware(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = requete.cookies.get("kembo_session");
  if (!session) {
    const url = requete.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icones|favicon.ico).*)"],
};
