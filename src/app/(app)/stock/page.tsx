import { Boxes } from "lucide-react";
import { etatStock, type LigneEtatStock } from "@/domain/stock";
import { LIB_STATUT_STOCK, type StatutStock } from "@/domain/rules";
import { formatFCFA, formatQuantite } from "@/lib/money";
import { Badge, EnTetePage, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { Indicateur } from "@/components/tableau-de-bord";
import { ChampInventaire } from "./inventaire";

export const dynamic = "force-dynamic";

const TON: Record<StatutStock, "ok" | "alerte" | "rupture" | "neutre"> = {
  OK: "ok",
  REAPPRO: "alerte",
  RUPTURE: "rupture",
  NON_SUIVI: "neutre",
};

export default async function PageStock() {
  const lignes = await etatStock();
  const suivis = lignes.filter((l) => l.suiviStock);
  const valeur = suivis.reduce((s, l) => s + Math.max(0, l.valeurStock), 0);
  const aRacheter = suivis.filter((l) => l.statut === "REAPPRO" || l.statut === "RUPTURE").length;

  const colonnes: Colonne<LigneEtatStock>[] = [
    {
      cle: "produit",
      entete: "Produit",
      role: "titre",
      rendu: (l) => <Empile principal={l.nom} secondaire={l.code} />,
    },
    {
      cle: "stock",
      entete: "Stock",
      role: "montant",
      align: "droite",
      rendu: (l) => (
        <span className="chiffre">
          {formatQuantite(l.stock)}
          <span className="ml-1 text-micro font-normal text-cendre">{l.unite}</span>
        </span>
      ),
    },
    {
      cle: "achete",
      entete: "Acheté",
      align: "droite",
      rendu: (l) => <span className="chiffre text-cendre">{formatQuantite(l.quantiteAchetee)}</span>,
    },
    {
      cle: "vendu",
      entete: "Vendu",
      align: "droite",
      rendu: (l) => <span className="chiffre text-cendre">{formatQuantite(l.quantiteVendue)}</span>,
    },
    {
      cle: "interne",
      entete: "Interne",
      align: "droite",
      bureauSeul: true,
      rendu: (l) => <span className="chiffre text-cendre">{formatQuantite(l.quantiteInterne)}</span>,
    },
    {
      cle: "ecarts",
      entete: "Écarts",
      align: "droite",
      bureauSeul: true,
      rendu: (l) => (
        <span className="chiffre text-cendre">
          {l.ajustements === 0 ? "—" : formatQuantite(l.ajustements)}
        </span>
      ),
    },
    {
      cle: "cmup",
      entete: "Coût moyen",
      align: "droite",
      rendu: (l) => <span className="chiffre">{formatFCFA(l.cmup)}</span>,
    },
    {
      cle: "valeur",
      entete: "Valeur",
      align: "droite",
      rendu: (l) => <span className="chiffre">{formatFCFA(l.valeurStock)}</span>,
    },
    {
      cle: "statut",
      entete: "Statut",
      role: "statut",
      align: "centre",
      rendu: (l) => <Badge ton={TON[l.statut]}>{LIB_STATUT_STOCK[l.statut]}</Badge>,
    },
    {
      cle: "compte",
      entete: "Compté",
      role: "action",
      align: "droite",
      rendu: (l) =>
        l.suiviStock ? (
          <ChampInventaire produitId={l.id} stockTheorique={l.stock} />
        ) : (
          <span className="text-micro text-charbon-400">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="État du jour"
        titre="Stock"
        intro="Le stock est la somme des entrées et des sorties, jamais un chiffre saisi à la main. Pour corriger un écart, comptez la marchandise et inscrivez le résultat dans « Compté » : l'écart est enregistré et reste consultable."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Indicateur libelle="Valeur du stock" valeur={formatFCFA(valeur)} accent />
        <Indicateur libelle="Produits suivis" valeur={String(suivis.length)} unite="" />
        <Indicateur
          libelle="À racheter"
          valeur={String(aRacheter)}
          unite=""
          ton={aRacheter > 0 ? "negatif" : "positif"}
        />
        <Indicateur
          libelle="Sorties internes"
          valeur={formatQuantite(suivis.reduce((s, l) => s + l.quantiteInterne, 0))}
          unite=""
          detail="Repas, offerts, pertes"
        />
      </div>

      <ListeAdaptative
        items={lignes}
        cle={(l) => l.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Boxes className="h-6 w-6" />}
            titre="Catalogue vide"
            message="Créez vos produits, puis enregistrez un achat : le stock apparaîtra ici."
          />
        }
      />
    </div>
  );
}
