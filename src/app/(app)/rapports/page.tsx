import Link from "next/link";
import { db } from "@/lib/db";
import { compteResultat, tresorerieMensuelle } from "@/domain/rapports";
import { formatFCFA, formatPourcent } from "@/lib/money";
import { formatDate, formatMois } from "@/lib/dates";
import { CATEGORIES_DEPENSE, LIB_CATEGORIE_DEPENSE } from "@/domain/rules";
import { Badge, Carte, EnTetePage, EnTeteSection, EtatVide } from "@/components/ui/primitives";
import { Matrice, ListeAdaptative, Empile, type Colonne, type LigneMatrice } from "@/components/ui/liste";
import { BoutonCloture } from "./cloture";

export const dynamic = "force-dynamic";

function Montant({ valeur }: { valeur: number }) {
  if (valeur === 0) return <span className="chiffre text-charbon-400">—</span>;
  return (
    <span className={`chiffre ${valeur < 0 ? "text-braise-clair" : ""}`}>{formatFCFA(valeur)}</span>
  );
}

type Journee = {
  id: string;
  date: Date;
  statut: string;
  _count: { ventes: number };
  ventes: { total: number }[];
};

export default async function PageRapports({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const params = await searchParams;
  const annee = Number(params.annee) || new Date().getFullYear();

  const [resultat, treso, journees] = await Promise.all([
    compteResultat(annee),
    tresorerieMensuelle(annee),
    db.journee.findMany({
      orderBy: { date: "desc" },
      take: 12,
      include: { _count: { select: { ventes: true } }, ventes: { select: { total: true } } },
    }),
  ]);

  // On n'affiche que les mois où il s'est passé quelque chose.
  const actifs = resultat
    .map((l, i) => ({ l, t: treso[i] }))
    .filter(
      ({ l, t }) =>
        l.chiffreAffaires > 0 || l.totalCharges > 0 || t.totalEntrees > 0 || t.totalSorties > 0,
    );

  const cumul = resultat.reduce(
    (acc, l) => ({
      ca: acc.ca + l.chiffreAffaires,
      marge: acc.marge + l.margeBrute,
      resultat: acc.resultat + l.resultatNet,
    }),
    { ca: 0, marge: 0, resultat: 0 },
  );

  const categories = CATEGORIES_DEPENSE.filter((c) => resultat.some((l) => l.charges[c] > 0));
  const mois = actifs.map(({ l }) => formatMois(l.mois));

  const lignesResultat: LigneMatrice[] = [
    {
      libelle: "Chiffre d'affaires",
      ton: "total",
      valeurs: actifs.map(({ l }) => <Montant valeur={l.chiffreAffaires} />),
    },
    {
      libelle: "Coût des marchandises vendues",
      ton: "detail",
      valeurs: actifs.map(({ l }) => <Montant valeur={-l.coutMatiere} />),
    },
    {
      libelle: "Marge brute",
      ton: "total",
      valeurs: actifs.map(({ l }) => <Montant valeur={l.margeBrute} />),
    },
    {
      libelle: "Taux de marge brute",
      ton: "detail",
      valeurs: actifs.map(({ l }) => (
        <span className="chiffre text-cendre">{formatPourcent(l.tauxMargeBrute)}</span>
      )),
    },
    { libelle: "Charges d'exploitation", ton: "section", valeurs: [] },
    ...categories.map((c) => ({
      libelle: LIB_CATEGORIE_DEPENSE[c],
      ton: "detail" as const,
      valeurs: actifs.map(({ l }) => <Montant valeur={-l.charges[c]} />),
    })),
    {
      libelle: "Total des charges",
      ton: "total",
      valeurs: actifs.map(({ l }) => <Montant valeur={-l.totalCharges} />),
    },
    {
      libelle: "Consommation interne",
      ton: "detail",
      valeurs: actifs.map(({ l }) => <Montant valeur={-l.consommationInterne} />),
    },
    {
      libelle: "Amortissement du matériel",
      ton: "detail",
      valeurs: actifs.map(({ l }) => <Montant valeur={-l.amortissements} />),
    },
    {
      libelle: "Résultat net",
      ton: "resultat",
      valeurs: actifs.map(({ l }) => (
        <span className={`chiffre font-bold ${l.resultatNet >= 0 ? "text-vert" : "text-braise-clair"}`}>
          {formatFCFA(l.resultatNet, { signe: true })}
        </span>
      )),
    },
  ];

  const lignesTreso: LigneMatrice[] = [
    {
      libelle: "Caisse en début de mois",
      valeurs: actifs.map(({ t }) => <Montant valeur={t.ouverture} />),
    },
    { libelle: "Entrées", ton: "section", valeurs: [] },
    {
      libelle: "Ventes encaissées",
      ton: "detail",
      valeurs: actifs.map(({ t }) => <Montant valeur={t.encaissements} />),
    },
    { libelle: "Apports", ton: "detail", valeurs: actifs.map(({ t }) => <Montant valeur={t.apports} />) },
    { libelle: "Sorties", ton: "section", valeurs: [] },
    {
      libelle: "Achats de marchandises",
      ton: "detail",
      valeurs: actifs.map(({ t }) => <Montant valeur={-t.achats} />),
    },
    { libelle: "Dépenses", ton: "detail", valeurs: actifs.map(({ t }) => <Montant valeur={-t.depenses} />) },
    {
      libelle: "Matériel",
      ton: "detail",
      valeurs: actifs.map(({ t }) => <Montant valeur={-t.investissements} />),
    },
    {
      libelle: "Flux du mois",
      ton: "total",
      valeurs: actifs.map(({ t }) => <Montant valeur={t.flux} />),
    },
    {
      libelle: "Caisse en fin de mois",
      ton: "resultat",
      valeurs: actifs.map(({ t }) => (
        <span className={`chiffre font-bold ${t.cloture >= 0 ? "text-flamme" : "text-braise-clair"}`}>
          {formatFCFA(t.cloture)}
        </span>
      )),
    },
  ];

  const colonnesJournees: Colonne<Journee>[] = [
    {
      cle: "date",
      entete: "Date",
      role: "titre",
      rendu: (j) => (
        <Empile
          principal={formatDate(j.date)}
          secondaire={`${j._count.ventes} ticket${j._count.ventes > 1 ? "s" : ""}`}
        />
      ),
    },
    {
      cle: "recette",
      entete: "Recette",
      role: "montant",
      align: "droite",
      rendu: (j) => (
        <span className="chiffre">{formatFCFA(j.ventes.reduce((s, v) => s + v.total, 0))}</span>
      ),
    },
    {
      cle: "statut",
      entete: "Statut",
      role: "statut",
      align: "centre",
      rendu: (j) => (
        <Badge ton={j.statut === "CLOTUREE" ? "neutre" : "ok"}>
          {j.statut === "CLOTUREE" ? "Clôturée" : "Ouverte"}
        </Badge>
      ),
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (j) => (
        <BoutonCloture dateISO={j.date.toISOString()} cloturee={j.statut === "CLOTUREE"} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow={`Année ${annee}`}
        titre="Rapports"
        action={
          <div className="flex gap-1.5">
            {[annee - 1, annee, annee + 1].map((a) => (
              <Link
                key={a}
                href={`/rapports?annee=${a}`}
                className={`chiffre rounded-[var(--radius-champ)] px-3 py-2.5 text-menu font-semibold transition-colors ${
                  a === annee
                    ? "bg-braise text-craie"
                    : "bg-charbon-700 text-cendre hover:text-craie"
                }`}
              >
                {a}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          ["Chiffre d'affaires", formatFCFA(cumul.ca), "text-craie"],
          ["Marge brute", formatFCFA(cumul.marge), "text-craie"],
          [
            "Résultat net",
            formatFCFA(cumul.resultat, { signe: true }),
            cumul.resultat >= 0 ? "text-vert" : "text-braise-clair",
          ],
        ].map(([libelle, valeur, couleur]) => (
          <Carte key={libelle as string} className="p-4">
            <p className="eyebrow mb-2">{libelle}</p>
            <p className={`chiffre text-nombre font-semibold leading-none ${couleur}`}>{valeur}</p>
          </Carte>
        ))}
      </div>

      <section>
        <EnTeteSection eyebrow="Ce que l'activité gagne" titre="Compte de résultat" />
        {actifs.length === 0 ? (
          <EtatVide
            titre={`Rien à afficher pour ${annee}`}
            message="Le compte de résultat se remplit à partir des ventes et des dépenses saisies."
          />
        ) : (
          <Matrice colonnes={mois} lignes={lignesResultat} />
        )}
      </section>

      {actifs.length > 0 && (
        <section>
          <EnTeteSection eyebrow="Où est passé l'argent" titre="Trésorerie" />
          <Matrice colonnes={mois} lignes={lignesTreso} />
        </section>
      )}

      <section>
        <EnTeteSection eyebrow="Verrouillage" titre="Journées" />
        <p className="mb-3 max-w-2xl text-menu leading-relaxed text-cendre">
          Clôturer une journée fige ses ventes : plus personne ne peut y ajouter ou retirer un
          ticket. La réouverture reste possible, mais devient un acte volontaire.
        </p>
        <ListeAdaptative
          items={journees}
          cle={(j) => j.id}
          colonnes={colonnesJournees}
          vide={
            <EtatVide
              titre="Aucune journée ouverte"
              message="La première vente ouvre automatiquement la journée."
            />
          }
        />
      </section>
    </div>
  );
}
