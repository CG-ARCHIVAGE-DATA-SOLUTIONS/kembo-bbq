"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { creerProduit, basculerActivation } from "@/app/actions/produits";
import {
  CATEGORIES_PRODUIT,
  LIB_CATEGORIE_PRODUIT,
  UNITES,
  LIB_UNITE,
  type CategorieProduit,
  type Unite,
} from "@/domain/rules";
import { Bouton, Champ, Selecteur, Bascule } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";
import { cn } from "@/lib/utils";

export function FormulaireProduit() {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<CategorieProduit>("GRILLADE");
  const [unite, setUnite] = useState<Unite>("piece");
  const [prixVente, setPrix] = useState(1000);
  const [suiviStock, setSuivi] = useState(true);
  const [seuilAlerte, setSeuil] = useState(10);

  return (
    <Feuille
      titre="Ajouter à la carte"
      description="Chaque produit devient une touche en caisse."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <Plus className="h-4 w-4" /> Nouveau produit
        </Bouton>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CUI-M"
              aide="Court et parlant : il sert de repère."
            />
            <Champ
              label="Nom affiché"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Cuisse de poulet (moyenne)"
            />
            <Selecteur
              label="Catégorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieProduit)}
              options={CATEGORIES_PRODUIT.map((c) => ({
                valeur: c,
                libelle: LIB_CATEGORIE_PRODUIT[c],
              }))}
            />
            <Selecteur
              label="Unité"
              value={unite}
              onChange={(e) => setUnite(e.target.value as Unite)}
              options={UNITES.map((u) => ({ valeur: u, libelle: LIB_UNITE[u] }))}
            />
            <Champ
              label="Prix de vente"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              suffixe="FCFA"
              value={prixVente}
              onChange={(e) => setPrix(Number(e.target.value))}
            />
            <Champ
              label="Seuil d'alerte"
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={seuilAlerte}
              onChange={(e) => setSeuil(Number(e.target.value))}
              aide="En dessous, le produit passe en « à racheter »."
            />
          </div>

          <Bascule
            label="Suivre le stock"
            aide="À décocher pour une sauce préparée sur place, qui ne s'achète pas en lot."
            checked={suiviStock}
            onChange={(e) => setSuivi(e.target.checked)}
          />

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await creerProduit({
                  code,
                  nom,
                  categorie,
                  unite,
                  prixVente,
                  suiviStock,
                  seuilAlerte,
                });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setCode("");
                  setNom("");
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Mettre en vente"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function BoutonActivation({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const reponse = await basculerActivation(id);
          annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
          router.refresh();
        })
      }
      className={cn(
        "text-micro font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
        actif ? "text-cendre hover:text-braise-clair" : "text-vert hover:text-craie",
      )}
    >
      {actif ? "Retirer de la carte" : "Remettre en vente"}
    </button>
  );
}
