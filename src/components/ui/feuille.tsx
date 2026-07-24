"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panneau de saisie.
 * Les formulaires ne sont plus empilés au-dessus des listes : on les ouvre
 * quand on en a besoin. Sur téléphone il monte du bas, sous le pouce ;
 * sur écran large c'est une boîte centrée.
 */
export function Feuille({
  titre,
  description,
  declencheur,
  children,
  large = false,
}: {
  titre: string;
  description?: string;
  declencheur: (ouvrir: () => void) => React.ReactNode;
  children: (fermer: () => void) => React.ReactNode;
  large?: boolean;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const panneau = React.useRef<HTMLDivElement>(null);

  const fermer = React.useCallback(() => setOuvert(false), []);

  React.useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", surTouche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le premier champ prend le focus : sur téléphone, le clavier s'ouvre seul.
    panneau.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = overflow;
    };
  }, [ouvert, fermer]);

  return (
    <>
      {declencheur(() => setOuvert(true))}

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Fermer le panneau"
            onClick={fermer}
            className="anim-apparait absolute inset-0 bg-charbon-900/80 backdrop-blur-sm"
          />

          <div
            ref={panneau}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
            className={cn(
              "anim-glisse relative flex max-h-[88dvh] w-full flex-col overflow-hidden",
              "rounded-t-[22px] border border-charbon-600 bg-charbon-800 shadow-2xl",
              "sm:anim-monte sm:rounded-[var(--radius-carte)]",
              large ? "sm:max-w-3xl" : "sm:max-w-xl",
            )}
          >
            {/* Poignée : indique qu'on peut refermer d'un geste vers le bas. */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-charbon-500" />
            </div>

            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 sm:pt-5">
              <div className="min-w-0">
                <h2 className="titre-affiche text-titre text-craie">{titre}</h2>
                {description && (
                  <p className="mt-1 text-menu leading-snug text-cendre">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer"
                className="-mr-1 rounded-lg p-2 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="socle-sur overflow-y-auto px-5 pb-5">{children(fermer)}</div>
          </div>
        </div>
      )}
    </>
  );
}
