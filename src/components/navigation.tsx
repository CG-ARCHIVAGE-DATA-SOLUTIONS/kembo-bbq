"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Flame,
  LayoutDashboard,
  ShoppingBasket,
  Boxes,
  Receipt,
  Tags,
  Utensils,
  Landmark,
  BarChart3,
  Calculator,
  HandCoins,
  Users,
  LogOut,
  MoreHorizontal,
} from "lucide-react";
import { seDeconnecter } from "@/app/actions/auth";
import { LIB_ROLE, peutVoir, type Role } from "@/domain/roles";
import { cn } from "@/lib/utils";

const GROUPES = [
  {
    titre: "Exploitation",
    liens: [
      { href: "/", libelle: "Tableau de bord", icone: LayoutDashboard },
      { href: "/caisse", libelle: "Caisse", icone: Flame },
    ],
  },
  {
    titre: "Marchandise",
    liens: [
      { href: "/achats", libelle: "Achats", icone: ShoppingBasket },
      { href: "/stock", libelle: "Stock", icone: Boxes },
      { href: "/conso", libelle: "Conso interne", icone: Utensils },
    ],
  },
  {
    titre: "Argent",
    liens: [
      { href: "/depenses", libelle: "Dépenses", icone: Receipt },
      { href: "/credits", libelle: "Crédits clients", icone: HandCoins },
      { href: "/investissements", libelle: "Investissements", icone: Landmark },
      { href: "/rapports", libelle: "Rapports", icone: BarChart3 },
    ],
  },
  {
    titre: "Réglages",
    liens: [
      { href: "/produits", libelle: "Produits", icone: Tags },
      { href: "/revient", libelle: "Prix de revient", icone: Calculator },
      { href: "/equipe", libelle: "Équipe", icone: Users },
    ],
  },
];

const RACCOURCIS = [
  { href: "/", libelle: "Bord", icone: LayoutDashboard },
  { href: "/caisse", libelle: "Caisse", icone: Flame },
  { href: "/achats", libelle: "Achats", icone: ShoppingBasket },
  { href: "/stock", libelle: "Stock", icone: Boxes },
  { href: "/plus", libelle: "Menu", icone: MoreHorizontal },
];

function estActif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navigation({
  nom,
  slogan,
  utilisateur,
}: {
  nom: string;
  slogan: string;
  utilisateur: { nom: string; role: Role };
}) {
  const pathname = usePathname();
  const [enCours, demarrer] = useTransition();

  // Un vendeur ne voit pas les pages qu'il ne peut pas ouvrir : masquer vaut
  // mieux qu'afficher un lien qui renverra une erreur.
  const groupes = GROUPES.map((g) => ({
    ...g,
    liens: g.liens.filter((l) => peutVoir(utilisateur.role, l.href)),
  })).filter((g) => g.liens.length > 0);

  const raccourcis = RACCOURCIS.filter((l) => peutVoir(utilisateur.role, l.href));

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-charbon-700 bg-charbon-800 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto p-5">
          <Link href={peutVoir(utilisateur.role, "/") ? "/" : "/caisse"} className="mb-7 block">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-braise/30">
                <Image
                  src="/icones/android-chrome-192x192.png"
                  alt="Kembo BBQ"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  priority
                />
              </span>
              <span className="titre-affiche text-xl leading-none text-craie">{nom}</span>
            </div>
            <p className="mt-2 text-[11px] italic leading-tight text-cendre">{slogan}</p>
          </Link>

          <nav className="flex flex-col gap-5">
            {groupes.map((groupe) => (
              <div key={groupe.titre}>
                <p className="eyebrow mb-1.5 px-3">{groupe.titre}</p>
                <div className="flex flex-col gap-0.5">
                  {groupe.liens.map((lien) => {
                    const actif = estActif(pathname, lien.href);
                    return (
                      <Link
                        key={lien.href}
                        href={lien.href}
                        aria-current={actif ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                          actif
                            ? "bg-charbon-600 text-craie"
                            : "text-cendre hover:bg-charbon-700 hover:text-craie",
                        )}
                      >
                        <lien.icone
                          className={cn("h-[18px] w-[18px]", actif ? "text-flamme" : "text-cendre")}
                          strokeWidth={2.2}
                        />
                        {lien.libelle}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="mb-2 px-3">
              <p className="text-sm font-bold text-craie">{utilisateur.nom}</p>
              <p className="text-[11px] uppercase tracking-wide text-cendre">
                {LIB_ROLE[utilisateur.role]}
              </p>
            </div>
            <button
              type="button"
              disabled={enCours}
              onClick={() => demarrer(() => seDeconnecter())}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-cendre transition-colors hover:bg-charbon-700 hover:text-craie disabled:opacity-50"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2.2} />
              Fermer la session
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-charbon-700 bg-charbon-800/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href={peutVoir(utilisateur.role, "/") ? "/" : "/caisse"} className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-braise/30">
            <Image
              src="/icones/android-chrome-192x192.png"
              alt="Kembo BBQ"
              width={32}
              height={32}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="titre-affiche text-lg leading-none text-craie">{nom}</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-cendre">{utilisateur.nom}</span>
          <Link
            href="/caisse"
            className="rounded-lg bg-flamme px-3 py-1.5 text-xs font-bold uppercase text-charbon-900"
          >
            Vendre
          </Link>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        className="socle-sur fixed inset-x-0 bottom-0 z-40 grid border-t border-charbon-700 bg-charbon-800/95 backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${raccourcis.length}, minmax(0, 1fr))` }}
      >
        {raccourcis.map((lien) => {
          const actif = estActif(pathname, lien.href);
          return (
            <Link
              key={lien.href}
              href={lien.href}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "flex h-[var(--hauteur-barre)] flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors",
                actif ? "text-flamme" : "text-cendre",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  actif && "bg-flamme/12",
                )}
              >
                <lien.icone className="h-5 w-5" strokeWidth={2.2} />
              </span>
              {lien.libelle}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
