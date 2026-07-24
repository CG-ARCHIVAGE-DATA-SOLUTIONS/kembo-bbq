import { db } from "@/lib/db";
import { stocksParProduit } from "@/domain/stock";
import { ventesDuJour } from "@/domain/ventes";
import { lireParametre } from "@/domain/parametres";
import { CLES_PARAMETRE } from "@/domain/rules";
import { formatHeure, formatDateLongue, journeeCommerciale } from "@/lib/dates";
import { EnTetePage } from "@/components/ui/primitives";
import { Caisse, TicketsDuJour, type ProduitCaisse } from "./caisse-client";

export const dynamic = "force-dynamic";

export default async function PageCaisse() {
  const [produits, stocks, tickets, nomEtablissement] = await Promise.all([
    db.produit.findMany({ where: { actif: true }, orderBy: [{ ordre: "asc" }, { nom: "asc" }] }),
    stocksParProduit(),
    ventesDuJour(),
    lireParametre(CLES_PARAMETRE.NOM_ETABLISSEMENT),
  ]);

  const produitsCaisse: ProduitCaisse[] = produits.map((p) => ({
    id: p.id,
    code: p.code,
    nom: p.nom,
    categorie: p.categorie,
    unite: p.unite,
    prixVente: p.prixVente,
    suiviStock: p.suiviStock,
    stock: stocks.get(p.id) ?? 0,
  }));

  const listeTickets = tickets.map((t) => ({
    id: t.id,
    numero: t.numero,
    heure: formatHeure(t.date),
    total: t.total,
    remise: t.remise,
    modePaiement: t.modePaiement,
    articles: t.lignes.map((l) => `${l.quantite}× ${l.designation}`).join(", "),
    vendeur: t.utilisateur?.nom ?? null,
    lignes: t.lignes.map((l) => ({
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      total: l.total,
    })),
  }));

  return (
    <div>
      <div className="mb-5">
        <EnTetePage
          eyebrow={formatDateLongue(journeeCommerciale())}
          titre="Caisse"
          intro="Touchez un produit pour l'ajouter au ticket. Le prix reste modifiable ligne par ligne, et le stock se décrémente à l'encaissement."
        />
      </div>

      <Caisse produits={produitsCaisse} />
      <TicketsDuJour tickets={listeTickets} nomEtablissement={nomEtablissement} />
    </div>
  );
}
