import Link from "next/link";
import {
  Utensils,
  Receipt,
  Landmark,
  BarChart3,
  Tags,
  Calculator,
  HandCoins,
  Users,
} from "lucide-react";

const SECTIONS = [
  {
    titre: "Marchandise",
    liens: [
      { href: "/conso", libelle: "Consommation interne", detail: "Repas, offerts, pertes", icone: Utensils },
      { href: "/revient", libelle: "Prix de revient", detail: "Coût réel d'une portion", icone: Calculator },
    ],
  },
  {
    titre: "Argent",
    liens: [
      { href: "/depenses", libelle: "Dépenses", detail: "Charbon, transport, mairie", icone: Receipt },
      { href: "/credits", libelle: "Crédits clients", detail: "Vendu, pas encore payé", icone: HandCoins },
      { href: "/investissements", libelle: "Investissements", detail: "Matériel et apports", icone: Landmark },
      { href: "/rapports", libelle: "Rapports", detail: "Résultat, trésorerie, clôture", icone: BarChart3 },
    ],
  },
  {
    titre: "Réglages",
    liens: [
      { href: "/produits", libelle: "Produits", detail: "La carte et les prix", icone: Tags },
      { href: "/equipe", libelle: "Équipe", detail: "Qui a accès, et à quoi", icone: Users },
    ],
  },
];

export default function PagePlus() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow mb-1.5">Toutes les pages</p>
        <h1 className="titre-affiche text-titre-page text-craie">Menu</h1>
      </header>

      {SECTIONS.map((s) => (
        <section key={s.titre}>
          <p className="eyebrow mb-2">{s.titre}</p>
          <div className="flex flex-col gap-2">
            {s.liens.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="carte carte-active flex items-center gap-4 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charbon-700">
                  <l.icone className="h-5 w-5 text-flamme" strokeWidth={2.2} />
                </span>
                <span>
                  <span className="block text-menu font-bold text-craie">{l.libelle}</span>
                  <span className="block text-micro text-cendre">{l.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
