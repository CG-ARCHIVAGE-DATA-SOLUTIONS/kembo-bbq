import Link from "next/link";
import { AlertTriangle, ArrowRight, Flame } from "lucide-react";
import { chargerDashboard } from "@/domain/analytics";
import { formatFCFA, formatPourcent, formatQuantite } from "@/lib/money";
import { formatDateLongue, journeeCommerciale } from "@/lib/dates";
import { LIB_STATUT_STOCK } from "@/domain/rules";
import { Badge, Bouton, Carte, EnTeteSection } from "@/components/ui/primitives";
import {
  BarreBraise,
  BarreProduit,
  CourbeJours,
  Indicateur,
  Soiree,
} from "@/components/tableau-de-bord";

export const dynamic = "force-dynamic";

export default async function PageTableauDeBord() {
  const d = await chargerDashboard();
  const jour = journeeCommerciale();

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">{formatDateLongue(jour)}</p>
        <Link href="/caisse" className="hidden sm:block">
          <Bouton>
            Ouvrir la caisse <ArrowRight className="h-4 w-4" />
          </Bouton>
        </Link>
      </header>

      {/* Le hero répond à la seule question du soir. */}
      <Soiree
        resultat={d.jour.resultatNet}
        recette={d.jour.chiffreAffaires}
        marge={d.jour.margeBrute}
        charges={d.jour.charges}
        tickets={d.jour.nbTickets}
        ticketMoyen={d.jour.ticketMoyen}
        evolutionRecette={d.evolutionRecette}
      />

      <Link href="/caisse" className="sm:hidden">
        <Bouton taille="lg" className="w-full">
          <Flame className="h-5 w-5" /> Ouvrir la caisse
        </Bouton>
      </Link>

      {d.alertes.length > 0 && (
        <Link href="/stock" className="block">
          <div className="carte carte-active flex items-start gap-3 border-flamme/40 bg-flamme/[0.06] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-flamme" />
            <div className="min-w-0">
              <p className="text-menu font-bold text-craie">
                {d.alertes.length} produit{d.alertes.length > 1 ? "s" : ""} à racheter avant le
                prochain service
              </p>
              <p className="mt-1 text-micro leading-snug text-cendre">
                {d.alertes
                  .slice(0, 4)
                  .map((a) => `${a.nom} (${formatQuantite(a.stock)} ${a.unite})`)
                  .join(" · ")}
                {d.alertes.length > 4 && ` · +${d.alertes.length - 4}`}
              </p>
            </div>
            <ArrowRight className="ml-auto mt-0.5 hidden h-4 w-4 shrink-0 text-cendre sm:block" />
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CourbeJours points={d.serie} />
        </div>
        <BarreBraise
          progression={d.seuil.progression}
          caRealise={d.seuil.caRealise}
          caNecessaire={d.seuil.caNecessaire}
          resteAFaire={d.seuil.resteAFaire}
          charges={d.seuil.chargesMois}
        />
      </div>

      <section>
        <EnTeteSection eyebrow="Depuis le 1er du mois" titre="Le mois en cours" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <Indicateur libelle="Recette" valeur={formatFCFA(d.mois.chiffreAffaires)} />
          <Indicateur
            libelle="Marge brute"
            valeur={formatFCFA(d.mois.margeBrute)}
            detail={`Coût matière ${formatFCFA(d.mois.coutMatiere)}`}
          />
          <Indicateur
            libelle="Résultat net"
            valeur={formatFCFA(d.mois.resultatNet, { signe: true })}
            ton={d.mois.resultatNet >= 0 ? "positif" : "negatif"}
            detail={`${formatPourcent(d.mois.tauxMargeBrute)} de marge brute`}
          />
          <Indicateur
            libelle="Ticket moyen"
            valeur={formatFCFA(d.mois.ticketMoyen)}
            detail={`${d.mois.nbTickets} ticket${d.mois.nbTickets > 1 ? "s" : ""}`}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Carte>
            <EnTeteSection eyebrow="Classement par marge" titre="Ce qui rapporte" />
            {d.produits.length === 0 ? (
              <p className="py-10 text-center text-menu text-cendre">
                Aucune vente ce mois-ci. Le classement apparaîtra au premier ticket.
              </p>
            ) : (
              <div className="divide-y divide-charbon-700">
                {d.produits.slice(0, 8).map((p, i) => (
                  <BarreProduit
                    key={p.produitId}
                    rang={i + 1}
                    nom={p.nom}
                    quantite={p.quantite}
                    chiffreAffaires={p.chiffreAffaires}
                    margeBrute={p.margeBrute}
                    part={p.partCA}
                  />
                ))}
              </div>
            )}
          </Carte>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-1">
          <Indicateur
            libelle="Caisse disponible"
            valeur={formatFCFA(d.tresorerie)}
            ton={d.tresorerie >= 0 ? "neutre" : "negatif"}
            detail="Apports + ventes encaissées − achats − dépenses − matériel"
          />
          <Indicateur
            libelle="Valeur du stock"
            valeur={formatFCFA(d.valeurStock)}
            detail="Marchandise restante au coût d'achat"
          />
          {d.creditsEnAttente > 0 && (
            <Indicateur
              libelle="Crédits en attente"
              valeur={formatFCFA(d.creditsEnAttente)}
              ton="negatif"
              detail="Livré, pas encore encaissé"
            />
          )}
        </div>
      </div>

      {d.alertes.length > 0 && (
        <Carte>
          <EnTeteSection eyebrow="Réapprovisionnement" titre="À racheter" />
          <ul className="divide-y divide-charbon-700">
            {d.alertes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-menu font-semibold text-craie">{a.nom}</p>
                  <p className="text-micro text-cendre">
                    Seuil {formatQuantite(a.seuilAlerte)} {a.unite}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="chiffre text-menu text-craie">
                    {formatQuantite(a.stock)} {a.unite}
                  </span>
                  <Badge ton={a.statut === "RUPTURE" ? "rupture" : "alerte"}>
                    {LIB_STATUT_STOCK[a.statut]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  );
}
