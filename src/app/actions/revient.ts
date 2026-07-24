"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

const schema = z.object({
  produitId: z.string().min(1),
  epices: z.coerce.number().int().min(0).default(0),
  charbon: z.coerce.number().int().min(0).default(0),
  huile: z.coerce.number().int().min(0).default(0),
  condiments: z.coerce.number().int().min(0).default(0),
  emballage: z.coerce.number().int().min(0).default(0),
  mainDoeuvre: z.coerce.number().int().min(0).default(0),
  autres: z.coerce.number().int().min(0).default(0),
});

/** RG-09 — Fiche de coût complet : outil de décision de prix, pas de comptabilité. */
export async function enregistrerFicheCout(donnees: unknown): Promise<Reponse> {
  try {
    await exigerGerant();
    const { produitId, ...couts } = schema.parse(donnees);
    await db.ficheCout.upsert({
      where: { produitId },
      create: { produitId, ...couts },
      update: couts,
    });
    revalidatePath("/revient");
    return { ok: true, message: "Fiche de coût enregistrée." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.errors[0]?.message ?? "Saisie invalide." };
    return echec(e);
  }
}
