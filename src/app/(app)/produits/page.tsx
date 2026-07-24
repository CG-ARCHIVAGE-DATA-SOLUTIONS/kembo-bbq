import { Tags } from "lucide-react";
import { db } from "@/lib/db";
import { formatFCFA, formatPourcent, ratio } from "@/lib/money";
import {
  LIB_CATEGORIE_PRODUIT,
  LIB_UNITE,
  type CategorieProduit,
  type Unite,
} from "@/domain/rules";
import { Badge, EnTetePage, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { FormulaireProduit, BoutonActivation } from "./formulaire-produit";

export const dynamic = "force-dynamic";

type Produit = {
  id: string;
  code: string;
  nom: string;
  categorie: string;
  unite: string;
  prixVente: number;
  coutMoyenUnitaire: number;
  suiviStock: boolean;
  actif: boolean;
};

export default async function PageProduits() {
  const produits = await db.produit.findMany({
    orderBy: [{ actif: "desc" }, { ordre: "asc" }, { nom: "asc" }],
  });

  const colonnes: Colonne<Produit>[] = [
    {
      cle: "nom",
      entete: "Produit",
      role: "titre",
      rendu: (p) => (
        <Empile
          principal={p.nom}
          secondaire={`${p.code} · ${LIB_CATEGORIE_PRODUIT[p.categorie as CategorieProduit] ?? p.categorie}`}
        />
      ),
    },
    {
      cle: "unite",
      entete: "Unité",
      role: "meta",
      rendu: (p) => LIB_UNITE[p.unite as Unite] ?? p.unite,
    },
    {
      cle: "prix",
      entete: "Prix de vente",
      role: "montant",
      align: "droite",
      rendu: (p) => <span className="chiffre">{formatFCFA(p.prixVente)}</span>,
    },
    {
      cle: "cout",
      entete: "Coût moyen",
      align: "droite",
      rendu: (p) => (
        <span className="chiffre text-cendre">
          {p.coutMoyenUnitaire > 0 ? formatFCFA(p.coutMoyenUnitaire) : "—"}
        </span>
      ),
    },
    {
      cle: "marge",
      entete: "Marge",
      align: "droite",
      rendu: (p) => {
        if (p.coutMoyenUnitaire <= 0)
          return <span className="text-micro text-cendre">Aucun achat saisi</span>;
        const marge = p.prixVente - p.coutMoyenUnitaire;
        return (
          <span className={`chiffre ${marge >= 0 ? "text-vert" : "text-braise-clair"}`}>
            {formatFCFA(marge)}{" "}
            <span className="text-micro text-cendre">
              {formatPourcent(ratio(marge, p.prixVente), 0)}
            </span>
          </span>
        );
      },
    },
    {
      cle: "statut",
      entete: "État",
      role: "statut",
      align: "centre",
      rendu: (p) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {!p.actif && <Badge ton="neutre">Retiré</Badge>}
          <Badge ton={p.suiviStock ? "ok" : "neutre"}>
            {p.suiviStock ? "Stock suivi" : "Sans stock"}
          </Badge>
        </span>
      ),
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (p) => <BoutonActivation id={p.id} actif={p.actif} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Catalogue"
        titre="Produits"
        intro="La marge compare le prix de vente au coût moyen d'achat. Une marge basse ou négative signale un prix à revoir ou un fournisseur trop cher."
        action={<FormulaireProduit />}
      />

      <ListeAdaptative
        items={produits}
        cle={(p) => p.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Tags className="h-6 w-6" />}
            titre="Aucun produit"
            message="Commencez par la carte : cuisse, poisson, ailes, attiéké, banane."
          />
        }
      />
    </div>
  );
}
