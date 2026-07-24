/**
 * RÈGLES DE GESTION — KEMBO BBQ
 * ─────────────────────────────
 * Source unique de vérité. Toute règle métier est définie ici et nulle part
 * ailleurs : les Server Actions valident, les services appliquent, l'UI affiche.
 *
 * RG-01  Un produit a un code unique, un prix de vente entier en FCFA et une unité.
 *        Un produit non suivi en stock (sauce préparée sur place) ne génère
 *        aucun mouvement et n'a pas de coût matière.
 * RG-02  Un achat crée un LOT : quantité = nb de conditionnements × pièces par
 *        conditionnement ; coût unitaire = montant total / quantité.
 * RG-03  Le stock n'est jamais écrasé : c'est la somme d'un journal de mouvements
 *        signés (+ entrée, − sortie). Toute correction passe par un AJUSTEMENT.
 * RG-04  Le CMUP (coût moyen unitaire pondéré) est recalculé à chaque entrée :
 *        CMUP = (valeur du stock avant + montant de l'achat) / (quantité avant + quantité entrée).
 *        Stock nul ou négatif → le CMUP prend le coût du lot entrant.
 * RG-05  Une vente fige le CMUP de l'instant sur chaque ligne. Un achat postérieur
 *        plus cher ne réécrit jamais la marge d'une vente passée.
 * RG-06  Le prix de vente d'une ligne est modifiable (remise, prix négocié) ;
 *        le prix catalogue n'est qu'une proposition.
 * RG-07  Politique de stock négatif (paramétrable) : BLOQUER refuse la vente,
 *        AVERTIR l'accepte et signale. Par défaut AVERTIR — sur le terrain,
 *        la vente ne s'arrête pas parce qu'un carton n'a pas été saisi.
 * RG-08  Une consommation interne sort du stock au CMUP, avec un motif obligatoire.
 *        Elle n'est jamais un chiffre d'affaires : elle pèse sur le résultat.
 * RG-09  Coût matière ≠ prix de revient complet. Le coût matière (comptable) ne
 *        contient que la marchandise. Charbon, emballage et transport sont des
 *        charges. La fiche de coût sert à fixer un prix, pas à calculer le bénéfice.
 * RG-10  Résultat : CA − coût matière = marge brute ; − charges − conso interne
 *        − amortissements = résultat net.
 * RG-11  Amortissement mensuel = montant / durée, compté à partir du mois d'achat.
 * RG-12  Trésorerie = apports + ventes encaissées − achats − dépenses − investissements.
 *        Une vente à crédit n'entre pas en trésorerie tant qu'elle n'est pas encaissée.
 * RG-13  Seuil de rentabilité = charges de la période / taux de marge brute.
 * RG-14  Une journée clôturée est verrouillée : plus aucune vente ne peut y être
 *        rattachée. La réouverture est un acte explicite et tracé.
 * RG-15  Une vente à crédit entre en trésorerie au règlement, pas à la livraison.
 *        Le règlement est un acte distinct, constaté dans « Crédits clients ».
 * RG-16  Chaque ticket porte l'identité de la personne qui l'a saisi. Retirer
 *        l'accès à quelqu'un ne supprime jamais ses ventes.
 * RG-17  Deux rôles : GERANT (tout) et VENDEUR (caisse et lecture du stock).
 *        Le contrôle a lieu dans les Server Actions, pas seulement dans le menu.
 * RG-18  Une vente saisie sans réseau garde son heure réelle et une clé unique.
 *        Rejouée à la reconnexion, elle ne crée jamais de doublon — et elle est
 *        acceptée même si la journée a été clôturée entre-temps, car l'argent a
 *        bien été encaissé. Elle est alors signalée comme saisie hors ligne.
 */

// ─────────────────────────────────────────────────────────── Énumérations

export const CATEGORIES_PRODUIT = ["GRILLADE", "ACCOMPAGNEMENT", "BOISSON", "AUTRE"] as const;
export type CategorieProduit = (typeof CATEGORIES_PRODUIT)[number];

export const LIB_CATEGORIE_PRODUIT: Record<CategorieProduit, string> = {
  GRILLADE: "Grillade",
  ACCOMPAGNEMENT: "Accompagnement",
  BOISSON: "Boisson",
  AUTRE: "Autre",
};

export const UNITES = ["piece", "portion", "bouteille", "kg", "sachet"] as const;
export type Unite = (typeof UNITES)[number];

export const LIB_UNITE: Record<Unite, string> = {
  piece: "pièce",
  portion: "portion",
  bouteille: "bouteille",
  kg: "kg",
  sachet: "sachet",
};

export const TYPES_MOUVEMENT = [
  "ENTREE_ACHAT",
  "SORTIE_VENTE",
  "SORTIE_INTERNE",
  "AJUSTEMENT",
] as const;
export type TypeMouvement = (typeof TYPES_MOUVEMENT)[number];

export const LIB_MOUVEMENT: Record<TypeMouvement, string> = {
  ENTREE_ACHAT: "Entrée (achat)",
  SORTIE_VENTE: "Sortie (vente)",
  SORTIE_INTERNE: "Sortie interne",
  AJUSTEMENT: "Ajustement d'inventaire",
};

export const MODES_PAIEMENT = ["ESPECES", "MOBILE_MONEY", "CREDIT"] as const;
export type ModePaiement = (typeof MODES_PAIEMENT)[number];

export const LIB_PAIEMENT: Record<ModePaiement, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CREDIT: "Crédit client",
};

export const MOTIFS_CONSO = [
  "REPAS_EMPLOYE",
  "REPAS_FAMILLE",
  "DEGUSTATION",
  "OFFERT",
  "PERTE",
  "CASSE",
] as const;
export type MotifConso = (typeof MOTIFS_CONSO)[number];

export const LIB_MOTIF_CONSO: Record<MotifConso, string> = {
  REPAS_EMPLOYE: "Repas employé",
  REPAS_FAMILLE: "Repas famille",
  DEGUSTATION: "Dégustation",
  OFFERT: "Produit offert",
  PERTE: "Perte / invendu",
  CASSE: "Casse",
};

export const CATEGORIES_DEPENSE = [
  "PRODUCTION",
  "MATIERES_ACCESSOIRES",
  "EMBALLAGE",
  "TRANSPORT",
  "TAXES_MAIRIE",
  "SALAIRES",
  "EMPLACEMENT",
  "MARKETING",
  "DIVERS",
] as const;
export type CategorieDepense = (typeof CATEGORIES_DEPENSE)[number];

export const LIB_CATEGORIE_DEPENSE: Record<CategorieDepense, string> = {
  PRODUCTION: "Production (charbon, gaz)",
  MATIERES_ACCESSOIRES: "Matières & accessoires",
  EMBALLAGE: "Emballage",
  TRANSPORT: "Transport",
  TAXES_MAIRIE: "Taxes & mairie",
  SALAIRES: "Salaires & main-d'œuvre",
  EMPLACEMENT: "Emplacement / loyer",
  MARKETING: "Marketing & communication",
  DIVERS: "Divers",
};

export const CATEGORIES_INVESTISSEMENT = [
  "INSTALLATION",
  "MATERIEL",
  "MOBILIER",
  "VEHICULE",
  "AUTRE",
] as const;
export type CategorieInvestissement = (typeof CATEGORIES_INVESTISSEMENT)[number];

export const LIB_CATEGORIE_INVESTISSEMENT: Record<CategorieInvestissement, string> = {
  INSTALLATION: "Installation",
  MATERIEL: "Matériel",
  MOBILIER: "Mobilier",
  VEHICULE: "Véhicule",
  AUTRE: "Autre",
};

export const CONDITIONNEMENTS = ["Carton", "Sac", "Cageot", "Casier", "Unité", "Kg"] as const;

// ─────────────────────────────────────────────────────────── Paramètres

export const CLES_PARAMETRE = {
  POLITIQUE_STOCK: "politique_stock", // BLOQUER | AVERTIR
  NOM_ETABLISSEMENT: "nom_etablissement",
  SLOGAN: "slogan",
} as const;

export const DEFAUTS_PARAMETRE: Record<string, string> = {
  [CLES_PARAMETRE.POLITIQUE_STOCK]: "AVERTIR",
  [CLES_PARAMETRE.NOM_ETABLISSEMENT]: "Kembo BBQ",
  [CLES_PARAMETRE.SLOGAN]: "Elengi oyo esangisaka bato",
};

// ─────────────────────────────────────────────────────────── Statuts de stock

export type StatutStock = "RUPTURE" | "REAPPRO" | "OK" | "NON_SUIVI";

export const LIB_STATUT_STOCK: Record<StatutStock, string> = {
  RUPTURE: "Rupture",
  REAPPRO: "À racheter",
  OK: "En stock",
  NON_SUIVI: "Non suivi",
};

/** RG-13 appliqué au stock : le seuil déclenche l'alerte avant la rupture. */
export function statutStock(params: {
  suiviStock: boolean;
  stock: number;
  seuilAlerte: number;
}): StatutStock {
  if (!params.suiviStock) return "NON_SUIVI";
  if (params.stock <= 0) return "RUPTURE";
  if (params.stock <= params.seuilAlerte) return "REAPPRO";
  return "OK";
}

// ─────────────────────────────────────────────────────────── Calculs purs

/** RG-04 — Coût moyen unitaire pondéré après une entrée. */
export function calculerCMUP(params: {
  stockAvant: number;
  cmupAvant: number;
  quantiteEntree: number;
  montantEntree: number;
}): number {
  const { stockAvant, cmupAvant, quantiteEntree, montantEntree } = params;
  const coutLot = quantiteEntree > 0 ? montantEntree / quantiteEntree : 0;
  if (stockAvant <= 0) return coutLot;
  const quantiteApres = stockAvant + quantiteEntree;
  if (quantiteApres <= 0) return coutLot;
  return (stockAvant * cmupAvant + montantEntree) / quantiteApres;
}

/** RG-02 — Quantité et coût unitaire d'un lot. */
export function calculerLot(params: {
  nbConditionnements: number;
  piecesParConditionnement: number;
  montantTotal: number;
}) {
  const quantiteTotale = params.nbConditionnements * params.piecesParConditionnement;
  const coutUnitaire = quantiteTotale > 0 ? params.montantTotal / quantiteTotale : 0;
  return { quantiteTotale, coutUnitaire };
}

/** RG-10 — Cascade du compte de résultat. */
export function calculerResultat(params: {
  chiffreAffaires: number;
  coutMatiere: number;
  charges: number;
  consommationInterne: number;
  amortissements: number;
}) {
  const margeBrute = params.chiffreAffaires - params.coutMatiere;
  const resultatNet =
    margeBrute - params.charges - params.consommationInterne - params.amortissements;
  const tauxMargeBrute = params.chiffreAffaires ? margeBrute / params.chiffreAffaires : 0;
  const tauxResultat = params.chiffreAffaires ? resultatNet / params.chiffreAffaires : 0;
  return { margeBrute, resultatNet, tauxMargeBrute, tauxResultat };
}

/** RG-13 — Chiffre d'affaires minimum pour couvrir les charges de la période. */
export function calculerSeuilRentabilite(params: {
  charges: number;
  tauxMargeBrute: number;
}): number {
  if (params.tauxMargeBrute <= 0) return 0;
  return params.charges / params.tauxMargeBrute;
}

/** RG-11 — Amortissement mensuel d'un investissement. */
export function amortissementMensuel(montant: number, dureeMois: number): number {
  if (dureeMois <= 0) return 0;
  return montant / dureeMois;
}

/** Numérotation lisible : TK-20260723-0007, LOT-20260718-0002. */
export function numeroSequentiel(prefixe: string, date: Date, rang: number): string {
  const jour = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `${prefixe}-${jour}-${String(rang).padStart(4, "0")}`;
}
