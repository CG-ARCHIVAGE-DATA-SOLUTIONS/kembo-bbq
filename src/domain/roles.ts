export const ROLES = ["GERANT", "VENDEUR"] as const;
export type Role = (typeof ROLES)[number];

export const LIB_ROLE: Record<Role, string> = {
  GERANT: "Gérant",
  VENDEUR: "Vendeur",
};

export const ACCES_PAR_ROLE: Record<Role, string[]> = {
  GERANT: [
    "/",
    "/caisse",
    "/achats",
    "/stock",
    "/conso",
    "/depenses",
    "/investissements",
    "/rapports",
    "/produits",
    "/revient",
    "/credits",
    "/equipe",
    "/plus",
  ],
  VENDEUR: ["/caisse", "/stock", "/plus"],
};

export function peutVoir(role: Role, chemin: string): boolean {
  return ACCES_PAR_ROLE[role].some((autorise) =>
    autorise === "/" ? chemin === "/" : chemin.startsWith(autorise),
  );
}
