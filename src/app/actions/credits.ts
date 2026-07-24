"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigerConnexion } from "@/domain/auth";
import { formatFCFA } from "@/lib/money";
import { echec, type Reponse } from "./types";

/**
 * RG-12 (suite) — Une vente à crédit compte dans le chiffre d'affaires dès la
 * livraison, mais n'entre en trésorerie qu'une fois réglée. C'est ici que le
 * règlement est constaté.
 */
export async function encaisserCredit(id: string): Promise<Reponse> {
  try {
    await exigerConnexion();
    const vente = await db.vente.findUnique({ where: { id } });
    if (!vente) return { ok: false, message: "Ticket introuvable." };
    if (vente.encaisse) return { ok: false, message: "Ce ticket est déjà réglé." };

    await db.vente.update({ where: { id }, data: { encaisse: true } });
    revalidatePath("/credits");
    revalidatePath("/rapports");
    revalidatePath("/");
    return {
      ok: true,
      message: `${formatFCFA(vente.total)} FCFA encaissés sur le ticket ${vente.numero}.`,
    };
  } catch (e) {
    return echec(e);
  }
}

const schemaClient = z.object({
  id: z.string().min(1),
  client: z.string().trim().max(60),
});

export async function nommerClient(donnees: unknown): Promise<Reponse> {
  try {
    await exigerConnexion();
    const { id, client } = schemaClient.parse(donnees);
    await db.vente.update({ where: { id }, data: { client: client || null } });
    revalidatePath("/credits");
    return { ok: true, message: "Client enregistré." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}
