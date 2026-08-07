"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, Wallet } from "lucide-react";
import {
  validerInvestissement,
  modifierInvestissement,
  supprimerInvestissement,
  validerApport,
  modifierApport,
  supprimerApport,
} from "@/app/actions/patrimoine";
import {
  CATEGORIES_INVESTISSEMENT,
  LIB_CATEGORIE_INVESTISSEMENT,
  amortissementMensuel,
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

type InvestissementProps = {
  id: string;
  date: Date;
  libelle: string;
  categorie: string;
  montant: number;
  dureeAmortissementMois: number;
};

export function GestionInvestissement({ investissement }: { investissement: InvestissementProps }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [date, setDate] = useState(() =>
    new Date(investissement.date).toISOString().slice(0, 10),
  );
  const [libelle, setLibelle] = useState(investissement.libelle);
  const [categorie, setCategorie] = useState<CategorieInvestissement>(
    investissement.categorie as CategorieInvestissement,
  );
  const [montant, setMontant] = useState(investissement.montant);
  const [duree, setDuree] = useState(investissement.dureeAmortissementMois);

  const mensuel = duree > 0 ? montant / duree : 0;

  return (
    <Feuille
      titre={investissement.libelle}
      declencheur={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier ${investissement.libelle}`}
          className="rounded-lg p-2 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-5">
          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Détail</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Champ
                label="Désignation"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
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
              />
            </div>

            <div className="mt-3 flex items-center justify-between rounded-[var(--radius-carte)] border border-charbon-600 bg-charbon-900 p-3">
              <span className="text-menu text-cendre">Coût mensuel</span>
              <span className="chiffre text-menu text-flamme">{formatFCFA(mensuel)}</span>
            </div>

            <Bouton
              taille="sm"
              variante="secondaire"
              className="mt-3"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await modifierInvestissement(investissement.id, {
                    date: new Date(date),
                    libelle,
                    categorie,
                    montant,
                    dureeAmortissementMois: duree,
                  });
                  annoncer(r.ok ? "ok" : "erreur", r.message);
                  if (r.ok) { fermer(); router.refresh(); }
                })
              }
            >
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Bouton>
          </section>

          <hr className="border-charbon-700" />

          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Danger</p>
            <Bouton
              variante="danger"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await supprimerInvestissement(investissement.id);
                  annoncer(r.ok ? "ok" : "erreur", r.message);
                  if (r.ok) { fermer(); router.refresh(); }
                })
              }
            >
              Supprimer cet investissement
            </Bouton>
          </section>
        </div>
      )}
    </Feuille>
  );
}

type ApportProps = { id: string; date: Date; libelle: string; montant: number };

export function GestionApport({ apport }: { apport: ApportProps }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [date, setDate] = useState(() => new Date(apport.date).toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState(apport.libelle);
  const [montant, setMontant] = useState(apport.montant);

  return (
    <Feuille
      titre={apport.libelle}
      declencheur={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Modifier ${apport.libelle}`}
          className="rounded-lg p-2 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-5">
          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Détail</p>
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
              taille="sm"
              variante="secondaire"
              className="mt-3"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await modifierApport(apport.id, {
                    date: new Date(date),
                    libelle,
                    montant,
                  });
                  annoncer(r.ok ? "ok" : "erreur", r.message);
                  if (r.ok) { fermer(); router.refresh(); }
                })
              }
            >
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Bouton>
          </section>

          <hr className="border-charbon-700" />

          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Danger</p>
            <Bouton
              variante="danger"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await supprimerApport(apport.id);
                  annoncer(r.ok ? "ok" : "erreur", r.message);
                  if (r.ok) { fermer(); router.refresh(); }
                })
              }
            >
              Supprimer cet apport
            </Bouton>
          </section>
        </div>
      )}
    </Feuille>
  );
}
