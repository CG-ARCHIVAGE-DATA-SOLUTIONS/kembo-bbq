/**
 * Amorçage de la base avec la carte réelle de Kembo BBQ.
 * Les prix de vente viennent de l'affiche de lancement ; les investissements et
 * les deux premiers cartons viennent du document de cadrage.
 * Aucune vente n'est créée : l'historique commercial doit rester vrai.
 */
import { PrismaClient } from "@prisma/client";
import { calculerLot, calculerCMUP, numeroSequentiel, DEFAUTS_PARAMETRE } from "../src/domain/rules";
import { hacherPin } from "../src/domain/auth";

const db = new PrismaClient();

const CATALOGUE = [
  { code: "CUI-M", nom: "Cuisse de poulet (moyenne)", categorie: "GRILLADE", unite: "piece", prixVente: 1000, seuilAlerte: 10 },
  { code: "CUI-G", nom: "Grande cuisse (LAR)", categorie: "GRILLADE", unite: "piece", prixVente: 1500, seuilAlerte: 10 },
  { code: "AIL", nom: "Ailes de poulet (portion)", categorie: "GRILLADE", unite: "portion", prixVente: 1000, seuilAlerte: 10 },
  { code: "POI", nom: "Poisson grillé (morceau)", categorie: "GRILLADE", unite: "morceau", prixVente: 1000, seuilAlerte: 10 },
  { code: "POI-E", nom: "Poisson entier grillé", categorie: "GRILLADE", unite: "piece", prixVente: 3000, seuilAlerte: 5 },
  { code: "BRO", nom: "Brochette", categorie: "GRILLADE", unite: "piece", prixVente: 500, seuilAlerte: 20 },
  { code: "ATT", nom: "Attiéké", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 500, seuilAlerte: 10 },
  { code: "BAN", nom: "Banane plantain", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 500, seuilAlerte: 10 },
  { code: "RIZ", nom: "Riz", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 500, seuilAlerte: 10 },
  { code: "MAN", nom: "Manioc", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 500, seuilAlerte: 10 },
  { code: "FRI", nom: "Frites", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 500, seuilAlerte: 10 },
  { code: "SAU", nom: "Sauce / piment", categorie: "ACCOMPAGNEMENT", unite: "portion", prixVente: 200, seuilAlerte: 0, suiviStock: false },
  { code: "EAU", nom: "Eau minérale", categorie: "BOISSON", unite: "bouteille", prixVente: 500, seuilAlerte: 12 },
  { code: "SOD", nom: "Boisson sucrée", categorie: "BOISSON", unite: "bouteille", prixVente: 700, seuilAlerte: 12 },
];

const INVESTISSEMENTS = [
  { libelle: "Chapiteau", categorie: "INSTALLATION", montant: 75000, dureeAmortissementMois: 24 },
  { libelle: "Barbecue", categorie: "MATERIEL", montant: 40000, dureeAmortissementMois: 24 },
];

const ACHATS_LANCEMENT = [
  { code: "CUI-M", conditionnement: "Carton", nb: 1, pieces: 21, montant: 11000, fournisseur: "Dépôt AURA" },
  { code: "POI", conditionnement: "Carton", nb: 1, pieces: 40, montant: 37000, fournisseur: "Marché Total" },
];

async function main() {
  console.log("Amorçage de la base Kembo BBQ…");

  // Compte gérant initial. Le code doit être changé au premier service :
  // page « Équipe » → Changer.
  const codeInitial = process.env.SEED_PIN ?? "1234";
  const gerant = await db.utilisateur.findUnique({ where: { identifiant: "gerant" } });
  if (!gerant) {
    await db.utilisateur.create({
      data: {
        nom: "Gérant",
        identifiant: "gerant",
        role: "GERANT",
        codePin: hacherPin(codeInitial),
      },
    });
    console.log(`  compte gérant créé — identifiant « gerant », code « ${codeInitial} »`);
    console.log("  ⚠ changez ce code depuis la page Équipe avant le premier service");
  }

  for (const [cle, valeur] of Object.entries(DEFAUTS_PARAMETRE)) {
    await db.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: {} });
  }

  for (const [index, p] of CATALOGUE.entries()) {
    await db.produit.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        nom: p.nom,
        categorie: p.categorie,
        unite: p.unite === "morceau" ? "portion" : p.unite,
        prixVente: p.prixVente,
        seuilAlerte: p.seuilAlerte,
        suiviStock: p.suiviStock ?? true,
        ordre: index + 1,
      },
      update: {},
    });
  }
  console.log(`  ${CATALOGUE.length} produits en carte`);

  const dateLancement = new Date("2026-07-17T09:00:00");
  for (const i of INVESTISSEMENTS) {
    const existe = await db.investissement.findFirst({ where: { libelle: i.libelle } });
    if (!existe) await db.investissement.create({ data: { ...i, date: dateLancement } });
  }
  console.log(`  ${INVESTISSEMENTS.length} investissements de départ`);

  const dateAchat = new Date("2026-07-18T10:00:00");
  let rang = 1;
  for (const a of ACHATS_LANCEMENT) {
    const produit = await db.produit.findUniqueOrThrow({ where: { code: a.code } });
    const reference = numeroSequentiel("LOT", dateAchat, rang++);
    if (await db.lot.findUnique({ where: { reference } })) continue;

    const { quantiteTotale, coutUnitaire } = calculerLot({
      nbConditionnements: a.nb,
      piecesParConditionnement: a.pieces,
      montantTotal: a.montant,
    });

    const lot = await db.lot.create({
      data: {
        reference,
        date: dateAchat,
        produitId: produit.id,
        conditionnement: a.conditionnement,
        nbConditionnements: a.nb,
        piecesParConditionnement: a.pieces,
        quantiteTotale,
        montantTotal: a.montant,
        coutUnitaire,
        fournisseur: a.fournisseur,
        paye: true,
      },
    });

    await db.mouvementStock.create({
      data: {
        date: dateAchat,
        produitId: produit.id,
        type: "ENTREE_ACHAT",
        quantite: quantiteTotale,
        coutUnitaire,
        valeur: a.montant,
        lotId: lot.id,
      },
    });

    await db.produit.update({
      where: { id: produit.id },
      data: {
        coutMoyenUnitaire: calculerCMUP({
          stockAvant: 0,
          cmupAvant: 0,
          quantiteEntree: quantiteTotale,
          montantEntree: a.montant,
        }),
      },
    });
  }
  console.log(`  ${ACHATS_LANCEMENT.length} lots de lancement en stock`);
  console.log("Terminé. Lancez « npm run dev ».");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
