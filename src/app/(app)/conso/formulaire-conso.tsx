"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { validerConsommation, supprimerConsommation } from "@/app/actions/conso";
import { MOTIFS_CONSO, LIB_MOTIF_CONSO, type MotifConso } from "@/domain/rules";
import { formatFCFA } from "@/lib/money";
import { Bouton, Champ, Selecteur } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";

type Option = { id: string; nom: string; cmup: number; prixVente: number };

export function FormulaireConso({ produits }: { produits: Option[] }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const [quantite, setQuantite] = useState(1);
  const [motif, setMotif] = useState<MotifConso>("REPAS_EMPLOYE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const produit = produits.find((p) => p.id === produitId);
  const cout = (produit?.cmup ?? 0) * quantite;
  const manque = (produit?.prixVente ?? 0) * quantite;

  if (produits.length === 0) {
    return (
      <Bouton variante="secondaire" disabled>
        Aucun produit suivi en stock
      </Bouton>
    );
  }

  return (
    <Feuille
      titre="Enregistrer une sortie"
      description="Repas du personnel, produit offert, perte : tout ce qui quitte le stock sans être vendu."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <Plus className="h-4 w-4" /> Nouvelle sortie
        </Bouton>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecteur
              label="Produit"
              value={produitId}
              onChange={(e) => setProduitId(e.target.value)}
              options={produits.map((p) => ({ valeur: p.id, libelle: p.nom }))}
            />
            <Champ
              label="Quantité"
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
            />
            <Selecteur
              label="Motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifConso)}
              options={MOTIFS_CONSO.map((m) => ({ valeur: m, libelle: LIB_MOTIF_CONSO[m] }))}
            />
            <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-carte)] border border-charbon-600 bg-charbon-900 p-4">
            <div>
              <p className="eyebrow mb-1">Coût réel</p>
              <p className="chiffre text-nombre text-craie">{formatFCFA(cout)}</p>
            </div>
            <div className="text-right">
              <p className="eyebrow mb-1">Manque à gagner</p>
              <p className="chiffre text-nombre text-flamme">{formatFCFA(manque)}</p>
            </div>
          </div>

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await validerConsommation({
                  produitId,
                  quantite,
                  motif,
                  date: new Date(date),
                });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setQuantite(1);
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer la sortie"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function BoutonSupprimerConso({ id }: { id: string }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          const reponse = await supprimerConsommation(id);
          annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
          router.refresh();
        })
      }
      className="text-micro font-bold uppercase tracking-wide text-cendre transition-colors hover:text-braise-clair disabled:opacity-50"
    >
      Annuler
    </button>
  );
}
