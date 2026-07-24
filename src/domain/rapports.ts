import { db } from "@/lib/db";
import { debutMois, finMois } from "@/lib/dates";
import {
  CATEGORIES_DEPENSE,
  amortissementMensuel,
  calculerResultat,
  type CategorieDepense,
} from "./rules";

export type LigneMois = {
  mois: Date;
  chiffreAffaires: number;
  coutMatiere: number;
  margeBrute: number;
  charges: Record<CategorieDepense, number>;
  totalCharges: number;
  consommationInterne: number;
  amortissements: number;
  resultatNet: number;
  tauxMargeBrute: number;
  nbTickets: number;
};

function moisDeLAnnee(annee: number): Date[] {
  return Array.from({ length: 12 }, (_, i) => new Date(annee, i, 1));
}

/** RG-10 + RG-11 — Compte de résultat mois par mois sur une année civile. */
export async function compteResultat(annee: number): Promise<LigneMois[]> {
  const debut = debutMois(new Date(annee, 0, 1));
  const fin = finMois(new Date(annee, 11, 1));

  const [ventes, depenses, consos, investissements] = await Promise.all([
    db.vente.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, total: true, coutMatiere: true },
    }),
    db.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, montant: true, categorie: true },
    }),
    db.consommationInterne.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, valeur: true },
    }),
    db.investissement.findMany({
      where: { date: { lte: fin } },
      select: { date: true, montant: true, dureeAmortissementMois: true },
    }),
  ]);

  return moisDeLAnnee(annee).map((mois) => {
    const borneBasse = debutMois(mois);
    const borneHaute = finMois(mois);
    const dansLeMois = (d: Date) => d >= borneBasse && d <= borneHaute;

    const venteseMois = ventes.filter((v) => dansLeMois(v.date));
    const chiffreAffaires = venteseMois.reduce((s, v) => s + v.total, 0);
    const coutMatiere = venteseMois.reduce((s, v) => s + v.coutMatiere, 0);

    const charges = Object.fromEntries(
      CATEGORIES_DEPENSE.map((c) => [
        c,
        depenses
          .filter((d) => dansLeMois(d.date) && d.categorie === c)
          .reduce((s, d) => s + d.montant, 0),
      ]),
    ) as Record<CategorieDepense, number>;

    const totalCharges = Object.values(charges).reduce((s, v) => s + v, 0);
    const consommationInterne = consos
      .filter((c) => dansLeMois(c.date))
      .reduce((s, c) => s + c.valeur, 0);

    // Le matériel s'amortit à partir de son mois d'acquisition, pas avant.
    const amortissements = investissements
      .filter((i) => i.date <= borneHaute)
      .reduce((s, i) => s + amortissementMensuel(i.montant, i.dureeAmortissementMois), 0);

    const { margeBrute, resultatNet, tauxMargeBrute } = calculerResultat({
      chiffreAffaires,
      coutMatiere,
      charges: totalCharges,
      consommationInterne,
      amortissements,
    });

    return {
      mois,
      chiffreAffaires,
      coutMatiere,
      margeBrute,
      charges,
      totalCharges,
      consommationInterne,
      amortissements,
      resultatNet,
      tauxMargeBrute,
      nbTickets: venteseMois.length,
    };
  });
}

export type LigneTresorerie = {
  mois: Date;
  ouverture: number;
  apports: number;
  encaissements: number;
  totalEntrees: number;
  achats: number;
  depenses: number;
  investissements: number;
  totalSorties: number;
  flux: number;
  cloture: number;
};

/** RG-12 — Trésorerie mois par mois : d'où vient l'argent, où il part. */
export async function tresorerieMensuelle(annee: number): Promise<LigneTresorerie[]> {
  const debut = debutMois(new Date(annee, 0, 1));
  const fin = finMois(new Date(annee, 11, 1));

  const [apports, ventes, lots, depenses, investissements, soldeAvant] = await Promise.all([
    db.apport.findMany({ where: { date: { gte: debut, lte: fin } }, select: { date: true, montant: true } }),
    db.vente.findMany({
      where: { date: { gte: debut, lte: fin }, encaisse: true },
      select: { date: true, total: true },
    }),
    db.lot.findMany({
      where: { date: { gte: debut, lte: fin }, paye: true },
      select: { date: true, montantTotal: true },
    }),
    db.depense.findMany({ where: { date: { gte: debut, lte: fin } }, select: { date: true, montant: true } }),
    db.investissement.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { date: true, montant: true },
    }),
    soldeAvant_(debut),
  ]);

  let ouverture = soldeAvant;

  return moisDeLAnnee(annee).map((mois) => {
    const b1 = debutMois(mois);
    const b2 = finMois(mois);
    const dans = (d: Date) => d >= b1 && d <= b2;

    const apportsMois = apports
      .filter((a) => dans(a.date))
      .reduce((total, a) => total + a.montant, 0);
    const encaissements = ventes
      .filter((v) => dans(v.date))
      .reduce((total, v) => total + v.total, 0);
    const achats = lots
      .filter((l) => dans(l.date))
      .reduce((total, l) => total + l.montantTotal, 0);
    const depensesMois = depenses
      .filter((d) => dans(d.date))
      .reduce((total, d) => total + d.montant, 0);
    const investMois = investissements
      .filter((i) => dans(i.date))
      .reduce((total, i) => total + i.montant, 0);

    const totalEntrees = apportsMois + encaissements;
    const totalSorties = achats + depensesMois + investMois;
    const flux = totalEntrees - totalSorties;
    const ligne: LigneTresorerie = {
      mois,
      ouverture,
      apports: apportsMois,
      encaissements,
      totalEntrees,
      achats,
      depenses: depensesMois,
      investissements: investMois,
      totalSorties,
      flux,
      cloture: ouverture + flux,
    };
    ouverture = ligne.cloture;
    return ligne;
  });
}

/** Solde de caisse accumulé avant le début de la période affichée. */
async function soldeAvant_(date: Date): Promise<number> {
  const [apports, ventes, lots, depenses, investissements] = await Promise.all([
    db.apport.aggregate({ where: { date: { lt: date } }, _sum: { montant: true } }),
    db.vente.aggregate({ where: { date: { lt: date }, encaisse: true }, _sum: { total: true } }),
    db.lot.aggregate({ where: { date: { lt: date }, paye: true }, _sum: { montantTotal: true } }),
    db.depense.aggregate({ where: { date: { lt: date } }, _sum: { montant: true } }),
    db.investissement.aggregate({ where: { date: { lt: date } }, _sum: { montant: true } }),
  ]);
  return (
    (apports._sum.montant ?? 0) +
    (ventes._sum.total ?? 0) -
    (lots._sum.montantTotal ?? 0) -
    (depenses._sum.montant ?? 0) -
    (investissements._sum.montant ?? 0)
  );
}
