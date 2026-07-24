import { db } from "@/lib/db";
import { Fiche, type FicheProduit } from "./fiche";
import { EtatVide } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function PagePrixDeRevient() {
  const produits = await db.produit.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    include: { ficheCout: true },
  });

  const fiches: FicheProduit[] = produits.map((p) => ({
    produitId: p.id,
    nom: p.nom,
    prixVente: p.prixVente,
    cmup: p.coutMoyenUnitaire,
    epices: p.ficheCout?.epices ?? 0,
    charbon: p.ficheCout?.charbon ?? 0,
    huile: p.ficheCout?.huile ?? 0,
    condiments: p.ficheCout?.condiments ?? 0,
    emballage: p.ficheCout?.emballage ?? 0,
    mainDoeuvre: p.ficheCout?.mainDoeuvre ?? 0,
    autres: p.ficheCout?.autres ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow mb-1.5">Aide à la décision</p>
        <h1 className="titre-affiche text-titre-page text-craie">Prix de revient</h1>
        <p className="mt-2 max-w-2xl text-menu leading-relaxed text-cendre">
          Ce que coûte réellement une portion, tout compris. Ces chiffres servent à fixer un prix
          de vente : ils ne sont pas repris dans le compte de résultat, où le charbon et
          l&apos;emballage sont déjà comptés comme des dépenses.
        </p>
      </header>

      {fiches.length === 0 ? (
        <EtatVide titre="Aucun produit" message="Créez d'abord votre carte dans la page Produits." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {fiches.map((f) => (
            <Fiche key={f.produitId} initiale={f} />
          ))}
        </div>
      )}
    </div>
  );
}
