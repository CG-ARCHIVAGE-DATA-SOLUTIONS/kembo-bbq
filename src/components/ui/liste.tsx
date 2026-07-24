import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Une seule définition de colonnes, deux rendus.
 *
 * Le tableau à douze colonnes est lisible au bureau et illisible sur un
 * téléphone — or c'est là que l'application est utilisée pendant le service.
 * Chaque colonne déclare donc son rôle, et la version téléphone s'en sert pour
 * composer une carte : un titre, un montant, des détails, un statut, une action.
 */

export type RoleColonne = "titre" | "meta" | "montant" | "statut" | "action" | "detail";

export type Colonne<T> = {
  cle: string;
  entete: string;
  rendu: (item: T) => React.ReactNode;
  align?: "gauche" | "droite" | "centre";
  role?: RoleColonne;
  /** Colonne de confort : présente au bureau, masquée sur téléphone. */
  bureauSeul?: boolean;
};

const ALIGNEMENT = {
  gauche: "text-left",
  droite: "text-right",
  centre: "text-center",
} as const;

export function ListeAdaptative<T>({
  items,
  cle,
  colonnes,
  vide,
  pied,
}: {
  items: T[];
  cle: (item: T) => string;
  colonnes: Colonne<T>[];
  vide?: React.ReactNode;
  pied?: React.ReactNode;
}) {
  if (items.length === 0) return <>{vide}</>;

  const parRole = (role: RoleColonne) => colonnes.filter((c) => c.role === role);
  const titre = parRole("titre")[0];
  const montant = parRole("montant")[0];
  const metas = parRole("meta");
  const statuts = parRole("statut");
  const actions = parRole("action");
  const details = colonnes.filter(
    (c) => (c.role === undefined || c.role === "detail") && !c.bureauSeul,
  );

  return (
    <div>
      {/* ─────────── Téléphone : une carte par ligne */}
      <ul className="flex flex-col gap-2.5 lg:hidden">
        {items.map((item) => (
          <li key={cle(item)} className="carte p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {titre && (
                  <div className="text-corps font-bold leading-snug text-craie">
                    {titre.rendu(item)}
                  </div>
                )}
                {metas.length > 0 && (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-cendre">
                    {metas.map((m, i) => (
                      <React.Fragment key={m.cle}>
                        {i > 0 && <span aria-hidden>·</span>}
                        <span>{m.rendu(item)}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>
              {montant && (
                <div className="chiffre shrink-0 text-nombre font-semibold leading-none text-craie">
                  {montant.rendu(item)}
                </div>
              )}
            </div>

            {details.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-charbon-700 pt-3 sm:grid-cols-3">
                {details.map((d) => (
                  <div key={d.cle}>
                    <dt className="text-micro uppercase tracking-wide text-cendre">{d.entete}</dt>
                    <dd className="mt-0.5 text-menu text-craie">{d.rendu(item)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {(statuts.length > 0 || actions.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-charbon-700 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {statuts.map((s) => (
                    <React.Fragment key={s.cle}>{s.rendu(item)}</React.Fragment>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {actions.map((a) => (
                    <React.Fragment key={a.cle}>{a.rendu(item)}</React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* ─────────── Écran large : le tableau reste le meilleur outil de comparaison */}
      <div className="carte hidden overflow-x-auto p-0 lg:block">
        <table className="w-full border-collapse text-menu">
          <thead>
            <tr>
              {colonnes.map((c) => (
                <th
                  key={c.cle}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 border-b border-charbon-600 bg-charbon-700 px-4 py-3",
                    "text-micro font-bold uppercase tracking-wider text-cendre",
                    ALIGNEMENT[c.align ?? "gauche"],
                  )}
                >
                  {c.entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={cle(item)} className="transition-colors hover:bg-charbon-700/50">
                {colonnes.map((c) => (
                  <td
                    key={c.cle}
                    className={cn(
                      "border-b border-charbon-700 px-4 py-3 align-middle",
                      ALIGNEMENT[c.align ?? "gauche"],
                    )}
                  >
                    {c.rendu(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {pied && (
            <tfoot>
              <tr>
                <td colSpan={colonnes.length} className="bg-charbon-700/60 px-4 py-3">
                  {pied}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pied && <div className="carte mt-2.5 p-4 lg:hidden">{pied}</div>}
    </div>
  );
}

/** Cellule secondaire : un libellé discret sous une valeur. */
export function Empile({
  principal,
  secondaire,
}: {
  principal: React.ReactNode;
  secondaire?: React.ReactNode;
}) {
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-craie">{principal}</span>
      {secondaire && <span className="text-micro text-cendre">{secondaire}</span>}
    </span>
  );
}

/* ═══════════════════════════════════ Matrice mois par mois */

export type LigneMatrice = {
  libelle: React.ReactNode;
  valeurs: React.ReactNode[];
  /** « section » sépare, « total » met en avant, « resultat » conclut. */
  ton?: "normal" | "detail" | "section" | "total" | "resultat";
};

/**
 * Le compte de résultat et la trésorerie se lisent en comparant des mois entre
 * eux : le tableau reste le bon outil. Sur téléphone il défile latéralement,
 * la colonne des libellés restant accrochée à gauche.
 */
export function Matrice({
  colonnes,
  lignes,
}: {
  colonnes: React.ReactNode[];
  lignes: LigneMatrice[];
}) {
  const STYLE: Record<NonNullable<LigneMatrice["ton"]>, string> = {
    normal: "text-craie",
    detail: "text-cendre",
    section: "",
    total: "bg-charbon-700/50 font-bold text-craie",
    resultat: "bg-flamme/10 font-bold text-flamme",
  };

  return (
    <div className="carte overflow-x-auto p-0">
      <table className="w-full border-collapse text-menu">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 border-b border-charbon-600 bg-charbon-700 px-4 py-3 text-left text-micro font-bold uppercase tracking-wider text-cendre"
            >
              Rubrique
            </th>
            {colonnes.map((c, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap border-b border-charbon-600 bg-charbon-700 px-4 py-3 text-right text-micro font-bold uppercase tracking-wider text-cendre"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) =>
            l.ton === "section" ? (
              <tr key={i}>
                <td
                  colSpan={colonnes.length + 1}
                  className="border-b border-charbon-600 bg-charbon-900 px-4 py-2 text-micro font-bold uppercase tracking-widest text-cendre"
                >
                  {l.libelle}
                </td>
              </tr>
            ) : (
              <tr key={i} className={STYLE[l.ton ?? "normal"]}>
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 whitespace-nowrap border-b border-charbon-700 px-4 py-3 text-left font-normal",
                    l.ton === "detail" && "bg-charbon-800 pl-7 text-cendre",
                    l.ton === "total" && "bg-charbon-700/95 font-bold",
                    l.ton === "resultat" && "bg-[#1f1a08] font-bold text-flamme",
                    (!l.ton || l.ton === "normal") && "bg-charbon-800",
                  )}
                >
                  {l.libelle}
                </th>
                {l.valeurs.map((v, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap border-b border-charbon-700 px-4 py-3 text-right"
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
