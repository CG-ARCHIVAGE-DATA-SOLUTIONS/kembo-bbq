import { db } from "@/lib/db";
import { DEFAUTS_PARAMETRE, CLES_PARAMETRE } from "./rules";

export async function lireParametre(cle: string): Promise<string> {
  // Au tout premier lancement, la base peut ne pas encore exister : on retombe
  // sur les valeurs par défaut plutôt que de casser l'affichage.
  try {
    const p = await db.parametre.findUnique({ where: { cle } });
    return p?.valeur ?? DEFAUTS_PARAMETRE[cle] ?? "";
  } catch {
    return DEFAUTS_PARAMETRE[cle] ?? "";
  }
}

export async function ecrireParametre(cle: string, valeur: string) {
  return db.parametre.upsert({
    where: { cle },
    create: { cle, valeur },
    update: { valeur },
  });
}

export type PolitiqueStock = "BLOQUER" | "AVERTIR";

/** RG-07 — Comportement quand une vente ferait passer le stock sous zéro. */
export async function politiqueStock(): Promise<PolitiqueStock> {
  const v = await lireParametre(CLES_PARAMETRE.POLITIQUE_STOCK);
  return v === "BLOQUER" ? "BLOQUER" : "AVERTIR";
}
