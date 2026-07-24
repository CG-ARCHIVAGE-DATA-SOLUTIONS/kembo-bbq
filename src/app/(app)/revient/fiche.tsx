"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerFicheCout } from "@/app/actions/revient";
import { formatFCFA, formatPourcent, ratio } from "@/lib/money";
import { Bouton } from "@/components/ui/primitives";
import { useAnnonce } from "@/components/ui/annonces";
import { cn } from "@/lib/utils";

export type FicheProduit = {
  produitId: string;
  nom: string;
  prixVente: number;
  cmup: number;
  epices: number;
  charbon: number;
  huile: number;
  condiments: number;
  emballage: number;
  mainDoeuvre: number;
  autres: number;
};

const POSTES = [
  ["epices", "Épices"],
  ["charbon", "Charbon"],
  ["huile", "Huile"],
  ["condiments", "Condiments"],
  ["emballage", "Emballage"],
  ["mainDoeuvre", "Main-d'œuvre"],
  ["autres", "Autres"],
] as const;

export function Fiche({ initiale }: { initiale: FicheProduit }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  const [fiche, setFiche] = useState(initiale);
  const [enregistre, setEnregistre] = useState(false);

  const coutAjoute = POSTES.reduce((s, [cle]) => s + (fiche[cle] || 0), 0);
  const coutTotal = fiche.cmup + coutAjoute;
  const marge = fiche.prixVente - coutTotal;
  const taux = ratio(marge, fiche.prixVente);

  function enregistrer() {
    demarrer(async () => {
      const reponse = await enregistrerFicheCout({
        produitId: fiche.produitId,
        epices: fiche.epices,
        charbon: fiche.charbon,
        huile: fiche.huile,
        condiments: fiche.condiments,
        emballage: fiche.emballage,
        mainDoeuvre: fiche.mainDoeuvre,
        autres: fiche.autres,
      });
      annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
      if (reponse.ok) {
        setEnregistre(true);
        setTimeout(() => setEnregistre(false), 2000);
        router.refresh();
      }
    });
  }

  return (
    <div className={cn("carte p-5", marge < 0 && "border-braise/50")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Fiche de coût</p>
          <h3 className="titre-affiche text-xl text-craie">{fiche.nom}</h3>
        </div>
        <div className="text-right">
          <p className="eyebrow mb-1">Marge réelle par portion</p>
          <p className={cn("chiffre text-2xl", marge >= 0 ? "text-vert" : "text-braise-clair")}>
            {formatFCFA(marge, { signe: true })}
            <span className="ml-2 text-sm text-cendre">{formatPourcent(taux, 0)}</span>
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-charbon-600 bg-charbon-900 px-3 py-2.5">
        <span className="text-sm text-cendre">Matière (coût moyen d&apos;achat)</span>
        <span className="chiffre text-sm text-craie">{formatFCFA(fiche.cmup)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {POSTES.map(([cle, libelle]) => (
          <label key={cle} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-cendre">{libelle}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={10}
              value={fiche[cle]}
              onChange={(e) => setFiche({ ...fiche, [cle]: Number(e.target.value) })}
              className="chiffre h-10 rounded-lg border border-charbon-500 bg-charbon-900 px-2 text-right text-sm text-craie focus:border-flamme focus:outline-none"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-charbon-700 pt-4">
        <div className="flex gap-6 text-sm">
          <span className="text-cendre">
            Coût de revient{" "}
            <span className="chiffre ml-1 text-craie">{formatFCFA(coutTotal)}</span>
          </span>
          <span className="text-cendre">
            Prix de vente{" "}
            <span className="chiffre ml-1 text-craie">{formatFCFA(fiche.prixVente)}</span>
          </span>
        </div>
        <Bouton taille="sm" variante="secondaire" onClick={enregistrer} disabled={enCours}>
          {enCours ? "…" : enregistre ? "Enregistré" : "Enregistrer"}
        </Bouton>
      </div>

      {marge < 0 && (
        <p className="mt-3 text-xs text-braise-clair">
          À ce prix, chaque portion vendue vous coûte de l&apos;argent. Il faut soit remonter le
          prix, soit trouver un fournisseur moins cher, soit réduire un poste ci-dessus.
        </p>
      )}
    </div>
  );
}
