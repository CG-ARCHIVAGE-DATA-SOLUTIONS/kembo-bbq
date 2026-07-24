import { Utensils } from "lucide-react";
import { db } from "@/lib/db";
import { dernieresConsommations } from "@/domain/conso";
import { debutMois, finMois, formatDate } from "@/lib/dates";
import { formatFCFA, formatQuantite } from "@/lib/money";
import { LIB_MOTIF_CONSO, type MotifConso } from "@/domain/rules";
import { EnTetePage, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { Indicateur } from "@/components/tableau-de-bord";
import { FormulaireConso, BoutonSupprimerConso } from "./formulaire-conso";

export const dynamic = "force-dynamic";

type Conso = Awaited<ReturnType<typeof dernieresConsommations>>[number];

export default async function PageConso() {
  const maintenant = new Date();
  const [produits, lignes, mois] = await Promise.all([
    db.produit.findMany({
      where: { actif: true, suiviStock: true },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, coutMoyenUnitaire: true, prixVente: true },
    }),
    dernieresConsommations(50),
    db.consommationInterne.aggregate({
      where: { date: { gte: debutMois(maintenant), lte: finMois(maintenant) } },
      _sum: { valeur: true, manqueAGagner: true },
    }),
  ]);

  const colonnes: Colonne<Conso>[] = [
    {
      cle: "produit",
      entete: "Produit",
      role: "titre",
      rendu: (c) => (
        <Empile
          principal={c.produit.nom}
          secondaire={LIB_MOTIF_CONSO[c.motif as MotifConso] ?? c.motif}
        />
      ),
    },
    { cle: "date", entete: "Date", role: "meta", rendu: (c) => formatDate(c.date) },
    {
      cle: "quantite",
      entete: "Quantité",
      align: "droite",
      rendu: (c) => <span className="chiffre">{formatQuantite(c.quantite)}</span>,
    },
    {
      cle: "manque",
      entete: "Manque à gagner",
      align: "droite",
      rendu: (c) => <span className="chiffre text-flamme">{formatFCFA(c.manqueAGagner)}</span>,
    },
    {
      cle: "cout",
      entete: "Coût",
      role: "montant",
      align: "droite",
      rendu: (c) => <span className="chiffre">{formatFCFA(c.valeur)}</span>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (c) => <BoutonSupprimerConso id={c.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Repas, offerts, pertes"
        titre="Consommation interne"
        intro="Tout ce qui sort du stock sans être vendu passe ici. C'est la seule façon d'expliquer un écart entre les cuisses achetées et les cuisses encaissées."
        action={
          <FormulaireConso
            produits={produits.map((p) => ({
              id: p.id,
              nom: p.nom,
              cmup: p.coutMoyenUnitaire,
              prixVente: p.prixVente,
            }))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <Indicateur
          libelle="Coût des sorties (mois)"
          valeur={formatFCFA(mois._sum.valeur ?? 0)}
          detail="Ce que la marchandise vous a coûté"
          accent
        />
        <Indicateur
          libelle="Manque à gagner (mois)"
          valeur={formatFCFA(mois._sum.manqueAGagner ?? 0)}
          detail="Ce que ces sorties auraient rapporté"
        />
        <Indicateur libelle="Sorties enregistrées" valeur={String(lignes.length)} unite="" />
      </div>

      <ListeAdaptative
        items={lignes}
        cle={(c) => c.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Utensils className="h-6 w-6" />}
            titre="Aucune sortie interne"
            message="Un repas d'employé, une dégustation ou un invendu se saisit ici pour que le stock reste juste."
          />
        }
      />
    </div>
  );
}
