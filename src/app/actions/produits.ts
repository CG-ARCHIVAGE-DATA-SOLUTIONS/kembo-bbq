"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CATEGORIES_PRODUIT, UNITES } from "@/domain/rules";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaProduit = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Le code doit faire au moins 2 caractères.")
    .max(12)
    .transform((v) => v.toUpperCase()),
  nom: z.string().trim().min(2, "Donnez un nom lisible en caisse."),
  categorie: z.enum(CATEGORIES_PRODUIT),
  unite: z.enum(UNITES),
  prixVente: z.coerce.number().int("Le prix se saisit en francs entiers.").min(0),
  suiviStock: z.coerce.boolean(),
  seuilAlerte: z.coerce.number().min(0),
});

export async function creerProduit(donnees: unknown): Promise<Reponse<{ id: string }>> {
  try {
    await exigerGerant();
    const valeurs = schemaProduit.parse(donnees);
    const existant = await db.produit.findUnique({ where: { code: valeurs.code } });
    if (existant) {
      return { ok: false, message: `Le code ${valeurs.code} est déjà pris par ${existant.nom}.` };
    }
    const dernier = await db.produit.findFirst({ orderBy: { ordre: "desc" } });
    const produit = await db.produit.create({
      data: { ...valeurs, ordre: (dernier?.ordre ?? 0) + 1 },
    });
    revalidatePath("/produits");
    revalidatePath("/caisse");
    return { ok: true, message: `${produit.nom} est en vente.`, data: { id: produit.id } };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function modifierProduit(id: string, donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const valeurs = schemaProduit.partial().parse(donnees);
    await db.produit.update({ where: { id }, data: valeurs });
    revalidatePath("/produits");
    revalidatePath("/caisse");
    revalidatePath("/stock");
    return { ok: true, message: "Produit mis à jour." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

/**
 * On ne supprime pas un produit déjà vendu : l'historique des marges y renvoie.
 * On le retire de la vente (actif = false).
 */
export async function basculerActivation(id: string): Promise<Reponse> {
  try {
    await exigerGerant();
    const produit = await db.produit.findUniqueOrThrow({ where: { id } });
    await db.produit.update({ where: { id }, data: { actif: !produit.actif } });
    revalidatePath("/produits");
    revalidatePath("/caisse");
    return {
      ok: true,
      message: produit.actif ? `${produit.nom} retiré de la carte.` : `${produit.nom} remis en vente.`,
    };
  } catch (e) {
    return echec(e);
  }
}
