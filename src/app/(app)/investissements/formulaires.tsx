"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import {
  validerInvestissement,
  validerApport,
  supprimerInvestissement,
  supprimerApport,
} from "@/app/actions/patrimoine";
import {
  CATEGORIES_INVESTISSEMENT,
  LIB_CATEGORIE_INVESTISSEMENT,
  type CategorieInvestissement,
} from "@/domain/rules";
import { formatFCFA } from "@/lib/money";
import { Bouton, Champ, Selecteur } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";

export function FormulaireInvestissement() {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState("");
  const [categorie, setCategorie] = useState<CategorieInvestissement>("MATERIEL");
  const [montant, setMontant] = useState(0);
  const [duree, setDuree] = useState(24);

  const mensuel = duree > 0 ? montant / duree : 0;

  return (
    <Feuille
      titre="Nouvel investissement"
      description="Le matériel ne se compte pas comme une dépense du jour : son coût est étalé sur sa durée de vie."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <Plus className="h-4 w-4" /> Ajouter du matériel
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
              placeholder="Chapiteau, barbecue, glacière…"
            />
            <Selecteur
              label="Catégorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieInvestissement)}
              options={CATEGORIES_INVESTISSEMENT.map((c) => ({
                valeur: c,
                libelle: LIB_CATEGORIE_INVESTISSEMENT[c],
              }))}
            />
            <Champ
              label="Montant"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              suffixe="FCFA"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value))}
            />
            <Champ
              label="Durée de vie"
              type="number"
              inputMode="numeric"
              min={1}
              suffixe="mois"
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              aide="Combien de temps ce matériel doit tenir."
            />
          </div>

          <div className="flex items-center justify-between rounded-[var(--radius-carte)] border border-charbon-600 bg-charbon-900 p-4">
            <span className="text-menu text-cendre">Coût mensuel réel</span>
            <span className="chiffre text-nombre text-flamme">{formatFCFA(mensuel)}</span>
          </div>

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await validerInvestissement({
                  date: new Date(date),
                  libelle,
                  categorie,
                  montant,
                  dureeAmortissementMois: duree,
                  financement: "FONDS_PROPRES",
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
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function FormulaireApport() {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState("Apport de départ");
  const [montant, setMontant] = useState(0);

  return (
    <Feuille
      titre="Apport"
      description="Argent injecté dans l'activité. Il entre directement en caisse."
      declencheur={(ouvrir) => (
        <Bouton variante="secondaire" onClick={ouvrir}>
          <Wallet className="h-4 w-4" /> Enregistrer un apport
        </Bouton>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Champ label="Origine" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
            <Champ
              label="Montant"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              suffixe="FCFA"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value))}
            />
          </div>
          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await validerApport({ date: new Date(date), libelle, montant });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setMontant(0);
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer l'apport"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function BoutonSupprimer({ id, type }: { id: string; type: "investissement" | "apport" }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const reponse =
            type === "investissement"
              ? await supprimerInvestissement(id)
              : await supprimerApport(id);
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
