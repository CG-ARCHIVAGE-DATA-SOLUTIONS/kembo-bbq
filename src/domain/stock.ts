import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { calculerCMUP, statutStock, type StatutStock, type TypeMouvement } from "./rules";

type Tx = Prisma.TransactionClient;

/** RG-03 — Le stock est la somme du journal, jamais une colonne mise à jour. */
export async function stockCourant(tx: Tx | typeof db, produitId: string): Promise<number> {
  const agg = await tx.mouvementStock.aggregate({
    where: { produitId },
    _sum: { quantite: true },
  });
  return agg._sum.quantite ?? 0;
}

/** Stock de tous les produits en une requête (évite le N+1 sur les listes). */
export async function stocksParProduit(): Promise<Map<string, number>> {
  const lignes = await db.mouvementStock.groupBy({
    by: ["produitId"],
    _sum: { quantite: true },
  });
  return new Map(lignes.map((l) => [l.produitId, l._sum.quantite ?? 0]));
}

/**
 * RG-04 — Entrée de marchandise : écrit le mouvement puis recalcule le CMUP
 * du produit. Toujours appelée dans une transaction avec la création du lot.
 */
export async function entreeAchat(
  tx: Tx,
  params: {
    produitId: string;
    quantite: number;
    montant: number;
    date: Date;
    lotId: string;
    note?: string;
  },
): Promise<{ cmup: number }> {
  const produit = await tx.produit.findUniqueOrThrow({ where: { id: params.produitId } });
  const stockAvant = await stockCourant(tx, params.produitId);

  const cmup = calculerCMUP({
    stockAvant,
    cmupAvant: produit.coutMoyenUnitaire,
    quantiteEntree: params.quantite,
    montantEntree: params.montant,
  });

  const coutLot = params.quantite > 0 ? params.montant / params.quantite : 0;

  await tx.mouvementStock.create({
    data: {
      date: params.date,
      produitId: params.produitId,
      type: "ENTREE_ACHAT" satisfies TypeMouvement,
      quantite: params.quantite,
      coutUnitaire: coutLot,
      valeur: params.montant,
      lotId: params.lotId,
      note: params.note,
    },
  });

  await tx.produit.update({
    where: { id: params.produitId },
    data: { coutMoyenUnitaire: cmup },
  });

  return { cmup };
}

/**
 * Sortie de stock valorisée au CMUP courant.
 * Le CMUP n'est pas modifié par une sortie : seule une entrée le déplace.
 */
export async function sortieStock(
  tx: Tx,
  params: {
    produitId: string;
    quantite: number; // valeur positive
    coutUnitaire: number; // CMUP figé par l'appelant (RG-05)
    date: Date;
    type: Extract<TypeMouvement, "SORTIE_VENTE" | "SORTIE_INTERNE">;
    venteId?: string;
    consommationId?: string;
    note?: string;
  },
) {
  await tx.mouvementStock.create({
    data: {
      date: params.date,
      produitId: params.produitId,
      type: params.type,
      quantite: -Math.abs(params.quantite),
      coutUnitaire: params.coutUnitaire,
      valeur: -Math.abs(params.quantite) * params.coutUnitaire,
      venteId: params.venteId,
      consommationId: params.consommationId,
      note: params.note,
    },
  });
}

/**
 * RG-03 — Inventaire physique : on ne corrige pas le stock, on enregistre
 * l'écart constaté. L'historique reste vérifiable.
 */
export async function ajusterStock(params: {
  produitId: string;
  quantiteComptee: number;
  date: Date;
  note?: string;
}) {
  return db.$transaction(async (tx) => {
    const produit = await tx.produit.findUniqueOrThrow({ where: { id: params.produitId } });
    const stockTheorique = await stockCourant(tx, params.produitId);
    const ecart = params.quantiteComptee - stockTheorique;
    if (ecart === 0) return { ecart: 0 };

    await tx.mouvementStock.create({
      data: {
        date: params.date,
        produitId: params.produitId,
        type: "AJUSTEMENT" satisfies TypeMouvement,
        quantite: ecart,
        coutUnitaire: produit.coutMoyenUnitaire,
        valeur: ecart * produit.coutMoyenUnitaire,
        note:
          params.note ??
          `Inventaire : compté ${params.quantiteComptee}, théorique ${stockTheorique}`,
      },
    });
    return { ecart };
  });
}

export type LigneEtatStock = {
  id: string;
  code: string;
  nom: string;
  categorie: string;
  unite: string;
  suiviStock: boolean;
  prixVente: number;
  cmup: number;
  seuilAlerte: number;
  quantiteAchetee: number;
  quantiteVendue: number;
  quantiteInterne: number;
  ajustements: number;
  stock: number;
  valeurStock: number;
  statut: StatutStock;
};

/** État complet du stock, agrégé par type de mouvement. */
export async function etatStock(): Promise<LigneEtatStock[]> {
  const [produits, mouvements] = await Promise.all([
    db.produit.findMany({ where: { actif: true }, orderBy: [{ ordre: "asc" }, { code: "asc" }] }),
    db.mouvementStock.groupBy({ by: ["produitId", "type"], _sum: { quantite: true } }),
  ]);

  const parProduit = new Map<string, Record<string, number>>();
  for (const m of mouvements) {
    const courant = parProduit.get(m.produitId) ?? {};
    courant[m.type] = (courant[m.type] ?? 0) + (m._sum.quantite ?? 0);
    parProduit.set(m.produitId, courant);
  }

  return produits.map((p) => {
    const m = parProduit.get(p.id) ?? {};
    const quantiteAchetee = m.ENTREE_ACHAT ?? 0;
    const quantiteVendue = Math.abs(m.SORTIE_VENTE ?? 0);
    const quantiteInterne = Math.abs(m.SORTIE_INTERNE ?? 0);
    const ajustements = m.AJUSTEMENT ?? 0;
    const stock = quantiteAchetee - quantiteVendue - quantiteInterne + ajustements;

    return {
      id: p.id,
      code: p.code,
      nom: p.nom,
      categorie: p.categorie,
      unite: p.unite,
      suiviStock: p.suiviStock,
      prixVente: p.prixVente,
      cmup: p.coutMoyenUnitaire,
      seuilAlerte: p.seuilAlerte,
      quantiteAchetee,
      quantiteVendue,
      quantiteInterne,
      ajustements,
      stock,
      valeurStock: stock * p.coutMoyenUnitaire,
      statut: statutStock({ suiviStock: p.suiviStock, stock, seuilAlerte: p.seuilAlerte }),
    };
  });
}

export async function valeurStockTotale(): Promise<number> {
  const lignes = await etatStock();
  return lignes.reduce((s, l) => s + Math.max(0, l.valeurStock), 0);
}

export async function alertesStock(): Promise<LigneEtatStock[]> {
  const lignes = await etatStock();
  return lignes.filter((l) => l.statut === "RUPTURE" || l.statut === "REAPPRO");
}
