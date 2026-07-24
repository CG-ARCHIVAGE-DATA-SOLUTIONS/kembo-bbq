import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Journée commerciale : Kembo BBQ ouvre à 17h et ferme après minuit.
 * Une vente enregistrée à 00h40 appartient à la soirée de la veille.
 * HEURE_BASCULE fixe la frontière (4h du matin).
 */
export const HEURE_BASCULE = 4;

export function journeeCommerciale(instant: Date = new Date()): Date {
  const d = new Date(instant);
  if (d.getHours() < HEURE_BASCULE) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function debutJour(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function finJour(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const debutMois = (d: Date) => startOfMonth(d);
export const finMois = (d: Date) => endOfMonth(d);
export const debutSemaine = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const finSemaine = (d: Date) => endOfWeek(d, { weekStartsOn: 1 });

export const formatDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: fr });
export const formatDateLongue = (d: Date) => format(d, "EEEE d MMMM yyyy", { locale: fr });
export const formatHeure = (d: Date) => format(d, "HH:mm", { locale: fr });
export const formatMois = (d: Date) => format(d, "MMMM yyyy", { locale: fr });
export const formatJourCourt = (d: Date) => format(d, "EEE d", { locale: fr });

/** Les N derniers jours commerciaux, du plus ancien au plus récent. */
export function derniersJours(n: number, reference: Date = new Date()): Date[] {
  const base = journeeCommerciale(reference);
  return Array.from({ length: n }, (_, i) => debutJour(subDays(base, n - 1 - i)));
}

export function cleJour(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
