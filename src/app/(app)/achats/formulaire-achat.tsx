"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { validerAchat, annulerAchat } from "@/app/actions/achats";
import { CONDITIONNEMENTS, calculerLot } from "@/domain/rules";
import { formatFCFA, formatQuantite } from "@/lib/money";
import { Bouton, Champ, Selecteur, Bascule } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";
import { cn } from "@/lib/utils";

type Option = { id: string; nom: string; unite: string; cmup: number };

export function FormulaireAchat({ produits }: { produits: Option[] }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [conditionnement, setConditionnement] = useState<string>("Carton");
  const [nbConditionnements, setNb] = useState(1);
  const [piecesParConditionnement, setPieces] = useState(21);
  const [montantTotal, setMontant] = useState(11000);
  const [fournisseur, setFournisseur] = useState("");
  const [paye, setPaye] = useState(true);

  const produit = produits.find((p) => p.id === produitId);
  const apercu = calculerLot({ nbConditionnements, piecesParConditionnement, montantTotal });
  const ecart = produit && produit.cmup > 0 ? apercu.coutUnitaire - produit.cmup : 0;

  if (produits.length === 0) {
    return (
      <Bouton variante="secondaire" disabled>
        Aucun produit suivi en stock
      </Bouton>
    );
  }

  return (
    <Feuille
      titre="Enregistrer un achat"
      description="Le coût réel d'une pièce se calcule avant que vous validiez."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <Plus className="h-4 w-4" /> Nouvel achat
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
            <Champ label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Selecteur
              label="Conditionnement"
              value={conditionnement}
              onChange={(e) => setConditionnement(e.target.value)}
              options={CONDITIONNEMENTS.map((c) => ({ valeur: c, libelle: c }))}
            />
            <Champ
              label="Nombre d'unités"
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={nbConditionnements}
              onChange={(e) => setNb(Number(e.target.value))}
            />
            <Champ
              label={`Pièces par ${conditionnement.toLowerCase()}`}
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={piecesParConditionnement}
              onChange={(e) => setPieces(Number(e.target.value))}
              aide="Comptez-les à la réception : c'est ce chiffre qui fixe votre coût réel."
            />
            <Champ
              label="Montant payé"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              suffixe="FCFA"
              value={montantTotal}
              onChange={(e) => setMontant(Number(e.target.value))}
            />
            <Champ
              label="Fournisseur"
              value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)}
              placeholder="Marché Total, dépôt AURA…"
            />
            <div className="flex items-end">
              <Bascule
                label="Payé immédiatement"
                checked={paye}
                onChange={(e) => setPaye(e.target.checked)}
              />
            </div>
          </div>

          {/* Le chiffre qui décide : ce que revient une pièce. */}
          <div className="rounded-[var(--radius-carte)] border border-charbon-600 bg-charbon-900 p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-1">Ce lot vous donne</p>
                <p className="chiffre text-nombre text-craie">
                  {formatQuantite(apercu.quantiteTotale)}{" "}
                  <span className="text-menu text-cendre">{produit?.unite ?? "pièce"}(s)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="eyebrow mb-1">Coût réel à la pièce</p>
                <p className="chiffre text-nombre text-flamme">{formatFCFA(apercu.coutUnitaire)}</p>
              </div>
            </div>
            {produit && produit.cmup > 0 && (
              <p
                className={cn(
                  "mt-3 text-micro leading-snug",
                  ecart > 0 ? "text-flamme" : ecart < 0 ? "text-vert" : "text-cendre",
                )}
              >
                {ecart > 0
                  ? `Plus cher que d'habitude de ${formatFCFA(ecart)} FCFA la pièce (coût moyen actuel : ${formatFCFA(produit.cmup)}).`
                  : ecart < 0
                    ? `Moins cher que d'habitude de ${formatFCFA(Math.abs(ecart))} FCFA la pièce.`
                    : "Au même prix que votre coût moyen actuel."}
              </p>
            )}
          </div>

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await validerAchat({
                  produitId,
                  date: new Date(date),
                  conditionnement,
                  nbConditionnements,
                  piecesParConditionnement,
                  montantTotal,
                  fournisseur: fournisseur || undefined,
                  paye,
                });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setFournisseur("");
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Enregistrer l'achat"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function BoutonAnnulerAchat({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => {
          if (
            !window.confirm(`Supprimer ${reference} ? Le stock et le coût moyen seront recalculés.`)
          )
            return;
          const reponse = await annulerAchat(id);
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
