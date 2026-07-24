import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { journeeCommerciale } from "@/lib/dates";

type Tx = Prisma.TransactionClient;

/**
 * RG-14 — Toute vente appartient à une journée commerciale. La journée est
 * ouverte automatiquement à la première vente : personne n'a à penser à
 * « démarrer le service » avant de servir un client.
 */
export async function ouvrirJournee(tx: Tx | typeof db, instant: Date = new Date()) {
  const date = journeeCommerciale(instant);
  const existante = await tx.journee.findUnique({ where: { date } });
  if (existante) return existante;
  return tx.journee.create({ data: { date } });
}

export async function journeeDuJour(instant: Date = new Date()) {
  return db.journee.findUnique({ where: { date: journeeCommerciale(instant) } });
}

export async function cloturerJournee(date: Date, note?: string) {
  const journee = await db.journee.findUnique({ where: { date } });
  if (!journee) throw new Error("Aucune journée à clôturer pour cette date.");
  if (journee.statut === "CLOTUREE") throw new Error("Cette journée est déjà clôturée.");
  return db.journee.update({
    where: { id: journee.id },
    data: { statut: "CLOTUREE", clotureAt: new Date(), note },
  });
}

export async function rouvrirJournee(date: Date) {
  const journee = await db.journee.findUnique({ where: { date } });
  if (!journee) throw new Error("Journée introuvable.");
  return db.journee.update({
    where: { id: journee.id },
    data: { statut: "OUVERTE", clotureAt: null },
  });
}
