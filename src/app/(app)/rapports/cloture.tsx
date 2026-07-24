"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cloturer, rouvrir } from "@/app/actions/journee";
import { Bouton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function BoutonCloture({
  dateISO,
  cloturee,
}: {
  dateISO: string;
  cloturee: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-2">
      {erreur && <span className="text-xs text-braise-clair">{erreur}</span>}
      <Bouton
        taille="sm"
        variante={cloturee ? "fantome" : "secondaire"}
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const reponse = cloturee ? await rouvrir(dateISO) : await cloturer(dateISO);
            setErreur(reponse.ok ? null : reponse.message);
            router.refresh();
          })
        }
        className={cn(cloturee && "text-cendre")}
      >
        {enCours ? "…" : cloturee ? "Rouvrir" : "Clôturer"}
      </Bouton>
    </div>
  );
}
