"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { validerDepense, supprimerDepense } from "@/app/actions/depenses";
import {
  CATEGORIES_DEPENSE,
  LIB_CATEGORIE_DEPENSE,
  MODES_PAIEMENT,
  LIB_PAIEMENT,
  type CategorieDepense,
  type ModePaiement,
} from "@/domain/rules";
import { Bouton, Champ, Selecteur } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";

export function FormulaireDepense() {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState("");
  const [categorie, setCategorie] = useState<CategorieDepense>("PRODUCTION");
  const [montant, setMontant] = useState(0);
  const [modePaiement, setModePaiement] = useState<ModePaiement>("ESPECES");

  return (
    <Feuille
      titre="Nouvelle dépense"
      description="Charbon, emballages et transport se saisissent ici, pas dans le coût des produits : c'est ce qui évite de compter deux fois la même dépense."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <Plus className="h-4 w-4" /> Ajouter une dépense
        </Bouton>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Champ
              label="Désignation"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Charbon, taxi marché, taxe mairie…"
            />
            <Selecteur
              label="Catégorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieDepense)}
              options={CATEGORIES_DEPENSE.map((c) => ({
                valeur: c,
                libelle: LIB_CATEGORIE_DEPENSE[c],
              }))}
            />
            <Champ
              label="Montant"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              suffixe="FCFA"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value))}
            />
            <Selecteur
              label="Payé en"
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
              options={MODES_PAIEMENT.map((m) => ({ valeur: m, libelle: LIB_PAIEMENT[m] }))}
            />
          </div>

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await validerDepense({
                  date: new Date(date),
                  libelle,
                  categorie,
                  montant,
                  modePaiement,
                });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setLibelle("");
                  setMontant(0);
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer la dépense"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function BoutonSupprimerDepense({ id }: { id: string }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const reponse = await supprimerDepense(id);
          annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
          router.refresh();
        })
      }
      className="text-micro font-bold uppercase tracking-wide text-cendre transition-colors hover:text-braise-clair disabled:opacity-50"
    >
      Supprimer
    </button>
  );
}
