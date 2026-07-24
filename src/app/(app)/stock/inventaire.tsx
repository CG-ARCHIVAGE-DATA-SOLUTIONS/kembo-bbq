"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validerInventaire } from "@/app/actions/stock";
import { cn } from "@/lib/utils";

/** Saisie d'inventaire au fil de l'eau : un champ par ligne, validation immédiate. */
export function ChampInventaire({
  produitId,
  stockTheorique,
}: {
  produitId: string;
  stockTheorique: number;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [valeur, setValeur] = useState("");
  const [etat, setEtat] = useState<"vide" | "ok" | "erreur">("vide");

  function envoyer() {
    if (valeur === "") return;
    demarrer(async () => {
      const reponse = await validerInventaire({
        produitId,
        quantiteComptee: Number(valeur),
        note: `Comptage saisi depuis la page Stock (théorique ${stockTheorique}).`,
      });
      setEtat(reponse.ok ? "ok" : "erreur");
      if (reponse.ok) {
        setValeur("");
        router.refresh();
        setTimeout(() => setEtat("vide"), 2500);
      }
    });
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      step="any"
      min={0}
      value={valeur}
      disabled={enCours}
      placeholder="compter"
      aria-label="Quantité comptée"
      onChange={(e) => setValeur(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && envoyer()}
      onBlur={envoyer}
      className={cn(
        "chiffre h-9 w-24 rounded-lg border bg-charbon-900 px-2 text-right text-sm text-craie",
        "placeholder:font-sans placeholder:text-xs placeholder:text-charbon-500 focus:outline-none",
        etat === "ok"
          ? "border-vert"
          : etat === "erreur"
            ? "border-braise"
            : "border-charbon-500 focus:border-flamme",
      )}
    />
  );
}
