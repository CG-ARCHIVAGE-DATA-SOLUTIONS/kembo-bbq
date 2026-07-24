import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ROLES } from "@/domain/roles";
import type { Role } from "@/domain/roles";
export { ROLES, LIB_ROLE, ACCES_PAR_ROLE, peutVoir } from "@/domain/roles";
export type { Role } from "@/domain/roles";

const NOM_COOKIE = "kembo_session";
const DUREE_JOURS = 30;

function secret(): string {
  const valeur = process.env.AUTH_SECRET;
  if (valeur && valeur.length >= 16) return valeur;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET absent ou trop court. Générez-en un : openssl rand -hex 32",
    );
  }
  // En développement uniquement : évite d'avoir à configurer avant le premier lancement.
  return "kembo-developpement-secret-non-securise";
}

/* ─────────────────────────────────────────── Code d'accès */

export function hacherPin(pin: string): string {
  const sel = randomBytes(16).toString("hex");
  const empreinte = scryptSync(pin, sel, 64).toString("hex");
  return `${sel}:${empreinte}`;
}

export function verifierPin(pin: string, stocke: string): boolean {
  const [sel, empreinte] = stocke.split(":");
  if (!sel || !empreinte) return false;
  const candidat = scryptSync(pin, sel, 64);
  const attendu = Buffer.from(empreinte, "hex");
  if (candidat.length !== attendu.length) return false;
  return timingSafeEqual(candidat, attendu);
}

/* ─────────────────────────────────────────── Session */

function signer(charge: string): string {
  return createHmac("sha256", secret()).update(charge).digest("hex");
}

function creerJeton(utilisateurId: string): string {
  const expiration = Date.now() + DUREE_JOURS * 24 * 60 * 60 * 1000;
  const charge = `${utilisateurId}.${expiration}`;
  return `${charge}.${signer(charge)}`;
}

function lireJeton(jeton: string): { utilisateurId: string } | null {
  const [utilisateurId, expiration, signature] = jeton.split(".");
  if (!utilisateurId || !expiration || !signature) return null;

  const attendue = Buffer.from(signer(`${utilisateurId}.${expiration}`));
  const fournie = Buffer.from(signature);
  if (attendue.length !== fournie.length) return null;
  if (!timingSafeEqual(attendue, fournie)) return null;
  if (Number(expiration) < Date.now()) return null;

  return { utilisateurId };
}

export async function ouvrirSession(utilisateurId: string) {
  const magasin = await cookies();
  magasin.set(NOM_COOKIE, creerJeton(utilisateurId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_JOURS * 24 * 60 * 60,
  });
}

export async function fermerSession() {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE);
}

export type Utilisateur = {
  id: string;
  nom: string;
  identifiant: string;
  role: Role;
};

/**
 * Vérification réelle de la session. Le middleware ne fait qu'une redirection
 * de confort ; c'est ici, côté serveur Node, que la signature est contrôlée.
 */
export async function sessionCourante(): Promise<Utilisateur | null> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (!jeton) return null;

  const charge = lireJeton(jeton);
  if (!charge) return null;

  try {
    const utilisateur = await db.utilisateur.findUnique({
      where: { id: charge.utilisateurId },
      select: { id: true, nom: true, identifiant: true, role: true, actif: true },
    });
    if (!utilisateur || !utilisateur.actif) return null;
    return {
      id: utilisateur.id,
      nom: utilisateur.nom,
      identifiant: utilisateur.identifiant,
      role: utilisateur.role as Role,
    };
  } catch {
    return null;
  }
}

export class AccesRefuse extends Error {
  constructor(message = "Vous n'avez pas accès à cette action.") {
    super(message);
  }
}

/** À appeler en tête de toute Server Action sensible. */
export async function exigerRole(roles: readonly Role[]): Promise<Utilisateur> {
  const utilisateur = await sessionCourante();
  if (!utilisateur) throw new AccesRefuse("Votre session a expiré. Reconnectez-vous.");
  if (!roles.includes(utilisateur.role)) {
    throw new AccesRefuse("Cette action est réservée au gérant.");
  }
  return utilisateur;
}

export const exigerGerant = () => exigerRole(["GERANT"]);
export const exigerConnexion = () => exigerRole(ROLES);
