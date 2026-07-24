import { cn } from "@/lib/utils";
import { formatFCFA, formatPourcent } from "@/lib/money";
import type { PointJour } from "@/domain/analytics";

/* ═══════════════════════════════════ Indicateur */

export function Indicateur({
  libelle,
  valeur,
  unite = "FCFA",
  detail,
  ton = "neutre",
  accent = false,
  evolution,
}: {
  libelle: string;
  valeur: string;
  unite?: string;
  detail?: string;
  ton?: "neutre" | "positif" | "negatif";
  accent?: boolean;
  evolution?: number | null;
}) {
  return (
    <div
      className={cn(
        "carte flex flex-col justify-between gap-2.5 p-4",
        accent && "border-flamme/35 bg-charbon-700",
      )}
    >
      <p className="eyebrow">{libelle}</p>
      <div>
        <p
          className={cn(
            "chiffre text-nombre font-semibold leading-none",
            ton === "positif" && "text-vert",
            ton === "negatif" && "text-braise-clair",
            ton === "neutre" && "text-craie",
          )}
        >
          {valeur}
          {unite && <span className="ml-1 text-menu font-normal text-cendre">{unite}</span>}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {evolution !== undefined && evolution !== null && (
            <span
              className={cn(
                "chiffre text-micro font-bold",
                evolution >= 0 ? "text-vert" : "text-braise-clair",
              )}
            >
              {evolution >= 0 ? "▲" : "▼"} {formatPourcent(Math.abs(evolution), 0)}
            </span>
          )}
          {detail && <span className="text-micro leading-snug text-cendre">{detail}</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════ Hero : la soirée */

/**
 * L'écran s'ouvre sur la seule question du soir : est-ce que la soirée gagne
 * de l'argent ? Le résultat du jour occupe la place, tout le reste le complète.
 */
export function Soiree({
  resultat,
  recette,
  marge,
  charges,
  tickets,
  ticketMoyen,
  evolutionRecette,
}: {
  resultat: number;
  recette: number;
  marge: number;
  charges: number;
  tickets: number;
  ticketMoyen: number;
  evolutionRecette: number | null;
}) {
  const demarre = recette > 0 || charges > 0;
  const positif = resultat >= 0;

  return (
    <section
      className={cn(
        "carte grille-braise overflow-hidden p-5 sm:p-7",
        demarre && positif && "border-vert/30",
        demarre && !positif && "border-braise/40",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="eyebrow mb-2">
            {demarre ? "Résultat de la soirée" : "La soirée n'a pas commencé"}
          </p>
          <p
            className={cn(
              "chiffre text-nombre-hero font-semibold leading-[0.85]",
              !demarre && "text-cendre",
              demarre && positif && "text-vert",
              demarre && !positif && "text-braise-clair",
            )}
          >
            {demarre ? formatFCFA(resultat, { signe: true }) : "—"}
          </p>
          <p className="mt-2 text-menu text-cendre">
            {demarre
              ? positif
                ? "gagnés ce soir, charges déduites"
                : "perdus ce soir, charges déduites"
              : "Le premier ticket lancera le calcul"}
          </p>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:max-w-md sm:grid-cols-2">
          {[
            ["Recette", formatFCFA(recette), evolutionRecette],
            ["Marge brute", formatFCFA(marge), null],
            ["Dépenses", formatFCFA(charges), null],
            ["Ticket moyen", tickets ? formatFCFA(ticketMoyen) : "—", null],
          ].map(([libelle, valeur, evo]) => (
            <div key={libelle as string}>
              <dt className="text-micro uppercase tracking-wide text-cendre">{libelle}</dt>
              <dd className="chiffre mt-0.5 flex items-baseline gap-1.5 text-corps font-semibold text-craie">
                {valeur}
                {typeof evo === "number" && (
                  <span
                    className={cn(
                      "text-micro font-bold",
                      evo >= 0 ? "text-vert" : "text-braise-clair",
                    )}
                  >
                    {evo >= 0 ? "▲" : "▼"} {formatPourcent(Math.abs(evo), 0)}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {tickets > 0 && (
        <p className="mt-5 border-t border-charbon-600 pt-4 text-micro text-cendre">
          {tickets} ticket{tickets > 1 ? "s" : ""} encaissé{tickets > 1 ? "s" : ""} depuis
          l&apos;ouverture · la journée bascule à 4 h
        </p>
      )}
    </section>
  );
}

/* ═══════════════════════════════════ Signature : la barre de braise */

export function BarreBraise({
  progression,
  caRealise,
  caNecessaire,
  resteAFaire,
  charges,
}: {
  progression: number;
  caRealise: number;
  caNecessaire: number;
  resteAFaire: number;
  charges: number;
}) {
  const couvert = caNecessaire > 0 && caRealise >= caNecessaire;
  const largeur = Math.max(2, Math.round(progression * 100));

  return (
    <div className={cn("carte p-5", couvert && "lueur-braise border-flamme/50")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Seuil de rentabilité du mois</p>
          <p className="titre-affiche text-titre text-craie">
            {couvert ? "Le feu est là" : "Le feu monte"}
          </p>
        </div>
        <p className="text-right text-micro text-cendre">
          Charges à couvrir
          <span className="chiffre mt-0.5 block text-corps text-craie">
            {formatFCFA(charges)} FCFA
          </span>
        </p>
      </div>

      <div
        className="relative h-3 overflow-hidden rounded-full bg-charbon-600"
        role="progressbar"
        aria-valuenow={Math.round(progression * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression vers le seuil de rentabilité du mois"
      >
        <div
          className="barre-braise h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${largeur}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-micro">
        {[
          ["Réalisé", formatFCFA(caRealise), "text-craie"],
          ["Objectif", caNecessaire > 0 ? formatFCFA(caNecessaire) : "—", "text-craie"],
          [
            "Reste à faire",
            resteAFaire > 0 ? formatFCFA(resteAFaire) : "Atteint",
            resteAFaire > 0 ? "text-flamme" : "text-vert",
          ],
        ].map(([libelle, valeur, couleur]) => (
          <div key={libelle}>
            <dt className="text-cendre">{libelle}</dt>
            <dd className={cn("chiffre mt-0.5 text-menu", couleur)}>{valeur}</dd>
          </div>
        ))}
      </dl>

      {caNecessaire === 0 && (
        <p className="mt-4 text-micro leading-snug text-cendre">
          Le seuil se calcule dès qu&apos;une dépense et une vente sont enregistrées ce mois-ci.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════ Courbe */

export function CourbeJours({ points }: { points: PointJour[] }) {
  const L = 720;
  const H = 190;
  const marge = { haut: 14, bas: 28, gauche: 8, droite: 8 };

  const valeurs = points.flatMap((p) => [p.chiffreAffaires, p.resultat]);
  const max = Math.max(1000, ...valeurs);
  const min = Math.min(0, ...valeurs);
  const amplitude = max - min || 1;

  const x = (i: number) =>
    marge.gauche + (i * (L - marge.gauche - marge.droite)) / Math.max(1, points.length - 1);
  const y = (v: number) =>
    marge.haut + (1 - (v - min) / amplitude) * (H - marge.haut - marge.bas);

  const chemin = (cle: "chiffreAffaires" | "resultat") =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[cle]).toFixed(1)}`)
      .join(" ");

  const aire = `${chemin("chiffreAffaires")} L ${x(points.length - 1).toFixed(1)} ${y(min).toFixed(
    1,
  )} L ${x(0).toFixed(1)} ${y(min).toFixed(1)} Z`;

  const total = points.reduce((s, p) => s + p.chiffreAffaires, 0);
  const meilleur = points.reduce((a, b) => (b.chiffreAffaires > a.chiffreAffaires ? b : a), points[0]);

  return (
    <div className="carte p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">14 derniers jours</p>
          <h2 className="titre-affiche text-titre text-craie">Le rythme</h2>
        </div>
        <div className="flex gap-4 text-micro">
          <span className="flex items-center gap-1.5 text-cendre">
            <span className="h-0.5 w-4 rounded bg-flamme" /> Recette
          </span>
          <span className="flex items-center gap-1.5 text-cendre">
            <span className="h-0.5 w-4 rounded bg-vert" /> Résultat
          </span>
        </div>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-menu text-cendre">
          Aucune vente sur la période. La courbe se dessinera au premier ticket.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${L} ${H}`}
            className="h-44 w-full sm:h-48"
            role="img"
            aria-label={`Recette et résultat des ${points.length} derniers jours`}
          >
            <defs>
              <linearGradient id="degradeCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f2b705" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f2b705" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Ligne de zéro : en dessous, la soirée a coûté de l'argent. */}
            <line
              x1={marge.gauche}
              x2={L - marge.droite}
              y1={y(0)}
              y2={y(0)}
              stroke="#212327"
              strokeWidth="1"
            />

            <path d={aire} fill="url(#degradeCA)" />
            <path
              d={chemin("chiffreAffaires")}
              fill="none"
              stroke="#f2b705"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={chemin("resultat")}
              fill="none"
              stroke="#3ecb7f"
              strokeWidth="2"
              strokeDasharray="4 5"
              strokeLinejoin="round"
            />

            {points.map((p, i) => (
              <g key={p.date}>
                <circle cx={x(i)} cy={y(p.chiffreAffaires)} r="3" fill="#f2b705" />
                {i % 2 === 0 && (
                  <text
                    x={x(i)}
                    y={H - 8}
                    textAnchor="middle"
                    className="chiffre"
                    fill="#8d8d96"
                    fontSize="11"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {meilleur && meilleur.chiffreAffaires > 0 && (
            <p className="mt-3 border-t border-charbon-700 pt-3 text-micro text-cendre">
              Meilleure soirée : {meilleur.label} avec{" "}
              <span className="chiffre text-craie">{formatFCFA(meilleur.chiffreAffaires)} FCFA</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════ Répartition par produit */

export function BarreProduit({
  nom,
  quantite,
  chiffreAffaires,
  margeBrute,
  part,
  rang,
}: {
  nom: string;
  quantite: number;
  chiffreAffaires: number;
  margeBrute: number;
  part: number;
  rang: number;
}) {
  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="chiffre text-micro text-charbon-400">{rang}</span>
          <span className="truncate text-menu font-semibold text-craie">{nom}</span>
        </p>
        <p className="chiffre shrink-0 text-menu text-craie">{formatFCFA(chiffreAffaires)}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-charbon-700">
        <div
          className="h-full rounded-full bg-braise transition-[width] duration-500"
          style={{ width: `${Math.max(2, part * 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-micro text-cendre">
        <span>
          {quantite} vendu{quantite > 1 ? "s" : ""} · {formatPourcent(part, 0)} de la recette
        </span>
        <span className={margeBrute >= 0 ? "text-vert" : "text-braise-clair"}>
          marge {formatFCFA(margeBrute)}
        </span>
      </div>
    </div>
  );
}
