/**
 * Le franc CFA ne circule pas en centimes : tous les montants sont des entiers.
 * Les coûts unitaires (CMUP) restent en flottant — un carton de 21 cuisses à
 * 11 000 FCFA donne 523,81 FCFA la pièce — et ne sont arrondis qu'à l'affichage.
 */

export const DEVISE = "FCFA";

export function formatFCFA(montant: number, options?: { signe?: boolean; compact?: boolean }): string {
  const arrondi = Math.round(montant);
  const signe = options?.signe && arrondi > 0 ? "+" : "";
  if (options?.compact && Math.abs(arrondi) >= 1_000_000) {
    return `${signe}${(arrondi / 1_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (options?.compact && Math.abs(arrondi) >= 10_000) {
    return `${signe}${Math.round(arrondi / 1000)} k`;
  }
  return `${signe}${new Intl.NumberFormat("fr-FR").format(arrondi)}`;
}

export function formatQuantite(q: number): string {
  const arrondi = Math.round(q * 100) / 100;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(arrondi);
}

export function formatPourcent(ratio: number, decimales = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimales).replace(".", ",")} %`;
}

/** Division protégée : un taux de marge sur un CA nul vaut 0, pas l'infini. */
export function ratio(numerateur: number, denominateur: number): number {
  if (!denominateur) return 0;
  const r = numerateur / denominateur;
  return Number.isFinite(r) ? r : 0;
}

export const arrondiFCFA = (n: number) => Math.round(n);
