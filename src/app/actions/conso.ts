"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { MOTIFS_CONSO } from "@/domain/rules";
import { enregistrerConsommation } from "@/domain/conso";
import { formatFCFA } from "@/lib/money";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schema = z.object({
  produitId: z.string().min(1, "Choisissez le produit sorti du stock."),
  quantite: z.coerce.number().positive("La quantité doit être supérieure à zéro."),
  motif: z.enum(MOTIFS_CONSO),
  date: z.coerce.date(),
  note: z.string().trim().max(200).optional(),
});

export async function validerConsommation(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schema.parse(donnees);
    const conso = await enregistrerConsommation(valeurs);
    revalidatePath("/conso");
    revalidatePath("/stock");
    revalidatePath("/");
    return {
      ok: true,
      message: `Sortie enregistrée : ${formatFCFA(conso.valeur)} FCFA de marchandise, ${formatFCFA(
        conso.manqueAGagner,
      )} FCFA de manque à gagner.`,
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function supprimerConsommation(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await db.consommationInterne.delete({ where: { id } });
    revalidatePath("/conso");
    revalidatePath("/stock");
    revalidatePath("/");
    return { ok: true, message: "Sortie annulée, la marchandise est rendue au stock." };
  } catch (e) {
    return echec(e);
  }
}
