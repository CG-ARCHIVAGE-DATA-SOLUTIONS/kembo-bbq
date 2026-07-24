import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessionCourante, type Role } from "@/domain/auth";
import { Connexion, type Compte } from "./connexion-client";

export const dynamic = "force-dynamic";

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;
  if (await sessionCourante()) redirect(suite || "/");

  let comptes: Compte[] = [];
  try {
    const lignes = await db.utilisateur.findMany({
      where: { actif: true },
      orderBy: { nom: "asc" },
      select: { identifiant: true, nom: true, role: true },
    });
    comptes = lignes.map((l) => ({ ...l, role: l.role as Role }));
  } catch {
    comptes = [];
  }

  // Une redirection vers la page de connexion ne doit pas boucler sur elle-même.
  const destination = suite && !suite.startsWith("/connexion") ? suite : "/";

  return <Connexion comptes={comptes} suite={destination} />;
}
