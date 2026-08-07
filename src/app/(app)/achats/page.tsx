import { ShoppingBasket } from "lucide-react";
import { db } from "@/lib/db";
import { derniersAchats } from "@/domain/achats";
import { formatDate } from "@/lib/dates";
import { formatFCFA, formatQuantite } from "@/lib/money";
import { Badge, EnTetePage, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { FormulaireAchat, GestionAchat } from "./formulaire-achat";

export const dynamic = "force-dynamic";

type Lot = Awaited<ReturnType<typeof derniersAchats>>[number];

export default async function PageAchats() {
  const [produits, lots] = await Promise.all([
    db.produit.findMany({
      where: { actif: true, suiviStock: true },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, unite: true, coutMoyenUnitaire: true },
    }),
    derniersAchats(40),
  ]);

  const total = lots.reduce((somme, lot) => somme + lot.montantTotal, 0);

  const colonnes: Colonne<Lot>[] = [
    {
      cle: "produit",
      entete: "Produit",
      role: "titre",
      rendu: (l) => (
        <Empile
          principal={l.produit.nom}
          secondaire={`${l.reference} · ${formatQuantite(l.nbConditionnements)} ${l.conditionnement.toLowerCase()}(s)`}
        />
      ),
    },
    { cle: "date", entete: "Date", role: "meta", rendu: (l) => formatDate(l.date) },
    {
      cle: "fournisseur",
      entete: "Fournisseur",
      role: "meta",
      rendu: (l) => l.fournisseur ?? "Sans fournisseur",
    },
    {
      cle: "quantite",
      entete: "Quantité",
      align: "droite",
      rendu: (l) => <span className="chiffre">{formatQuantite(l.quantiteTotale)}</span>,
    },
    {
      cle: "cout",
      entete: "Coût / pièce",
      align: "droite",
      rendu: (l) => <span className="chiffre text-flamme">{formatFCFA(l.coutUnitaire)}</span>,
    },
    {
      cle: "montant",
      entete: "Montant",
      role: "montant",
      align: "droite",
      rendu: (l) => <span className="chiffre">{formatFCFA(l.montantTotal)}</span>,
    },
    {
      cle: "paye",
      entete: "Règlement",
      role: "statut",
      align: "centre",
      rendu: (l) =>
        l.paye ? <Badge ton="ok">Payé</Badge> : <Badge ton="alerte">À payer</Badge>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (l) => (
        <GestionAchat lot={{ id: l.id, reference: l.reference, date: l.date, fournisseur: l.fournisseur, paye: l.paye }} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Entrées de marchandise"
        titre="Achats"
        intro="Chaque carton enregistré met à jour le stock et recalcule le coût moyen d'une pièce. C'est ce coût qui mesure ensuite la marge de chaque vente."
        action={
          <FormulaireAchat
            produits={produits.map((p) => ({
              id: p.id,
              nom: p.nom,
              unite: p.unite,
              cmup: p.coutMoyenUnitaire,
            }))}
          />
        }
      />

      <ListeAdaptative
        items={lots}
        cle={(l) => l.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<ShoppingBasket className="h-6 w-6" />}
            titre="Aucun achat enregistré"
            message="Enregistrez votre premier carton : le stock et les marges commenceront à se calculer."
          />
        }
        pied={
          lots.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-micro uppercase tracking-wide text-cendre">
                {lots.length} lot{lots.length > 1 ? "s" : ""}
              </span>
              <span className="chiffre text-menu font-semibold text-craie">
                {formatFCFA(total)} FCFA d&apos;achats
              </span>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
