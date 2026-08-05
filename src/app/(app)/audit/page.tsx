import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Receipt,
  ShoppingBasket,
  TrendingDown,
  Utensils,
  Landmark,
  ArrowDownToLine,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { db } from "@/lib/db";
import { formatFCFA } from "@/lib/money";
import { formatHeure } from "@/lib/dates";
import {
  LIB_PAIEMENT,
  LIB_CATEGORIE_DEPENSE,
  LIB_MOTIF_CONSO,
  LIB_CATEGORIE_INVESTISSEMENT,
  type ModePaiement,
  type CategorieDepense,
  type MotifConso,
  type CategorieInvestissement,
} from "@/domain/rules";
import { cn } from "@/lib/utils";

type TypeEvt = "vente" | "achat" | "depense" | "conso" | "investissement" | "apport";

type Evt = {
  id: string;
  date: Date;
  type: TypeEvt;
  texte: string;
  detail: string;
  montant: number;
  entree: boolean;
};

type Config = {
  fond: string;
  couleur: string;
  Icone: React.ComponentType<LucideProps>;
  label: string;
};

const CONFIG: Record<TypeEvt, Config> = {
  vente:          { fond: "bg-vert/10",    couleur: "text-vert",   Icone: Receipt,         label: "Vente" },
  achat:          { fond: "bg-flamme/10",  couleur: "text-flamme", Icone: ShoppingBasket,  label: "Achat" },
  depense:        { fond: "bg-braise/10",  couleur: "text-braise", Icone: TrendingDown,    label: "Dépense" },
  conso:          { fond: "bg-orange/10",  couleur: "text-orange", Icone: Utensils,        label: "Conso interne" },
  investissement: { fond: "bg-cendre/10",  couleur: "text-cendre", Icone: Landmark,        label: "Investissement" },
  apport:         { fond: "bg-vert/10",    couleur: "text-vert",   Icone: ArrowDownToLine, label: "Apport" },
};

export default async function PageAudit() {
  const depuis = subDays(new Date(), 90);

  const [ventes, lots, depenses, consos, investissements, apports] = await Promise.all([
    db.vente.findMany({
      where: { date: { gte: depuis } },
      include: {
        utilisateur: { select: { nom: true } },
        lignes: { select: { quantite: true } },
      },
      orderBy: { date: "desc" },
    }),
    db.lot.findMany({
      where: { date: { gte: depuis } },
      include: { produit: { select: { nom: true } } },
      orderBy: { date: "desc" },
    }),
    db.depense.findMany({
      where: { date: { gte: depuis } },
      orderBy: { date: "desc" },
    }),
    db.consommationInterne.findMany({
      where: { date: { gte: depuis } },
      include: { produit: { select: { nom: true } } },
      orderBy: { date: "desc" },
    }),
    db.investissement.findMany({
      where: { date: { gte: depuis } },
      orderBy: { date: "desc" },
    }),
    db.apport.findMany({
      where: { date: { gte: depuis } },
      orderBy: { date: "desc" },
    }),
  ]);

  const evenements: Evt[] = [
    ...ventes.map((v) => {
      const nbArticles = v.lignes.reduce((s, l) => s + l.quantite, 0);
      const paiement = LIB_PAIEMENT[v.modePaiement as ModePaiement] ?? v.modePaiement;
      return {
        id: v.id,
        date: v.date,
        type: "vente" as const,
        texte: `${v.numero} · ${nbArticles} article${nbArticles > 1 ? "s" : ""} · ${paiement}`,
        detail: v.utilisateur ? `Encaissé par ${v.utilisateur.nom}` : "",
        montant: v.total,
        entree: true,
      };
    }),
    ...lots.map((l) => ({
      id: l.id,
      date: l.date,
      type: "achat" as const,
      texte: `${l.produit.nom} · ${l.quantiteTotale} unité${l.quantiteTotale > 1 ? "s" : ""}`,
      detail: l.fournisseur ? `Fournisseur : ${l.fournisseur}` : "",
      montant: l.montantTotal,
      entree: false,
    })),
    ...depenses.map((d) => ({
      id: d.id,
      date: d.date,
      type: "depense" as const,
      texte: d.libelle,
      detail: LIB_CATEGORIE_DEPENSE[d.categorie as CategorieDepense] ?? d.categorie,
      montant: d.montant,
      entree: false,
    })),
    ...consos.map((c) => ({
      id: c.id,
      date: c.date,
      type: "conso" as const,
      texte: `${c.produit.nom} · ${c.quantite} unité${c.quantite > 1 ? "s" : ""}`,
      detail: LIB_MOTIF_CONSO[c.motif as MotifConso] ?? c.motif,
      montant: c.valeur,
      entree: false,
    })),
    ...investissements.map((i) => ({
      id: i.id,
      date: i.date,
      type: "investissement" as const,
      texte: i.libelle,
      detail: LIB_CATEGORIE_INVESTISSEMENT[i.categorie as CategorieInvestissement] ?? i.categorie,
      montant: i.montant,
      entree: false,
    })),
    ...apports.map((a) => ({
      id: a.id,
      date: a.date,
      type: "apport" as const,
      texte: a.libelle,
      detail: "Apport de capital",
      montant: a.montant,
      entree: true,
    })),
  ];

  // Grouper par jour calendaire, du plus récent au plus ancien
  const parJour = new Map<string, Evt[]>();
  for (const evt of evenements) {
    const cle = format(evt.date, "yyyy-MM-dd");
    if (!parJour.has(cle)) parJour.set(cle, []);
    parJour.get(cle)!.push(evt);
  }

  const jours = [...parJour.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cle, evts]) => {
      const sorted = [...evts].sort((a, b) => b.date.getTime() - a.date.getTime());
      const totalEntrees = evts.filter((e) => e.entree).reduce((s, e) => s + e.montant, 0);
      const totalSorties = evts.filter((e) => !e.entree).reduce((s, e) => s + e.montant, 0);
      const nbVentes = evts.filter((e) => e.type === "vente").length;
      return {
        cle,
        label: format(new Date(cle + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr }),
        totalEntrees,
        totalSorties,
        nbVentes,
        evts: sorted,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow mb-1.5">Traçabilité</p>
        <h1 className="titre-affiche text-titre-page text-craie">Audit</h1>
        {jours.length > 0 && (
          <p className="mt-1 text-sm text-cendre">
            {evenements.length} événement{evenements.length > 1 ? "s" : ""} · 90 derniers jours
          </p>
        )}
      </header>

      {jours.length === 0 ? (
        <div className="carte p-10 text-center">
          <p className="text-cendre">Aucune activité enregistrée sur les 90 derniers jours.</p>
        </div>
      ) : (
        jours.map(({ cle, label, totalEntrees, totalSorties, nbVentes, evts }) => (
          <section key={cle}>
            {/* ── En-tête du jour */}
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold capitalize text-craie">{label}</h2>
              <div className="flex flex-wrap gap-3 text-xs">
                {nbVentes > 0 && (
                  <span className="text-cendre">
                    {nbVentes} vente{nbVentes > 1 ? "s" : ""}
                  </span>
                )}
                {totalEntrees > 0 && (
                  <span className="font-semibold text-vert">
                    +{formatFCFA(totalEntrees)} FCFA
                  </span>
                )}
                {totalSorties > 0 && (
                  <span className="font-semibold text-braise">
                    −{formatFCFA(totalSorties)} FCFA
                  </span>
                )}
              </div>
            </div>

            {/* ── Liste des événements */}
            <div className="carte overflow-hidden">
              {evts.map((evt, i) => {
                const { fond, couleur, Icone, label: typeLabel } = CONFIG[evt.type];
                return (
                  <div
                    key={evt.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < evts.length - 1 && "border-b border-charbon-700",
                    )}
                  >
                    {/* Icone type */}
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", fond)}>
                      <Icone className={cn("h-4 w-4", couleur)} strokeWidth={2.2} />
                    </span>

                    {/* Texte */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-craie">{evt.texte}</p>
                      {evt.detail && (
                        <p className="truncate text-xs text-cendre">{evt.detail}</p>
                      )}
                    </div>

                    {/* Heure + montant */}
                    <div className="shrink-0 text-right">
                      <p className={cn("chiffre text-sm font-bold", evt.entree ? "text-vert" : "text-craie")}>
                        {evt.entree ? "+" : "−"}{formatFCFA(evt.montant)}
                      </p>
                      <p className="text-[10px] text-cendre">{formatHeure(evt.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
