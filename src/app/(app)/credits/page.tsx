import { HandCoins } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate, formatHeure } from "@/lib/dates";
import { formatFCFA } from "@/lib/money";
import { EnTetePage, EnTeteSection, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { Indicateur } from "@/components/tableau-de-bord";
import { BoutonEncaisser, ChampClient } from "./actions-client";

export const dynamic = "force-dynamic";

type Credit = {
  id: string;
  numero: string;
  date: Date;
  client: string | null;
  total: number;
  lignes: { quantite: number; designation: string }[];
};

export default async function PageCredits() {
  const [enAttente, reglees] = await Promise.all([
    db.vente.findMany({
      where: { modePaiement: "CREDIT", encaisse: false },
      include: { lignes: { select: { quantite: true, designation: true } } },
      orderBy: { date: "asc" },
    }),
    db.vente.findMany({
      where: { modePaiement: "CREDIT", encaisse: true },
      orderBy: { date: "desc" },
      take: 15,
    }),
  ]);

  const total = enAttente.reduce((somme, v) => somme + v.total, 0);
  const plusAncienne = enAttente[0];
  const jours = plusAncienne
    ? Math.floor((Date.now() - plusAncienne.date.getTime()) / 86_400_000)
    : 0;

  const colonnes: Colonne<Credit>[] = [
    {
      cle: "client",
      entete: "Client",
      role: "titre",
      rendu: (v) => <ChampClient id={v.id} valeur={v.client ?? ""} />,
    },
    {
      cle: "ticket",
      entete: "Ticket",
      role: "meta",
      rendu: (v) => `${v.numero} · ${formatDate(v.date)} ${formatHeure(v.date)}`,
    },
    {
      cle: "contenu",
      entete: "Contenu",
      rendu: (v) => (
        <span className="text-micro text-cendre">
          {v.lignes.map((l) => `${l.quantite}× ${l.designation}`).join(", ")}
        </span>
      ),
    },
    {
      cle: "montant",
      entete: "Montant",
      role: "montant",
      align: "droite",
      rendu: (v) => <span className="chiffre">{formatFCFA(v.total)}</span>,
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (v) => <BoutonEncaisser id={v.id} montant={`${formatFCFA(v.total)} F`} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Livré, pas encore payé"
        titre="Crédits clients"
        intro="Ces ventes comptent déjà dans la recette, mais l'argent n'est pas en caisse. Encaissez-les au fur et à mesure des règlements."
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <Indicateur
          libelle="Total dû"
          valeur={formatFCFA(total)}
          ton={total > 0 ? "negatif" : "neutre"}
          accent
        />
        <Indicateur libelle="Tickets ouverts" valeur={String(enAttente.length)} unite="" />
        <Indicateur
          libelle="Plus ancien"
          valeur={plusAncienne ? String(jours) : "0"}
          unite={jours > 1 ? "jours" : "jour"}
          detail={plusAncienne ? `Depuis le ${formatDate(plusAncienne.date)}` : "Rien en attente"}
        />
      </div>

      <ListeAdaptative
        items={enAttente}
        cle={(v) => v.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<HandCoins className="h-6 w-6" />}
            titre="Aucun crédit en cours"
            message="Une vente à crédit s'enregistre depuis la caisse, en choisissant « Crédit client » comme mode de paiement."
          />
        }
      />

      {reglees.length > 0 && (
        <section>
          <EnTeteSection eyebrow="Historique" titre="Derniers règlements" />
          <ul className="flex flex-col gap-2 lg:gap-0 lg:divide-y lg:divide-charbon-700 lg:rounded-[var(--radius-carte)] lg:border lg:border-charbon-600 lg:bg-charbon-800">
            {reglees.map((v) => (
              <li
                key={v.id}
                className="carte flex items-center justify-between gap-3 p-3.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-4 lg:py-3"
              >
                <Empile
                  principal={v.client ?? "Client non renseigné"}
                  secondaire={`${v.numero} · ${formatDate(v.date)}`}
                />
                <span className="chiffre text-menu text-vert">{formatFCFA(v.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
