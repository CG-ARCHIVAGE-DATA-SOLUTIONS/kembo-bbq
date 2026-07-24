"use client";

/**
 * File d'attente des ventes saisies sans réseau.
 * Le service tourne en plein air : la connexion tombe, et une vente ne doit
 * jamais être perdue pour autant. Chaque ticket part avec une clé unique, ce
 * qui rend le renvoi sans danger (RG-18).
 */

const BASE = "kembo";
const MAGASIN = "ventes-en-attente";
const VERSION = 1;

export type VenteEnAttente = {
  cle: string;
  creeLe: number;
  charge: {
    lignes: { produitId: string; quantite: number; prixUnitaire?: number }[];
    modePaiement: string;
    remise: number;
    date: string; // ISO — l'heure réelle de la vente, pas celle de l'envoi
    resume: string; // pour l'affichage : « 7× Cuisse, 2× Poisson »
    total: number;
  };
};

function disponible(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(BASE, VERSION);
    requete.onupgradeneeded = () => {
      const base = requete.result;
      if (!base.objectStoreNames.contains(MAGASIN)) {
        base.createObjectStore(MAGASIN, { keyPath: "cle" });
      }
    };
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (magasin: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const base = await ouvrir();
  return new Promise<T>((resoudre, rejeter) => {
    const tx = base.transaction(MAGASIN, mode);
    const requete = operation(tx.objectStore(MAGASIN));
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
    tx.oncomplete = () => base.close();
  });
}

export async function mettreEnAttente(vente: VenteEnAttente): Promise<boolean> {
  if (!disponible()) return false;
  try {
    await transaction("readwrite", (m) => m.put(vente));
    prevenir();
    return true;
  } catch {
    return false;
  }
}

export async function listerAttente(): Promise<VenteEnAttente[]> {
  if (!disponible()) return [];
  try {
    const tout = await transaction<VenteEnAttente[]>("readonly", (m) => m.getAll());
    return tout.sort((a, b) => a.creeLe - b.creeLe);
  } catch {
    return [];
  }
}

export async function retirerDeAttente(cle: string): Promise<void> {
  if (!disponible()) return;
  try {
    await transaction("readwrite", (m) => m.delete(cle));
    prevenir();
  } catch {
    /* rien à faire : la vente restera en file jusqu'au prochain essai */
  }
}

/** Permet aux composants d'écran de se rafraîchir quand la file change. */
export const EVENEMENT_FILE = "kembo:file-attente";
function prevenir() {
  window.dispatchEvent(new CustomEvent(EVENEMENT_FILE));
}

export function nouvelleCle(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Une erreur réseau se reconnaît à ce qu'elle n'est pas une erreur métier. */
export function estPanneReseau(erreur: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (erreur instanceof TypeError) return true;
  return erreur instanceof Error && /fetch|network|réseau|Load failed/i.test(erreur.message);
}
