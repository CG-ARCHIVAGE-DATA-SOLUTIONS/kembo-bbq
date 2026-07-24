import { db } from "@/lib/db";
import { sortieStock } from "./stock";
import { ErreurMetier } from "./ventes";
import type { MotifConso } from "./rules";

export type EntreeConso = {
  produitId: string;
  quantite: number;
  motif: MotifConso;
  date: Date;
  note?: string;
};

/**
 * RG-08 — Une sortie non vendue est valorisée au CMUP et chiffrée en manque à
 * gagner. Rien ne quitte le stock sans laisser d'explication.
 */
export async function enregistrerConsommation(entree: EntreeConso) {
  const produit = await db.produit.findUnique({ where: { id: entree.produitId } });
  if (!produit) throw new ErreurMetier("Produit introuvable.");
  if (!produit.suiviStock) {
    throw new ErreurMetier(`${produit.nom} n'est pas suivi en stock : rien à sortir.`);
  }
  if (entree.quantite <= 0) throw new ErreurMetier("La quantité doit être supérieure à zéro.");

  return db.$transaction(async (tx) => {
    const conso = await tx.consommationInterne.create({
      data: {
        date: entree.date,
        produitId: entree.produitId,
        quantite: entree.quantite,
        motif: entree.motif,
        coutUnitaire: produit.coutMoyenUnitaire,
        valeur: produit.coutMoyenUnitaire * entree.quantite,
        manqueAGagner: Math.round(produit.prixVente * entree.quantite),
        note: entree.note,
      },
    });

    await sortieStock(tx, {
      produitId: entree.produitId,
      quantite: entree.quantite,
      coutUnitaire: produit.coutMoyenUnitaire,
      date: entree.date,
      type: "SORTIE_INTERNE",
      consommationId: conso.id,
    });

    return conso;
  });
}

export async function dernieresConsommations(limite = 50) {
  return db.consommationInterne.findMany({
    include: { produit: true },
    orderBy: { date: "desc" },
    take: limite,
  });
}
