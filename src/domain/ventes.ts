import { db } from "@/lib/db";
import { journeeCommerciale, debutJour, finJour } from "@/lib/dates";
import { numeroSequentiel, type ModePaiement } from "./rules";
import { ouvrirJournee } from "./journee";
import { sortieStock, stockCourant } from "./stock";
import { politiqueStock } from "./parametres";

export type LigneVenteEntree = {
  produitId: string;
  quantite: number;
  /** Prix négocié. Absent → prix catalogue (RG-06). */
  prixUnitaire?: number;
};

export type EntreeVente = {
  lignes: LigneVenteEntree[];
  modePaiement: ModePaiement;
  remise?: number;
  client?: string;
  note?: string;
  date?: Date;
  utilisateurId?: string;
  /** Identifiant du ticket généré à la saisie : rend le renvoi sans effet (RG-18). */
  cleIdempotence?: string;
  /** Ticket rejoué depuis la file hors ligne. */
  origineHorsLigne?: boolean;
};

export type ResultatVente = {
  id: string;
  numero: string;
  total: number;
  marge: number;
  avertissements: string[];
  /** Vrai si le ticket existait déjà : renvoi d'une vente hors ligne. */
  deja?: boolean;
};

export class ErreurMetier extends Error {}

/**
 * RG-04 à RG-07 — Enregistre un ticket complet en une seule transaction :
 * numérotation, journée, lignes, mouvements de stock. Rien ne part à moitié.
 */
export async function enregistrerVente(entree: EntreeVente): Promise<ResultatVente> {
  if (entree.lignes.length === 0) {
    throw new ErreurMetier("Le ticket est vide : ajoutez au moins un produit.");
  }

  // RG-18 — Un ticket déjà enregistré sous cette clé n'est jamais recréé.
  if (entree.cleIdempotence) {
    const existante = await db.vente.findUnique({
      where: { cleIdempotence: entree.cleIdempotence },
    });
    if (existante) {
      return {
        id: existante.id,
        numero: existante.numero,
        total: existante.total,
        marge: existante.marge,
        avertissements: [],
        deja: true,
      };
    }
  }

  const date = entree.date ?? new Date();
  const jour = journeeCommerciale(date);
  const politique = await politiqueStock();
  const avertissements: string[] = [];

  const produits = await db.produit.findMany({
    where: { id: { in: entree.lignes.map((l) => l.produitId) } },
  });
  const parId = new Map(produits.map((p) => [p.id, p] as const));

  // Contrôle de stock avant écriture — on cumule les quantités d'un même produit
  // présent sur plusieurs lignes du ticket.
  const demandeParProduit = new Map<string, number>();
  for (const ligne of entree.lignes) {
    demandeParProduit.set(
      ligne.produitId,
      (demandeParProduit.get(ligne.produitId) ?? 0) + ligne.quantite,
    );
  }

  for (const [produitId, demande] of demandeParProduit) {
    const produit = parId.get(produitId);
    if (!produit) throw new ErreurMetier("Produit introuvable dans le catalogue.");
    if (!produit.actif) throw new ErreurMetier(`${produit.nom} n'est plus en vente.`);
    if (!produit.suiviStock) continue;

    const stock = await stockCourant(db, produitId);
    if (demande > stock) {
      const message = `${produit.nom} : ${demande} demandé(s) pour ${stock} en stock.`;
      if (politique === "BLOQUER") throw new ErreurMetier(message);
      avertissements.push(message);
    }
  }

  return db.$transaction(async (tx) => {
    const journee = await ouvrirJournee(tx, date);
    // Une vente hors ligne a réellement eu lieu avant la clôture : la refuser
    // ferait disparaître de l'argent encaissé. On l'accepte et on la signale.
    if (journee.statut === "CLOTUREE" && !entree.origineHorsLigne) {
      throw new ErreurMetier(
        "La journée est clôturée. Rouvrez-la pour enregistrer une vente sur cette date.",
      );
    }
    if (journee.statut === "CLOTUREE") {
      avertissements.push("Journée déjà clôturée : ce ticket y a été rattaché a posteriori.");
    }

    const rang =
      (await tx.vente.count({ where: { date: { gte: debutJour(jour), lte: finJour(jour) } } })) + 1;

    const lignes = entree.lignes.map((l) => {
      const produit = parId.get(l.produitId)!;
      const prixUnitaire = l.prixUnitaire ?? produit.prixVente;
      const total = Math.round(prixUnitaire * l.quantite);
      // RG-05 : le CMUP est figé maintenant, il ne bougera plus pour cette vente.
      const coutUnitaire = produit.suiviStock ? produit.coutMoyenUnitaire : 0;
      const coutMatiere = coutUnitaire * l.quantite;
      return {
        produitId: produit.id,
        designation: produit.nom,
        quantite: l.quantite,
        prixUnitaire,
        total,
        coutUnitaire,
        coutMatiere,
        marge: total - coutMatiere,
      };
    });

    const remise = Math.max(0, entree.remise ?? 0);
    const brut = lignes.reduce((s, l) => s + l.total, 0);
    const total = Math.max(0, brut - remise);
    const coutMatiere = lignes.reduce((s, l) => s + l.coutMatiere, 0);

    const vente = await tx.vente.create({
      data: {
        numero: numeroSequentiel("TK", jour, rang),
        date,
        journeeId: journee.id,
        modePaiement: entree.modePaiement,
        encaisse: entree.modePaiement !== "CREDIT", // RG-12
        total,
        remise,
        coutMatiere,
        marge: total - coutMatiere,
        client: entree.client,
        note: entree.note,
        utilisateurId: entree.utilisateurId,
        cleIdempotence: entree.cleIdempotence,
        horsLigne: entree.origineHorsLigne ?? false,
        lignes: { create: lignes },
      },
    });

    for (const ligne of lignes) {
      const produit = parId.get(ligne.produitId)!;
      if (!produit.suiviStock) continue;
      await sortieStock(tx, {
        produitId: ligne.produitId,
        quantite: ligne.quantite,
        coutUnitaire: ligne.coutUnitaire,
        date,
        type: "SORTIE_VENTE",
        venteId: vente.id,
      });
    }

    return {
      id: vente.id,
      numero: vente.numero,
      total: vente.total,
      marge: vente.marge,
      avertissements,
    };
  });
}

/** Annulation : supprime le ticket et ses mouvements (cascade) — trace conservée en note. */
export async function annulerVente(venteId: string, motif: string) {
  const vente = await db.vente.findUnique({
    where: { id: venteId },
    include: { journee: true },
  });
  if (!vente) throw new ErreurMetier("Ticket introuvable.");
  if (vente.journee.statut === "CLOTUREE") {
    throw new ErreurMetier("Journée clôturée : ce ticket ne peut plus être annulé.");
  }
  await db.vente.delete({ where: { id: venteId } });
  return { numero: vente.numero, motif };
}

export async function ventesDuJour(date: Date = new Date()) {
  const jour = journeeCommerciale(date);
  return db.vente.findMany({
    where: { date: { gte: debutJour(jour), lte: finJour(jour) } },
    include: {
      lignes: true,
      utilisateur: { select: { nom: true, identifiant: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function dernieresVentes(limite = 20) {
  return db.vente.findMany({
    include: { lignes: true },
    orderBy: { date: "desc" },
    take: limite,
  });
}
