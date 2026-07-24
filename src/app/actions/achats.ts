"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONDITIONNEMENTS } from "@/domain/rules";
import { enregistrerAchat, supprimerAchat } from "@/domain/achats";
import { formatFCFA } from "@/lib/money";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaAchat = z.object({
  produitId: z.string().min(1, "Choisissez le produit acheté."),
  date: z.coerce.date(),
  conditionnement: z.enum(CONDITIONNEMENTS),
  nbConditionnements: z.coerce.number().positive("Indiquez combien d'unités ont été achetées."),
  piecesParConditionnement: z.coerce
    .number()
    .positive("Indiquez combien de pièces contient une unité."),
  montantTotal: z.coerce.number().int().positive("Le montant payé doit être supérieur à zéro."),
  fournisseur: z.string().trim().max(60).optional(),
  paye: z.coerce.boolean().default(true),
});

export async function validerAchat(donnees: unknown): Promise<Reponse<{ coutUnitaire: number }>> {
  try {
    await exigerGerant();
    const valeurs = schemaAchat.parse(donnees);
    const { lot, coutUnitaire } = await enregistrerAchat(valeurs);

    revalidatePath("/achats");
    revalidatePath("/stock");
    revalidatePath("/");

    return {
      ok: true,
      message: `${lot.reference} enregistré — la pièce revient à ${formatFCFA(coutUnitaire)} FCFA.`,
      data: { coutUnitaire },
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Achat invalide." };
    return echec(e);
  }
}

export async function annulerAchat(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await supprimerAchat(id);
    revalidatePath("/achats");
    revalidatePath("/stock");
    revalidatePath("/");
    return { ok: true, message: "Achat supprimé, stock et coût moyen recalculés." };
  } catch (e) {
    return echec(e);
  }
}
