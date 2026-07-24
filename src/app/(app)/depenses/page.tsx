import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { debutMois, finMois, formatDate } from "@/lib/dates";
import { formatFCFA, formatPourcent } from "@/lib/money";
import {
  LIB_CATEGORIE_DEPENSE,
  LIB_PAIEMENT,
  type CategorieDepense,
  type ModePaiement,
} from "@/domain/rules";
import { Carte, EnTetePage, EnTeteSection, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { FormulaireDepense, BoutonSupprimerDepense } from "./formulaire-depense";

export const dynamic = "force-dynamic";

type Depense = { id: string; date: Date; libelle: string; categorie: string; montant: number; modePaiement: string };

export default async function PageDepenses() {
  const maintenant = new Date();
  const periode = { gte: debutMois(maintenant), lte: finMois(maintenant) };

  const [depenses, parCategorie] = await Promise.all([
    db.depense.findMany({ orderBy: { date: "desc" }, take: 60 }),
    db.depense.groupBy({ by: ["categorie"], where: { date: periode }, _sum: { montant: true } }),
  ]);

  const totalMois = parCategorie.reduce((s, c) => s + (c._sum.montant ?? 0), 0);
  const classement = parCategorie
    .map((c) => ({ categorie: c.categorie as CategorieDepense, montant: c._sum.montant ?? 0 }))
    .sort((a, b) => b.montant - a.montant);

  const colonnes: Colonne<Depense>[] = [
    {
      cle: "libelle",
      entete: "Désignation",
      role: "titre",
      rendu: (d) => (
        <Empile
          principal={d.libelle}
          secondaire={LIB_CATEGORIE_DEPENSE[d.categorie as CategorieDepense] ?? d.categorie}
        />
      ),
    },
    { cle: "date", entete: "Date", role: "meta", rendu: (d) => formatDate(d.date) },
    {
      cle: "paiement",
      entete: "Payé en",
      role: "meta",
      rendu: (d) => LIB_PAIEMENT[d.modePaiement as ModePaiement] ?? d.modePaiement,
    },
    {
      cle: "montant",
      entete: "Montant",
      role: "montant",
      align: "droite",
      rendu: (d) => <span className="chiffre">{formatFCFA(d.montant)}</span>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (d) => <BoutonSupprimerDepense id={d.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Charges d'exploitation"
        titre="Dépenses"
        intro="Sans elles, le bénéfice affiché serait faux : le charbon, le transport et la taxe de la mairie sortent de la caisse comme le reste."
        action={<FormulaireDepense />}
      />

      {classement.length > 0 && (
        <Carte>
          <EnTeteSection
            eyebrow="Ce mois-ci"
            titre="Où part l'argent"
            action={<span className="chiffre text-corps text-craie">{formatFCFA(totalMois)} FCFA</span>}
          />
          <div className="divide-y divide-charbon-700">
            {classement.map((c) => (
              <div key={c.categorie} className="py-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-menu font-semibold text-craie">
                    {LIB_CATEGORIE_DEPENSE[c.categorie] ?? c.categorie}
                  </span>
                  <span className="chiffre text-menu text-craie">{formatFCFA(c.montant)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-charbon-700">
                  <div
                    className="h-full rounded-full bg-flamme transition-[width] duration-500"
                    style={{ width: `${Math.max(2, (c.montant / (totalMois || 1)) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-micro text-cendre">
                  {formatPourcent(c.montant / (totalMois || 1), 0)} des charges du mois
                </p>
              </div>
            ))}
          </div>
        </Carte>
      )}

      <ListeAdaptative
        items={depenses}
        cle={(d) => d.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Receipt className="h-6 w-6" />}
            titre="Aucune dépense enregistrée"
            message="Saisissez le charbon, le transport ou la taxe de la mairie pour que le bénéfice affiché soit le vrai."
          />
        }
      />
    </div>
  );
}
