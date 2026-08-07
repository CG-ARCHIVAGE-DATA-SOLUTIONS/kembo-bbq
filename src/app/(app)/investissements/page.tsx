import { Landmark } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatFCFA } from "@/lib/money";
import {
  amortissementMensuel,
  LIB_CATEGORIE_INVESTISSEMENT,
  type CategorieInvestissement,
} from "@/domain/rules";
import { EnTetePage, EnTeteSection, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { Indicateur } from "@/components/tableau-de-bord";
import {
  FormulaireInvestissement,
  FormulaireApport,
  GestionInvestissement,
  GestionApport,
} from "./formulaires";

export const dynamic = "force-dynamic";

type Investissement = {
  id: string;
  date: Date;
  libelle: string;
  categorie: string;
  montant: number;
  dureeAmortissementMois: number;
};
type Apport = { id: string; date: Date; libelle: string; montant: number };

export default async function PageInvestissements() {
  const [investissements, apports] = await Promise.all([
    db.investissement.findMany({ orderBy: { date: "desc" } }),
    db.apport.findMany({ orderBy: { date: "desc" } }),
  ]);

  const totalMateriel = investissements.reduce((s, i) => s + i.montant, 0);
  const totalApports = apports.reduce((s, a) => s + a.montant, 0);
  const chargeMensuelle = investissements.reduce(
    (s, i) => s + amortissementMensuel(i.montant, i.dureeAmortissementMois),
    0,
  );

  const colonnes: Colonne<Investissement>[] = [
    {
      cle: "libelle",
      entete: "Désignation",
      role: "titre",
      rendu: (i) => (
        <Empile
          principal={i.libelle}
          secondaire={
            LIB_CATEGORIE_INVESTISSEMENT[i.categorie as CategorieInvestissement] ?? i.categorie
          }
        />
      ),
    },
    { cle: "date", entete: "Date", role: "meta", rendu: (i) => formatDate(i.date) },
    {
      cle: "duree",
      entete: "Durée",
      align: "droite",
      rendu: (i) => <span className="chiffre text-cendre">{i.dureeAmortissementMois} mois</span>,
    },
    {
      cle: "mensuel",
      entete: "Par mois",
      align: "droite",
      rendu: (i) => (
        <span className="chiffre text-flamme">
          {formatFCFA(amortissementMensuel(i.montant, i.dureeAmortissementMois))}
        </span>
      ),
    },
    {
      cle: "montant",
      entete: "Montant",
      role: "montant",
      align: "droite",
      rendu: (i) => <span className="chiffre">{formatFCFA(i.montant)}</span>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (i) => <GestionInvestissement investissement={i} />,
    },
  ];

  const colonnesApport: Colonne<Apport>[] = [
    { cle: "libelle", entete: "Origine", role: "titre", rendu: (a) => a.libelle },
    { cle: "date", entete: "Date", role: "meta", rendu: (a) => formatDate(a.date) },
    {
      cle: "montant",
      entete: "Montant",
      role: "montant",
      align: "droite",
      rendu: (a) => <span className="chiffre">{formatFCFA(a.montant)}</span>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (a) => <GestionApport apport={a} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Ce que vous avez mis dans l'activité"
        titre="Investissements"
        intro="Le matériel s'amortit sur sa durée de vie : c'est cet étalement qui apparaît dans le compte de résultat, pas le montant du jour de l'achat."
        action={
          <div className="flex flex-wrap gap-2">
            <FormulaireApport />
            <FormulaireInvestissement />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <Indicateur libelle="Valeur du matériel" valeur={formatFCFA(totalMateriel)} accent />
        <Indicateur
          libelle="Charge mensuelle"
          valeur={formatFCFA(chargeMensuelle)}
          detail="Amortissement à couvrir chaque mois"
        />
        <Indicateur libelle="Apports reçus" valeur={formatFCFA(totalApports)} />
      </div>

      <ListeAdaptative
        items={investissements}
        cle={(i) => i.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Landmark className="h-6 w-6" />}
            titre="Aucun matériel enregistré"
            message="Chapiteau, barbecue, tables, glacière : enregistrez-les pour connaître le vrai coût mensuel de l'activité."
          />
        }
      />

      {apports.length > 0 && (
        <section>
          <EnTeteSection eyebrow="Entrées de fonds" titre="Apports" />
          <ListeAdaptative items={apports} cle={(a) => a.id} colonnes={colonnesApport} />
        </section>
      )}
    </div>
  );
}
