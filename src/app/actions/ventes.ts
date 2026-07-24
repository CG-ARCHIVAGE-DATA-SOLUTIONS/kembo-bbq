"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MODES_PAIEMENT } from "@/domain/rules";
import { enregistrerVente, annulerVente } from "@/domain/ventes";
import { exigerConnexion, exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaVente = z.object({
  lignes: z
    .array(
      z.object({
        produitId: z.string().min(1),
        quantite: z.coerce.number().positive("Les quantités doivent être positives."),
        prixUnitaire: z.coerce.number().int().min(0).optional(),
      }),
    )
    .min(1, "Le ticket est vide : ajoutez au moins un produit."),
  modePaiement: z.enum(MODES_PAIEMENT),
  remise: z.coerce.number().int().min(0).default(0),
  client: z.string().trim().max(60).optional(),
  note: z.string().trim().max(200).optional(),
  date: z.coerce.date().optional(),
  cleIdempotence: z.string().min(8).max(64).optional(),
  origineHorsLigne: z.boolean().optional(),
});

export async function validerVente(
  donnees: unknown,
): Promise<Reponse<{ numero: string; total: number; marge: number }>> {
  try {
    const utilisateur = await exigerConnexion();
    const valeurs = schemaVente.parse(donnees);
    const vente = await enregistrerVente({ ...valeurs, utilisateurId: utilisateur.id });

    revalidatePath("/");
    revalidatePath("/caisse");
    revalidatePath("/stock");

    return {
      ok: true,
      message: vente.deja
        ? `Ticket ${vente.numero} déjà enregistré.`
        : `Ticket ${vente.numero} enregistré.`,
      data: { numero: vente.numero, total: vente.total, marge: vente.marge },
      avertissements: vente.avertissements,
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Ticket invalide." };
    return echec(e);
  }
}

export async function supprimerVente(id: string, motif: string): Promise<Reponse> {
  try {
    await exigerGerant();
    const r = await annulerVente(id, motif);
    revalidatePath("/");
    revalidatePath("/caisse");
    revalidatePath("/stock");
    return { ok: true, message: `Ticket ${r.numero} annulé. Le stock a été rendu.` };
  } catch (e) {
    return echec(e);
  }
}
