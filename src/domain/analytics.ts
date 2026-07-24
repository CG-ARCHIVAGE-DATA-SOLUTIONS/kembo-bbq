import { db } from "@/lib/db";
import {
  debutJour,
  finJour,
  debutMois,
  finMois,
  debutSemaine,
  derniersJours,
  journeeCommerciale,
  cleJour,
} from "@/lib/dates";
import { calculerResultat, calculerSeuilRentabilite, amortissementMensuel } from "./rules";
import { valeurStockTotale, alertesStock } from "./stock";

export type Periode = { debut: Date; fin: Date };

export const periodeJour = (d: Date = new Date()): Periode => {
  const j = journeeCommerciale(d);
  return { debut: debutJour(j), fin: finJour(j) };
};

/** La soirée précédente, pour donner un point de comparaison au chiffre du jour. */
export const periodeVeille = (d: Date = new Date()): Periode => {
  const veille = journeeCommerciale(d);
  veille.setDate(veille.getDate() - 1);
  return { debut: debutJour(veille), fin: finJour(veille) };
};

export const periodeSemaine = (d: Date = new Date()): Periode => ({
  debut: debutSemaine(journeeCommerciale(d)),
  fin: finJour(journeeCommerciale(d)),
});

export const periodeMois = (d: Date = new Date()): Periode => ({
  debut: debutMois(d),
  fin: finMois(d),
});

export type Kpis = {
  chiffreAffaires: number;
  coutMatiere: number;
  margeBrute: number;
  charges: number;
  consommationInterne: number;
  resultatNet: number;
  tauxMargeBrute: number;
  nbTickets: number;
  ticketMoyen: number;
  quantiteVendue: number;
};

/** RG-10 — Agrégats d'une période, sans amortissement (réservé au mensuel). */
export async function kpis(periode: Periode): Promise<Kpis> {
  const where = { date: { gte: periode.debut, lte: periode.fin } };

  const [ventes, depenses, conso, lignes] = await Promise.all([
    db.vente.aggregate({
      where,
      _sum: { total: true, coutMatiere: true },
      _count: { _all: true },
    }),
    db.depense.aggregate({ where, _sum: { montant: true } }),
    db.consommationInterne.aggregate({ where, _sum: { valeur: true } }),
    db.ligneVente.aggregate({ where: { vente: where }, _sum: { quantite: true } }),
  ]);

  const chiffreAffaires = ventes._sum.total ?? 0;
  const coutMatiere = ventes._sum.coutMatiere ?? 0;
  const charges = depenses._sum.montant ?? 0;
  const consommationInterne = conso._sum.valeur ?? 0;
  const nbTickets = ventes._count._all;

  const { margeBrute, resultatNet, tauxMargeBrute } = calculerResultat({
    chiffreAffaires,
    coutMatiere,
    charges,
    consommationInterne,
    amortissements: 0,
  });

  return {
    chiffreAffaires,
    coutMatiere,
    margeBrute,
    charges,
    consommationInterne,
    resultatNet,
    tauxMargeBrute,
    nbTickets,
    ticketMoyen: nbTickets ? chiffreAffaires / nbTickets : 0,
    quantiteVendue: lignes._sum.quantite ?? 0,
  };
}

export type PointJour = {
  date: string;
  label: string;
  chiffreAffaires: number;
  margeBrute: number;
  charges: number;
  resultat: number;
};

/** Série des N derniers jours pour la courbe du tableau de bord. */
export async function serieJours(n = 14): Promise<PointJour[]> {
  const jours = derniersJours(n);
  const debut = debutJour(jours[0]);
  const fin = finJour(jours[jours.length - 1]);

  const [ventes, depenses] = await Promise.all([
    db.vente.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, total: true, coutMatiere: true },
    }),
    db.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, montant: true },
    }),
  ]);

  const index = new Map<string, PointJour>(
    jours.map((j) => [
      cleJour(j),
      {
        date: cleJour(j),
        label: j.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        chiffreAffaires: 0,
        margeBrute: 0,
        charges: 0,
        resultat: 0,
      },
    ]),
  );

  for (const v of ventes) {
    const point = index.get(cleJour(journeeCommerciale(v.date)));
    if (!point) continue;
    point.chiffreAffaires += v.total;
    point.margeBrute += v.total - v.coutMatiere;
  }
  for (const d of depenses) {
    const point = index.get(cleJour(debutJour(d.date)));
    if (!point) continue;
    point.charges += d.montant;
  }

  return [...index.values()].map((p) => ({ ...p, resultat: p.margeBrute - p.charges }));
}

export type PerformanceProduit = {
  produitId: string;
  code: string;
  nom: string;
  quantite: number;
  chiffreAffaires: number;
  coutMatiere: number;
  margeBrute: number;
  margeUnitaire: number;
  partCA: number;
};

/** Classement des produits sur une période : ce qui fait vivre l'activité. */
export async function performanceProduits(periode: Periode): Promise<PerformanceProduit[]> {
  const lignes = await db.ligneVente.groupBy({
    by: ["produitId"],
    where: { vente: { date: { gte: periode.debut, lte: periode.fin } } },
    _sum: { quantite: true, total: true, coutMatiere: true, marge: true },
  });

  if (lignes.length === 0) return [];

  const produits = await db.produit.findMany({
    where: { id: { in: lignes.map((l) => l.produitId) } },
    select: { id: true, code: true, nom: true },
  });
  const parId = new Map(produits.map((p) => [p.id, p] as const));
  const totalCA = lignes.reduce((s, l) => s + (l._sum.total ?? 0), 0);

  return lignes
    .map((l) => {
      const p = parId.get(l.produitId);
      const quantite = l._sum.quantite ?? 0;
      const chiffreAffaires = l._sum.total ?? 0;
      const margeBrute = l._sum.marge ?? 0;
      return {
        produitId: l.produitId,
        code: p?.code ?? "?",
        nom: p?.nom ?? "Produit supprimé",
        quantite,
        chiffreAffaires,
        coutMatiere: l._sum.coutMatiere ?? 0,
        margeBrute,
        margeUnitaire: quantite ? margeBrute / quantite : 0,
        partCA: totalCA ? chiffreAffaires / totalCA : 0,
      };
    })
    .sort((a, b) => b.margeBrute - a.margeBrute);
}

/** RG-11 — Amortissement mensuel de tout le matériel acquis avant la fin du mois. */
export async function amortissementsDuMois(mois: Date): Promise<number> {
  const investissements = await db.investissement.findMany({
    where: { date: { lte: finMois(mois) } },
    select: { montant: true, dureeAmortissementMois: true },
  });
  return investissements.reduce(
    (s, i) => s + amortissementMensuel(i.montant, i.dureeAmortissementMois),
    0,
  );
}

/** RG-12 — Solde de caisse à une date : ce qui reste réellement. */
export async function tresorerie(jusquA: Date = new Date()) {
  const where = { date: { lte: jusquA } };
  const [apports, ventes, achats, depenses, investissements] = await Promise.all([
    db.apport.aggregate({ where, _sum: { montant: true } }),
    db.vente.aggregate({ where: { ...where, encaisse: true }, _sum: { total: true } }),
    db.lot.aggregate({ where: { ...where, paye: true }, _sum: { montantTotal: true } }),
    db.depense.aggregate({ where, _sum: { montant: true } }),
    db.investissement.aggregate({ where, _sum: { montant: true } }),
  ]);

  const entrees = (apports._sum.montant ?? 0) + (ventes._sum.total ?? 0);
  const sorties =
    (achats._sum.montantTotal ?? 0) +
    (depenses._sum.montant ?? 0) +
    (investissements._sum.montant ?? 0);

  return {
    apports: apports._sum.montant ?? 0,
    encaissements: ventes._sum.total ?? 0,
    achats: achats._sum.montantTotal ?? 0,
    depenses: depenses._sum.montant ?? 0,
    investissements: investissements._sum.montant ?? 0,
    entrees,
    sorties,
    solde: entrees - sorties,
  };
}

export type Dashboard = {
  jour: Kpis;
  veille: Kpis;
  /** Variation de la recette par rapport à la veille. Null si la veille était vide. */
  evolutionRecette: number | null;
  semaine: Kpis;
  mois: Kpis;
  serie: PointJour[];
  produits: PerformanceProduit[];
  valeurStock: number;
  tresorerie: number;
  alertes: Awaited<ReturnType<typeof alertesStock>>;
  seuil: {
    chargesMois: number;
    caNecessaire: number;
    caRealise: number;
    resteAFaire: number;
    progression: number;
  };
  creditsEnAttente: number;
};

/** Tout ce que le tableau de bord affiche, en une passe. */
export async function chargerDashboard(maintenant: Date = new Date()): Promise<Dashboard> {
  const [jour, veille, semaine, mois, serie, produits, valeurStock, treso, alertes, credits] =
    await Promise.all([
      kpis(periodeJour(maintenant)),
      kpis(periodeVeille(maintenant)),
      kpis(periodeSemaine(maintenant)),
      kpis(periodeMois(maintenant)),
      serieJours(14),
      performanceProduits(periodeMois(maintenant)),
      valeurStockTotale(),
      tresorerie(maintenant),
      alertesStock(),
      db.vente.aggregate({ where: { encaisse: false }, _sum: { total: true } }),
    ]);

  // RG-13 — le seuil se lit sur le mois : c'est l'horizon des charges fixes.
  const caNecessaire = calculerSeuilRentabilite({
    charges: mois.charges,
    tauxMargeBrute: mois.tauxMargeBrute,
  });

  return {
    jour,
    veille,
    evolutionRecette:
      veille.chiffreAffaires > 0
        ? (jour.chiffreAffaires - veille.chiffreAffaires) / veille.chiffreAffaires
        : null,
    semaine,
    mois,
    serie,
    produits,
    valeurStock,
    tresorerie: treso.solde,
    alertes,
    seuil: {
      chargesMois: mois.charges,
      caNecessaire,
      caRealise: mois.chiffreAffaires,
      resteAFaire: Math.max(0, caNecessaire - mois.chiffreAffaires),
      progression: caNecessaire > 0 ? Math.min(1, mois.chiffreAffaires / caNecessaire) : 0,
    },
    creditsEnAttente: credits._sum.total ?? 0,
  };
}
