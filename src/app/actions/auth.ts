"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ouvrirSession,
  fermerSession,
  verifierPin,
  hacherPin,
  exigerGerant,
  ROLES,
} from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schemaConnexion = z.object({
  identifiant: z.string().trim().min(1, "Choisissez qui vous êtes.").toLowerCase(),
  pin: z.string().regex(/^\d{4,8}$/, "Le code fait entre 4 et 8 chiffres."),
});

export async function seConnecter(donnees: unknown): Promise<Reponse> {
  try {
    const { identifiant, pin } = schemaConnexion.parse(donnees);
    const utilisateur = await db.utilisateur.findUnique({ where: { identifiant } });

    // Même message dans les deux cas : on n'indique pas si le compte existe.
    const refus = { ok: false as const, message: "Code incorrect." };
    if (!utilisateur || !utilisateur.actif) return refus;
    if (!verifierPin(pin, utilisateur.codePin)) return refus;

    await db.utilisateur.update({
      where: { id: utilisateur.id },
      data: { dernierAcces: new Date() },
    });
    await ouvrirSession(utilisateur.id);
    return { ok: true, message: `Bonjour ${utilisateur.nom}.` };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function seDeconnecter() {
  await fermerSession();
  redirect("/connexion");
}

const schemaUtilisateur = z.object({
  nom: z.string().trim().min(2, "Indiquez le nom de la personne."),
  identifiant: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,20}$/, "Identifiant : lettres et chiffres, sans espace."),
  pin: z.string().regex(/^\d{4,8}$/, "Le code fait entre 4 et 8 chiffres."),
  role: z.enum(ROLES),
});

export async function creerUtilisateur(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const { nom, identifiant, pin, role } = schemaUtilisateur.parse(donnees);
    if (await db.utilisateur.findUnique({ where: { identifiant } })) {
      return { ok: false, message: `L'identifiant « ${identifiant} » est déjà pris.` };
    }
    await db.utilisateur.create({
      data: { nom, identifiant, role, codePin: hacherPin(pin) },
    });
    return { ok: true, message: `${nom} peut maintenant se connecter.` };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function changerCode(id: string, pin: string): Promise<Reponse> {
  try {
    await exigerGerant();
    const valide = z.string().regex(/^\d{4,8}$/, "Le code fait entre 4 et 8 chiffres.").parse(pin);
    await db.utilisateur.update({ where: { id }, data: { codePin: hacherPin(valide) } });
    return { ok: true, message: "Code modifié." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Code invalide." };
    return echec(e);
  }
}

export async function modifierUtilisateur(id: string, donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const { nom, role } = z.object({
      nom: z.string().trim().min(2, "Indiquez le nom de la personne."),
      role: z.enum(ROLES),
    }).parse(donnees);
    await db.utilisateur.update({ where: { id }, data: { nom, role } });
    revalidatePath("/equipe");
    return { ok: true, message: "Profil mis à jour." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}

export async function basculerUtilisateur(id: string): Promise<Reponse> {
  try {
    const gerant = await exigerGerant();
    if (gerant.id === id) {
      return { ok: false, message: "Vous ne pouvez pas désactiver votre propre compte." };
    }
    const u = await db.utilisateur.findUniqueOrThrow({ where: { id } });
    await db.utilisateur.update({ where: { id }, data: { actif: !u.actif } });
    return { ok: true, message: u.actif ? `${u.nom} n'a plus accès.` : `${u.nom} a de nouveau accès.` };
  } catch (e) {
    return echec(e);
  }
}
