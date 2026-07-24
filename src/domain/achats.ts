import { db } from "@/lib/db";
import { debutJour, finJour } from "@/lib/dates";
import { calculerLot, numeroSequentiel } from "./rules";
import { entreeAchat } from "./stock";
import { ErreurMetier } from "./ventes";

export type EntreeLot = {
  produitId: string;
  date: Date;
  conditionnement: string;
  nbConditionnements: number;
  piecesParConditionnement: number;
  montantTotal: number;
  fournisseur?: string;
  paye: boolean;
  note?: string;
};

/**
 * RG-02 + RG-04 — Enregistre un achat : crée le lot, écrit l'entrée de stock
 * et déplace le CMUP du produit. Les trois vont ensemble ou aucune n'a lieu.
 */
export async function enregistrerAchat(entree: EntreeLot) {
  const { quantiteTotale, coutUnitaire } = calculerLot(entree);

  if (quantiteTotale <= 0) {
    throw new ErreurMetier(
      "La quantité obtenue est nulle : vérifiez le nombre d'unités et les pièces par unité.",
    );
  }
  if (entree.montantTotal <= 0) {
    throw new ErreurMetier("Le montant de l'achat doit être supérieur à zéro.");
  }

  const produit = await db.produit.findUnique({ where: { id: entree.produitId } });
  if (!produit) throw new ErreurMetier("Produit introuvable.");
  if (!produit.suiviStock) {
    throw new ErreurMetier(
      `${produit.nom} n'est pas suivi en stock : activez le suivi avant d'enregistrer un achat.`,
    );
  }

  return db.$transaction(async (tx) => {
    const rang =
      (await tx.lot.count({
        where: { date: { gte: debutJour(entree.date), lte: finJour(entree.date) } },
      })) + 1;

    const lot = await tx.lot.create({
      data: {
        reference: numeroSequentiel("LOT", entree.date, rang),
        date: entree.date,
        produitId: entree.produitId,
        conditionnement: entree.conditionnement,
        nbConditionnements: entree.nbConditionnements,
        piecesParConditionnement: entree.piecesParConditionnement,
        quantiteTotale,
        montantTotal: entree.montantTotal,
        coutUnitaire,
        fournisseur: entree.fournisseur,
        paye: entree.paye,
        note: entree.note,
      },
    });

    const { cmup } = await entreeAchat(tx, {
      produitId: entree.produitId,
      quantite: quantiteTotale,
      montant: entree.montantTotal,
      date: entree.date,
      lotId: lot.id,
    });

    return { lot, cmup, coutUnitaire };
  });
}

export async function supprimerAchat(lotId: string) {
  // Les mouvements du lot partent en cascade ; le CMUP est ensuite recalculé
  // à partir de l'historique restant pour que le stock reste cohérent.
  const lot = await db.lot.findUnique({ where: { id: lotId } });
  if (!lot) throw new ErreurMetier("Lot introuvable.");

  return db.$transaction(async (tx) => {
    await tx.lot.delete({ where: { id: lotId } });

    const entrees = await tx.mouvementStock.findMany({
      where: { produitId: lot.produitId, type: "ENTREE_ACHAT" },
    });
    const quantite = entrees.reduce((s, m) => s + m.quantite, 0);
    const valeur = entrees.reduce((s, m) => s + m.valeur, 0);

    await tx.produit.update({
      where: { id: lot.produitId },
      data: { coutMoyenUnitaire: quantite > 0 ? valeur / quantite : 0 },
    });
  });
}

export async function derniersAchats(limite = 50) {
  return db.lot.findMany({
    include: { produit: true },
    orderBy: { date: "desc" },
    take: limite,
  });
}
