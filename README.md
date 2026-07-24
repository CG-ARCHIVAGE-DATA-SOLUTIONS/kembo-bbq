# Kembo BBQ — application de gestion

Application monolithique Next.js pour piloter l'activité de grillades Kembo BBQ
(Brazzaville) : caisse, stock, coûts, rentabilité.

Elle reprend exactement la logique du classeur Excel de cadrage, mais en supprime
les deux limites qui gênent sur le terrain : la double saisie et l'absence de
notion de ticket.

---

## Démarrer

```bash
cp .env.example .env
npm install
npx prisma db push     # crée le fichier SQLite et les tables
npm run db:seed        # compte gérant, carte réelle, investissements, lots
npm run dev            # http://localhost:3000
```

Le seed crée un compte **gérant** — identifiant `gerant`, code `1234`.
**Changez-le au premier lancement** depuis la page Équipe. En production,
`AUTH_SECRET` est obligatoire : `openssl rand -hex 32`.

Réinitialiser complètement : `npm run db:reset`.

Deux points à connaître :

- `npx prisma generate` télécharge un binaire moteur au premier lancement : il
  faut une connexion Internet une seule fois.
- `next/font` télécharge les polices à la construction, puis les sert en local :
  l'application fonctionne ensuite hors ligne.

### En production

```bash
docker build -t kembo-bbq .
docker run -p 3000:3000 -v kembo-data:/app/data kembo-bbq
```

La base entière tient dans un fichier. Sauvegarder = copier `kembo.db`.

---

## Stack

| Choix | Raison |
|---|---|
| Next.js 16, App Router | Un seul processus, rendu serveur, aucune API à maintenir |
| Server Actions | Les mutations partent du composant, sans couche REST intermédiaire |
| Prisma + SQLite | Zéro serveur de base, sauvegarde par copie de fichier, tient sur un petit VPS |
| Zod | La validation vit à la frontière (les actions), pas dans l'UI |
| Tailwind CSS v4 | Tokens de couleur et de typographie déclarés dans `globals.css` |

### Organisation

```
src/
  domain/      règles de gestion et services métier (aucun JSX ici)
    rules.ts       ← RG-01 à RG-14, énumérations, calculs purs
    stock.ts       journal de mouvements, CMUP, état du stock
    ventes.ts      enregistrement d'un ticket
    achats.ts      création d'un lot
    conso.ts       sorties non vendues
    analytics.ts   indicateurs du tableau de bord
    rapports.ts    compte de résultat et trésorerie mensuels
  app/
    actions/     Server Actions : valident (Zod) puis délèguent au domaine
    <module>/    pages ; les composants clients sont suffixés par leur rôle
  components/  primitives d'interface et blocs du tableau de bord
  lib/         base, monnaie, dates, utilitaires
```

Une règle de gestion ne s'écrit qu'à un seul endroit : `src/domain/`. Les pages
affichent, les actions valident, le domaine décide.

---

## Règles de gestion

| # | Règle |
|---|---|
| RG-01 | Code produit unique, prix entier en FCFA. Un produit non suivi en stock (sauce préparée sur place) n'a pas de coût matière. |
| RG-02 | Un achat crée un lot : quantité = unités × pièces par unité ; coût unitaire = montant / quantité. |
| RG-03 | Le stock n'est jamais écrasé : c'est la somme d'un journal de mouvements signés. Toute correction passe par un ajustement d'inventaire tracé. |
| RG-04 | CMUP recalculé à chaque entrée : `(valeur du stock + montant de l'achat) / (quantité + quantité entrée)`. Stock nul ou négatif → le CMUP prend le coût du lot entrant. |
| RG-05 | Une vente fige le CMUP de l'instant sur chaque ligne : un achat plus cher demain ne réécrit pas la marge d'hier. |
| RG-06 | Le prix catalogue est une proposition : chaque ligne de ticket reste modifiable. |
| RG-07 | Stock insuffisant : `AVERTIR` (défaut) laisse passer et signale, `BLOQUER` refuse. Paramétrable. |
| RG-08 | Une consommation interne sort au CMUP, avec motif obligatoire, et n'est jamais un chiffre d'affaires. |
| RG-09 | Coût matière ≠ prix de revient complet. Le charbon et l'emballage sont des charges ; la fiche de coût sert à fixer un prix, pas à calculer le bénéfice. |
| RG-10 | CA − coût matière = marge brute ; − charges − conso interne − amortissements = résultat net. |
| RG-11 | Amortissement mensuel = montant / durée, compté à partir du mois d'acquisition. |
| RG-12 | Trésorerie = apports + ventes encaissées − achats − dépenses − investissements. Une vente à crédit n'entre pas en caisse. |
| RG-13 | Seuil de rentabilité = charges de la période / taux de marge brute. |
| RG-14 | Une journée clôturée est verrouillée. La réouverture est explicite et tracée. |
| RG-15 | Une vente à crédit entre en trésorerie au règlement, pas à la livraison. |
| RG-16 | Chaque ticket porte l'identité de son auteur. Retirer un accès ne supprime jamais ses ventes. |
| RG-17 | Deux rôles : gérant (tout) et vendeur (caisse + lecture du stock). Le contrôle est dans les Server Actions, pas seulement dans le menu. |
| RG-18 | Une vente hors ligne garde son heure réelle et une clé unique : rejouée, elle ne crée pas de doublon, et elle est acceptée même si la journée a été clôturée entre-temps. |

Deux conventions structurantes :

- **La journée commerciale bascule à 4 h du matin** (`HEURE_BASCULE`). Une vente
  saisie à 00 h 40 appartient à la soirée de la veille — c'est ainsi qu'on
  compte quand on ferme après minuit.
- **Les montants sont des entiers.** Le franc CFA ne circule pas en centimes.
  Seuls les coûts unitaires restent décimaux (un carton de 21 cuisses à 11 000
  FCFA donne 523,81 FCFA la pièce) et ne sont arrondis qu'à l'affichage.

---

## Modules livrés

| Module | Page | Contenu |
|---|---|---|
| Tableau de bord | `/` | Recette et résultat du jour, courbe 14 jours, seuil de rentabilité, classement par marge, alertes |
| Caisse | `/caisse` | Grille tactile, ticket multi-lignes, remise, mode de paiement, tickets du soir |
| Achats | `/achats` | Saisie d'un lot avec coût réel à la pièce calculé avant validation |
| Stock | `/stock` | État par produit, valeur, statut, saisie d'inventaire en ligne |
| Conso interne | `/conso` | Repas, offerts, pertes ; coût réel et manque à gagner |
| Dépenses | `/depenses` | Charges par catégorie et répartition du mois |
| Investissements | `/investissements` | Matériel, amortissement mensuel, apports |
| Rapports | `/rapports` | Compte de résultat et trésorerie mois par mois, clôture des journées |
| Produits | `/produits` | Carte, prix, marge par rapport au coût moyen |
| Prix de revient | `/revient` | Fiche de coût complet par portion, marge réelle |
| Crédits clients | `/credits` | Ventes livrées non réglées, encaissement au fil de l'eau |
| Équipe | `/equipe` | Comptes, rôles, codes d'accès |
| Connexion | `/connexion` | Code à chiffres au clavier numérique |

---

## Interface

L'identité vient de l'affiche de lancement : charbon, rouge braise, jaune
flamme. Anton pour les titres, Manrope pour le texte, IBM Plex Mono pour tous
les montants — les chiffres s'alignent en colonne, toujours.

Deux éléments portent la marque : **la grille du barbecue** en fond de l'écran
de vente, où les produits reposent littéralement sur les barreaux, et **la barre
de braise**, qui chauffe de la cendre à la flamme à mesure que le mois couvre
ses charges.

### Ce qui change selon l'écran

| | Téléphone | Écran large |
|---|---|---|
| Listes | une carte par ligne, colonnes de confort masquées | tableau, en-tête collant |
| Formulaires | panneau qui monte du bas, sous le pouce | boîte centrée |
| Ticket de caisse | barre accrochée au-dessus de la navigation, dépliable | panneau latéral toujours visible |
| Compte de résultat | défilement latéral, colonne des libellés accrochée | tableau complet |
| Navigation | 5 raccourcis en bas + page Menu | colonne latérale groupée |

Une seule définition de colonnes produit les deux rendus
(`src/components/ui/liste.tsx`) : chaque colonne déclare son rôle — titre,
montant, détail, statut, action — et la version téléphone s'en sert pour
composer la carte.

### Détails d'exécution

- Typographie fluide en `clamp()` : pas de rupture visible entre les tailles.
- Zones sûres respectées (`env(safe-area-inset-*)`) : la barre basse ne passe
  jamais sous la barre d'accueil de l'iPhone.
- Champs à 16 px minimum : iOS ne zoome pas à la saisie.
- Cibles tactiles de 44 px : on saisit debout, souvent d'une main.
- Retours d'action centralisés en bas d'écran plutôt que sous chaque
  formulaire, où ils tombaient hors de vue après un appui.
- Squelettes de chargement par route, focus clavier visible, `prefers-reduced-motion` respecté.

---

## Accès et rôles

On s'identifie avec un code à chiffres sur un clavier numérique : sur un
téléphone, debout, près du feu, un mot de passe alphanumérique n'est pas
utilisable. Le code est stocké haché (scrypt, sel par utilisateur).

| | Gérant | Vendeur |
|---|:---:|:---:|
| Caisse | ● | ● |
| Stock (lecture) | ● | ● |
| Achats, dépenses, conso interne | ● | |
| Rapports, trésorerie, clôture | ● | |
| Produits, prix de revient, équipe | ● | |

Le `middleware.ts` ne fait qu'une redirection de confort : il tourne sur le
runtime Edge, où `node:crypto` n'existe pas. La vérification réelle de la
signature de session se fait côté serveur dans `sessionCourante()`, et chaque
Server Action sensible appelle `exigerGerant()`. Masquer un lien n'est pas une
protection.

---

## Mode hors ligne

Le service se tient en plein air : la connexion tombe. L'application est
installable (PWA) et la caisse continue de fonctionner sans réseau.

1. Le service worker garde la coquille de l'application en cache — la caisse
   s'ouvre même sans connexion.
2. Une vente qui ne part pas est écrite dans IndexedDB avec **son heure réelle**
   et une **clé d'idempotence** générée avant l'envoi.
3. Un bandeau indique le nombre de tickets en attente et leur montant.
4. La file se vide au retour de la connexion, au chargement d'une page, et
   toutes les trente secondes. Un renvoi ne crée jamais de doublon.

Les mutations ne sont jamais mises en cache par le service worker : elles
passent ou elles échouent, et la file prend le relais.

---

## Suite

Non encore fait, par ordre d'utilité :

1. **Export Excel / PDF** — reprendre la mise en page du classeur existant pour
   sortir le compte de résultat et l'état du stock.
2. **Journal des modifications** — tracer qui a supprimé un achat ou rouvert une
   journée. Aujourd'hui seul l'auteur des ventes est enregistré.
3. **Relances crédit** — message WhatsApp pré-rempli vers le client débiteur.
4. **Multi-points de vente** — un deuxième emplacement partageant le catalogue.
5. **Sauvegarde automatique** — copie datée du fichier SQLite vers un stockage
   distant.
# kembo-bbq
