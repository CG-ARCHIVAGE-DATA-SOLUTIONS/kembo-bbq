"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
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
    <div className="flex min-h-dvh">

      {/* ── Panneau gauche : branding ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center gap-8 bg-charbon-800 border-r border-charbon-700 p-12">
        <div className="relative flex h-64 w-64 shrink-0 overflow-hidden rounded-full ring-4 ring-braise/25 shadow-2xl">
          <Image
            src="/icones/android-chrome-512x512.png"
            alt="Kembo BBQ"
            width={256}
            height={256}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="text-center">
          <h1 className="titre-affiche text-5xl text-craie">Kembo BBQ</h1>
          <p className="mt-3 text-base text-cendre">Grillades · Brazzaville</p>
        </div>
      </div>

      {/* ── Panneau droit : formulaire ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">

        {/* Logo compact, visible sur mobile uniquement */}
        <div className="mb-7 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-24 w-24 overflow-hidden rounded-full ring-2 ring-braise/30">
            <Image
              src="/icones/android-chrome-192x192.png"
              alt="Kembo BBQ"
              width={96}
              height={96}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="titre-affiche text-3xl text-craie">Kembo BBQ</h1>
        </div>

        <div className="w-full max-w-sm">
          <p className="mb-5 text-center text-sm text-cendre">
            {compte ? `Code de ${compte.nom}` : "Qui prend le service ?"}
          </p>

          {comptes.length === 0 ? (
            <div className="carte p-5 text-center">
              <p className="text-sm text-cendre">
                Aucun compte n&apos;existe encore. Lancez{" "}
                <span className="chiffre">npm run db:seed</span> pour créer le compte gérant.
              </p>
            </div>
          ) : (
            <>
              {/* Sélection du compte */}
              {comptes.length > 1 && (
                <div className="mb-5 flex flex-col gap-2">
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

              {/* Indicateur PIN */}
              <div className="mb-5 flex justify-center gap-3" aria-live="polite">
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
                <p role="alert" className="mb-4 text-center text-sm text-braise-clair">
                  {erreur}
                </p>
              )}

              {/* Clavier PIN */}
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
                <p className="mt-4 text-center text-xs text-cendre">
                  Touchez votre nom pour activer le clavier.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
