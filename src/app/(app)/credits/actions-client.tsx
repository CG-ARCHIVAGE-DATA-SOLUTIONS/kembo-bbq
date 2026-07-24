"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { encaisserCredit, nommerClient } from "@/app/actions/credits";
import { Bouton } from "@/components/ui/primitives";

export function BoutonEncaisser({ id, montant }: { id: string; montant: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-2">
      {erreur && <span className="text-xs text-braise-clair">{erreur}</span>}
      <Bouton
        taille="sm"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const reponse = await encaisserCredit(id);
            setErreur(reponse.ok ? null : reponse.message);
            router.refresh();
          })
        }
      >
        {enCours ? "…" : `Encaisser ${montant}`}
      </Bouton>
    </div>
  );
}

export function ChampClient({ id, valeur }: { id: string; valeur: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [texte, setTexte] = useState(valeur);

  return (
    <input
      value={texte}
      disabled={enCours}
      placeholder="Nom du client"
      aria-label="Nom du client"
      onChange={(e) => setTexte(e.target.value)}
      onBlur={() => {
        if (texte === valeur) return;
        demarrer(async () => {
          await nommerClient({ id, client: texte });
          router.refresh();
        });
      }}
      className="h-9 w-44 rounded-lg border border-charbon-500 bg-charbon-900 px-2 text-sm text-craie placeholder:text-charbon-500 focus:border-flamme focus:outline-none"
    />
  );
}
