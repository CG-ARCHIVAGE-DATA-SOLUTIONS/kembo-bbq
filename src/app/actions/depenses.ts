"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CATEGORIES_DEPENSE, MODES_PAIEMENT } from "@/domain/rules";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaDepense = z.object({
  date: z.coerce.date(),
  libelle: z.string().trim().min(2, "Dites en deux mots à quoi correspond la dépense."),
  categorie: z.enum(CATEGORIES_DEPENSE),
  montant: z.coerce.number().int().positive("Le montant doit être supérieur à zéro."),
  modePaiement: z.enum(MODES_PAIEMENT).default("ESPECES"),
  note: z.string().trim().max(200).optional(),
});

export async function validerDepense(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaDepense.parse(donnees);
    await db.depense.create({ data: valeurs });
    revalidatePath("/depenses");
    revalidatePath("/");
    return { ok: true, message: "Dépense enregistrée." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Dépense invalide." };
    return echec(e);
  }
}

export async function modifierDepense(id: string, donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaDepense.partial().parse(donnees);
    await db.depense.update({ where: { id }, data: valeurs });
    revalidatePath("/depenses");
    revalidatePath("/");
    return { ok: true, message: "Dépense mise à jour." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function supprimerDepense(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await db.depense.delete({ where: { id } });
    revalidatePath("/depenses");
    revalidatePath("/");
    return { ok: true, message: "Dépense supprimée." };
  } catch (e) {
    return echec(e);
  }
}
