"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ajusterStock } from "@/domain/stock";
import { formatQuantite } from "@/lib/money";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaInventaire = z.object({
  produitId: z.string().min(1),
  quantiteComptee: z.coerce.number().min(0, "La quantité comptée ne peut pas être négative."),
  note: z.string().trim().max(200).optional(),
});

/** RG-03 — L'inventaire n'écrase rien : il enregistre l'écart constaté. */
export async function validerInventaire(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaInventaire.parse(donnees);
    const { ecart } = await ajusterStock({ ...valeurs, date: new Date() });
    revalidatePath("/stock");
    revalidatePath("/");
    if (ecart === 0) return { ok: true, message: "Aucun écart : le stock était juste." };
    return {
      ok: true,
      message: `Écart de ${formatQuantite(ecart)} enregistré.`,
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}
