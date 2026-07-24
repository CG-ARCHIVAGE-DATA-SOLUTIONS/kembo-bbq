"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Delete, Flame } from "lucide-react";
import { seConnecter } from "@/app/actions/auth";
import { LIB_ROLE, type Role } from "@/domain/roles";
import { cn } from "@/lib/utils";

export type Compte = { identifiant: string; nom: string; role: Role };

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "effacer"];

export function Connexion({ comptes, suite }: { comptes: Compte[]; suite: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [identifiant, setIdentifiant] = useState(comptes.length === 1 ? comptes[0].identifiant : "");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const compte = comptes.find((c) => c.identifiant === identifiant);

  function taper(touche: string) {
    setErreur(null);
    if (touche === "effacer") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 8) return;
    const suivant = pin + touche;
    setPin(suivant);
    if (suivant.length >= 4 && identifiant) valider(suivant);
  }

  function valider(code: string) {
    demarrer(async () => {
      const reponse = await seConnecter({ identifiant, pin: code });
      if (!reponse.ok) {
        setErreur(reponse.message);
        setPin("");
        return;
      }
      router.replace(suite);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-braise">
          <Flame className="h-7 w-7 text-craie" strokeWidth={2.5} />
        </span>
        <h1 className="titre-affiche text-3xl text-craie">Kembo BBQ</h1>
        <p className="mt-1 text-sm text-cendre">
          {compte ? `Code de ${compte.nom}` : "Qui prend le service ?"}
        </p>
      </div>

      {comptes.length === 0 ? (
        <div className="carte p-5 text-center">
          <p className="text-sm text-cendre">
            Aucun compte n&apos;existe encore. Lancez <span className="chiffre">npm run db:seed</span>{" "}
            pour créer le compte gérant.
          </p>
        </div>
      ) : (
        <>
          {comptes.length > 1 && (
            <div className="flex flex-col gap-2">
              {comptes.map((c) => (
                <button
                  key={c.identifiant}
                  type="button"
                  onClick={() => {
                    setIdentifiant(c.identifiant);
                    setPin("");
                    setErreur(null);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    identifiant === c.identifiant
                      ? "border-flamme bg-charbon-700"
                      : "border-charbon-600 bg-charbon-800 hover:border-cendre",
                  )}
                >
                  <span className="text-sm font-bold text-craie">{c.nom}</span>
                  <span className="text-[11px] uppercase tracking-wide text-cendre">
                    {LIB_ROLE[c.role]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Les points remplacent les chiffres : le code reste privé même en plein service. */}
          <div className="flex justify-center gap-3" aria-live="polite">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 transition-colors",
                  i < pin.length ? "border-flamme bg-flamme" : "border-charbon-500",
                )}
              />
            ))}
          </div>

          {erreur && (
            <p role="alert" className="text-center text-sm text-braise-clair">
              {erreur}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {TOUCHES.map((t, i) =>
              t === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  disabled={enCours || !identifiant}
                  onClick={() => taper(t)}
                  aria-label={t === "effacer" ? "Effacer un chiffre" : t}
                  className={cn(
                    "chiffre flex h-16 items-center justify-center rounded-xl text-2xl font-semibold transition-colors",
                    "bg-charbon-700 text-craie hover:bg-charbon-600 active:bg-charbon-500",
                    "disabled:opacity-40",
                  )}
                >
                  {t === "effacer" ? <Delete className="h-5 w-5" /> : t}
                </button>
              ),
            )}
          </div>

          {!identifiant && (
            <p className="text-center text-xs text-cendre">
              Touchez votre nom pour activer le clavier.
            </p>
          )}
        </>
      )}
    </div>
  );
}
