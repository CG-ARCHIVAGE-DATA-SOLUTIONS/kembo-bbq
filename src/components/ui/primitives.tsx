import * as React from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════ Boutons */

type VarianteBouton = "principal" | "secondaire" | "fantome" | "danger";
type TailleBouton = "sm" | "md" | "lg";

const VARIANTES: Record<VarianteBouton, string> = {
  principal:
    "bg-braise text-craie shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-braise-clair active:translate-y-px",
  secondaire:
    "bg-charbon-700 text-craie border border-charbon-500 hover:border-charbon-400 hover:bg-charbon-600 active:translate-y-px",
  fantome: "text-cendre-clair hover:text-craie hover:bg-charbon-700",
  danger: "bg-transparent text-braise-clair border border-braise/40 hover:bg-braise/10",
};

// 44 px de haut minimum : on appuie debout, parfois d'une seule main.
const TAILLES: Record<TailleBouton, string> = {
  sm: "h-10 px-3 text-menu",
  md: "h-11 px-4 text-menu",
  lg: "h-14 px-6 text-corps",
};

export function Bouton({
  variante = "principal",
  taille = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBouton;
  taille?: TailleBouton;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-champ)] font-semibold transition-colors",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTES[variante],
        TAILLES[taille],
        className,
      )}
      {...props}
    />
  );
}

/* ═══════════════════════════════════════════ Champs */

const BASE_CHAMP =
  "h-12 w-full rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 px-3 text-craie " +
  "transition-colors placeholder:text-charbon-400 focus:border-flamme focus:outline-none";

export function Champ({
  label,
  aide,
  erreur,
  suffixe,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  aide?: string;
  erreur?: string;
  suffixe?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-micro font-bold uppercase tracking-wider text-cendre">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={cn(BASE_CHAMP, suffixe && "pr-14", erreur && "border-braise", className)}
          {...props}
        />
        {suffixe && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-menu text-cendre">
            {suffixe}
          </span>
        )}
      </div>
      {aide && !erreur && <p className="text-micro leading-snug text-cendre">{aide}</p>}
      {erreur && <p className="text-micro text-braise-clair">{erreur}</p>}
    </div>
  );
}

export function Selecteur({
  label,
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { valeur: string; libelle: string }[];
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-micro font-bold uppercase tracking-wider text-cendre">
        {label}
      </label>
      <select id={id} className={cn(BASE_CHAMP, "appearance-none pr-9", className)} {...props}>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Bascule({
  label,
  aide,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; aide?: string }) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-champ)] border border-charbon-500 p-3"
    >
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 accent-[#e30613]" {...props} />
      <span>
        <span className="block text-menu font-semibold text-craie">{label}</span>
        {aide && <span className="mt-0.5 block text-micro leading-snug text-cendre">{aide}</span>}
      </span>
    </label>
  );
}

/* ═══════════════════════════════════════════ Structure */

export function Carte({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("carte p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function EnTetePage({
  eyebrow,
  titre,
  intro,
  action,
}: {
  eyebrow?: string;
  titre: string;
  intro?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="titre-affiche text-titre-page text-craie">{titre}</h1>
        {intro && <p className="mt-2 max-w-2xl text-menu leading-relaxed text-cendre">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function EnTeteSection({
  eyebrow,
  titre,
  action,
}: {
  eyebrow?: string;
  titre: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="titre-affiche text-titre text-craie">{titre}</h2>
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════ Signalétique */

type TonBadge = "neutre" | "ok" | "alerte" | "rupture" | "flamme";

const TONS: Record<TonBadge, string> = {
  neutre: "bg-charbon-600 text-cendre-clair",
  ok: "bg-vert/15 text-vert",
  alerte: "bg-flamme/15 text-flamme",
  rupture: "bg-braise/20 text-braise-clair",
  flamme: "bg-flamme text-charbon-900",
};

export function Badge({
  ton = "neutre",
  children,
  className,
}: {
  ton?: TonBadge;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-micro font-bold uppercase tracking-wide",
        TONS[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EtatVide({
  titre,
  message,
  action,
  icone,
}: {
  titre: string;
  message: string;
  action?: React.ReactNode;
  icone?: React.ReactNode;
}) {
  return (
    <div className="carte flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icone && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-charbon-700 text-flamme">
          {icone}
        </span>
      )}
      <p className="titre-affiche text-titre text-craie">{titre}</p>
      <p className="max-w-sm text-menu leading-relaxed text-cendre">{message}</p>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════ Contrôle segmenté */

export function Segmente<T extends string>({
  valeur,
  options,
  onChange,
  etiquette,
  className,
}: {
  valeur: T;
  options: { valeur: T; libelle: string; compteur?: number }[];
  onChange: (v: T) => void;
  etiquette: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={etiquette}
      className={cn(
        "flex gap-1 overflow-x-auto rounded-[var(--radius-champ)] bg-charbon-800 p-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            role="tab"
            aria-selected={actif}
            type="button"
            onClick={() => onChange(o.valeur)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-menu font-bold transition-colors",
              actif ? "bg-braise text-craie" : "text-cendre hover:text-craie",
            )}
          >
            {o.libelle}
            {o.compteur !== undefined && (
              <span className={cn("chiffre text-micro", actif ? "text-craie/70" : "text-charbon-400")}>
                {o.compteur}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════ Chargement */

export function Squelette({ className }: { className?: string }) {
  return <div className={cn("squelette", className)} aria-hidden />;
}

export function SqueletteListe({ lignes = 5 }: { lignes?: number }) {
  return (
    <div className="carte divide-y divide-charbon-700 p-0" aria-busy>
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Squelette className="h-4 flex-1" />
          <Squelette className="h-4 w-16" />
          <Squelette className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SqueletteIndicateurs({ nombre = 4 }: { nombre?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="carte flex flex-col gap-3 p-4">
          <Squelette className="h-3 w-20" />
          <Squelette className="h-7 w-28" />
          <Squelette className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
