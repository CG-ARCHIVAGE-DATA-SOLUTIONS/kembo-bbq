"use client";

import * as React from "react";
import { Check, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Retours d'action centralisés.
 * Avant, chaque formulaire affichait son propre message sous ses champs — sur
 * téléphone, il tombait souvent hors de l'écran après un appui. Les annonces
 * apparaissent maintenant au même endroit, au-dessus de la barre de navigation.
 */

export type Ton = "ok" | "erreur" | "attente";

type Annonce = { id: number; ton: Ton; texte: string };

const Contexte = React.createContext<((ton: Ton, texte: string) => void) | null>(null);

export function useAnnonce() {
  const annoncer = React.useContext(Contexte);
  if (!annoncer) throw new Error("useAnnonce doit être utilisé dans <Annonces>.");
  return annoncer;
}

const ICONES: Record<Ton, React.ComponentType<{ className?: string }>> = {
  ok: Check,
  erreur: AlertTriangle,
  attente: Info,
};

const STYLES: Record<Ton, string> = {
  ok: "border-vert/45 bg-[#0f2018] text-vert",
  erreur: "border-braise/45 bg-[#1f1012] text-braise-clair",
  attente: "border-flamme/45 bg-[#1f1a08] text-flamme",
};

export function Annonces({ children }: { children: React.ReactNode }) {
  const [annonces, setAnnonces] = React.useState<Annonce[]>([]);
  const compteur = React.useRef(0);

  const annoncer = React.useCallback((ton: Ton, texte: string) => {
    const id = ++compteur.current;
    setAnnonces((liste) => [...liste.slice(-2), { id, ton, texte }]);
    // Les erreurs restent plus longtemps : il y a quelque chose à corriger.
    const duree = ton === "erreur" ? 7000 : 4000;
    setTimeout(() => setAnnonces((liste) => liste.filter((a) => a.id !== id)), duree);
  }, []);

  const fermer = (id: number) => setAnnonces((liste) => liste.filter((a) => a.id !== id));

  return (
    <Contexte.Provider value={annoncer}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4",
          "bottom-[calc(var(--hauteur-barre)+env(safe-area-inset-bottom,0px)+0.75rem)]",
          "lg:bottom-6 lg:right-6 lg:left-auto lg:items-end lg:px-0",
        )}
      >
        {annonces.map((a) => {
          const Icone = ICONES[a.ton];
          return (
            <div
              key={a.id}
              role={a.ton === "erreur" ? "alert" : "status"}
              className={cn(
                "anim-monte pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[var(--radius-carte)] border px-4 py-3 shadow-lg backdrop-blur",
                STYLES[a.ton],
              )}
            >
              <Icone className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-menu font-medium leading-snug">{a.texte}</p>
              <button
                type="button"
                onClick={() => fermer(a.id)}
                aria-label="Fermer"
                className="-mr-1 -mt-1 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Contexte.Provider>
  );
}
