"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CATEGORIES_INVESTISSEMENT } from "@/domain/rules";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaInvestissement = z.object({
  date: z.coerce.date(),
  libelle: z.string().trim().min(2, "Nommez le matériel acheté."),
  categorie: z.enum(CATEGORIES_INVESTISSEMENT),
  montant: z.coerce.number().int().positive("Le montant doit être supérieur à zéro."),
  dureeAmortissementMois: z.coerce
    .number()
    .int()
    .positive("Indiquez sur combien de mois ce matériel doit durer."),
  financement: z.string().trim().max(40).default("FONDS_PROPRES"),
});

export async function validerInvestissement(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaInvestissement.parse(donnees);
    await db.investissement.create({ data: valeurs });
    revalidatePath("/investissements");
    revalidatePath("/rapports");
    revalidatePath("/");
    return { ok: true, message: "Investissement enregistré." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

const schemaApport = z.object({
  date: z.coerce.date(),
  libelle: z.string().trim().min(2, "Précisez l'origine de l'apport."),
  montant: z.coerce.number().int().positive("Le montant doit être supérieur à zéro."),
});

export async function validerApport(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaApport.parse(donnees);
    await db.apport.create({ data: valeurs });
    revalidatePath("/investissements");
    revalidatePath("/rapports");
    revalidatePath("/");
    return { ok: true, message: "Apport enregistré : la trésorerie est mise à jour." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function supprimerInvestissement(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await db.investissement.delete({ where: { id } });
    revalidatePath("/investissements");
    revalidatePath("/");
    return { ok: true, message: "Investissement supprimé." };
  } catch (e) {
    return echec(e);
  }
}

export async function supprimerApport(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await db.apport.delete({ where: { id } });
    revalidatePath("/investissements");
    revalidatePath("/");
    return { ok: true, message: "Apport supprimé." };
  } catch (e) {
    return echec(e);
  }
}
