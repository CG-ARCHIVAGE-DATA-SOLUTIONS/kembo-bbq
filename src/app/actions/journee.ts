"use server";

import { revalidatePath } from "next/cache";
import { cloturerJournee, rouvrirJournee } from "@/domain/journee";
import { journeeCommerciale } from "@/lib/dates";
import { exigerGerant } from "@/domain/auth";
import { echec, type Reponse } from "./types";

/** RG-14 — Clôture : la journée devient un fait comptable, plus une saisie. */
export async function cloturer(dateISO: string, note?: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await cloturerJournee(journeeCommerciale(new Date(dateISO)), note);
    revalidatePath("/rapports");
    revalidatePath("/caisse");
    revalidatePath("/");
    return { ok: true, message: "Journée clôturée. Les ventes de cette date sont verrouillées." };
  } catch (e) {
    return echec(e);
  }
}

export async function rouvrir(dateISO: string): Promise<Reponse> {
  try {
    await exigerGerant();
    await rouvrirJournee(journeeCommerciale(new Date(dateISO)));
    revalidatePath("/rapports");
    revalidatePath("/caisse");
    return { ok: true, message: "Journée rouverte : vous pouvez de nouveau saisir des ventes." };
  } catch (e) {
    return echec(e);
  }
}
