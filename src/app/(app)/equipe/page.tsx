import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { sessionCourante, LIB_ROLE, type Role } from "@/domain/auth";
import { formatDate } from "@/lib/dates";
import { Badge, EnTetePage, EtatVide } from "@/components/ui/primitives";
import { ListeAdaptative, Empile, type Colonne } from "@/components/ui/liste";
import { FormulaireUtilisateur, GestionUtilisateur } from "./equipe-client";

export const dynamic = "force-dynamic";

type Membre = {
  id: string;
  nom: string;
  identifiant: string;
  role: string;
  actif: boolean;
  dernierAcces: Date | null;
  _count: { ventes: number };
};

export default async function PageEquipe() {
  const moi = await sessionCourante();
  if (!moi) redirect("/connexion");
  if (moi.role !== "GERANT") redirect("/caisse");

  const utilisateurs = await db.utilisateur.findMany({
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
    include: { _count: { select: { ventes: true } } },
  });

  const colonnes: Colonne<Membre>[] = [
    {
      cle: "nom",
      entete: "Nom",
      role: "titre",
      rendu: (u) => (
        <span className="flex flex-wrap items-center gap-2">
          <Empile principal={u.nom} secondaire={u.identifiant} />
          {u.id === moi.id && <Badge ton="flamme">Vous</Badge>}
        </span>
      ),
    },
    {
      cle: "acces",
      entete: "Dernier accès",
      role: "meta",
      rendu: (u) => (u.dernierAcces ? `Vu le ${formatDate(u.dernierAcces)}` : "Jamais connecté"),
    },
    {
      cle: "tickets",
      entete: "Tickets saisis",
      align: "droite",
      rendu: (u) => <span className="chiffre">{u._count.ventes}</span>,
    },
    {
      cle: "role",
      entete: "Rôle",
      role: "statut",
      align: "centre",
      rendu: (u) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge ton={u.role === "GERANT" ? "ok" : "neutre"}>
            {LIB_ROLE[u.role as Role] ?? u.role}
          </Badge>
          {!u.actif && <Badge ton="rupture">Sans accès</Badge>}
        </span>
      ),
    },
    {
      cle: "actions",
      entete: "",
      role: "action",
      align: "droite",
      rendu: (u) => (
        <GestionUtilisateur
          id={u.id}
          nom={u.nom}
          role={u.role as Role}
          actif={u.actif}
          estMoi={u.id === moi.id}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <EnTetePage
        eyebrow="Qui a accès"
        titre="Équipe"
        intro="Chaque ticket porte le nom de la personne qui l'a saisi. Retirer l'accès à quelqu'un ne supprime jamais ses ventes."
        action={<FormulaireUtilisateur />}
      />

      <ListeAdaptative
        items={utilisateurs}
        cle={(u) => u.id}
        colonnes={colonnes}
        vide={
          <EtatVide
            icone={<Users className="h-6 w-6" />}
            titre="Aucun accès"
            message="Créez au moins un compte gérant pour utiliser l'application."
          />
        }
      />
    </div>
  );
}
