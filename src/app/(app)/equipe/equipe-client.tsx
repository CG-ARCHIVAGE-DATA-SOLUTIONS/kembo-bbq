"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { creerUtilisateur, changerCode, basculerUtilisateur } from "@/app/actions/auth";
import { ROLES, LIB_ROLE, type Role } from "@/domain/roles";
import { Bouton, Champ, Selecteur } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";
import { cn } from "@/lib/utils";

export function FormulaireUtilisateur() {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [nom, setNom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("VENDEUR");

  return (
    <Feuille
      titre="Ajouter une personne"
      description="Un vendeur accède à la caisse et au stock. Le gérant voit les chiffres, les achats, les dépenses et les réglages."
      declencheur={(ouvrir) => (
        <Bouton onClick={ouvrir}>
          <UserPlus className="h-4 w-4" /> Ajouter une personne
        </Bouton>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ
              label="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Prénom"
            />
            <Champ
              label="Identifiant"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="prenom"
              aide="Sans espace ni accent."
            />
            <Champ
              label="Code d'accès"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4 à 8 chiffres"
            />
            <Selecteur
              label="Rôle"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              options={ROLES.map((r) => ({ valeur: r, libelle: LIB_ROLE[r] }))}
            />
          </div>

          <Bouton
            taille="lg"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const reponse = await creerUtilisateur({ nom, identifiant, pin, role });
                annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
                if (reponse.ok) {
                  setNom("");
                  setIdentifiant("");
                  setPin("");
                  fermer();
                  router.refresh();
                }
              })
            }
          >
            {enCours ? "Enregistrement…" : "Donner l'accès"}
          </Bouton>
        </div>
      )}
    </Feuille>
  );
}

export function ActionsUtilisateur({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();
  const [nouveauCode, setNouveauCode] = useState("");

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <input
        value={nouveauCode}
        onChange={(e) => setNouveauCode(e.target.value.replace(/\D/g, ""))}
        placeholder="Nouveau code"
        aria-label="Nouveau code d'accès"
        type="password"
        inputMode="numeric"
        className="h-10 w-32 rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 px-2 text-menu text-craie placeholder:text-charbon-400 focus:border-flamme focus:outline-none"
      />
      <Bouton
        taille="sm"
        variante="secondaire"
        disabled={enCours || nouveauCode.length < 4}
        onClick={() =>
          demarrer(async () => {
            const reponse = await changerCode(id, nouveauCode);
            annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
            if (reponse.ok) setNouveauCode("");
            router.refresh();
          })
        }
      >
        Changer le code
      </Bouton>
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const reponse = await basculerUtilisateur(id);
            annoncer(reponse.ok ? "ok" : "erreur", reponse.message);
            router.refresh();
          })
        }
        className={cn(
          "text-micro font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
          actif ? "text-cendre hover:text-braise-clair" : "text-vert hover:text-craie",
        )}
      >
        {actif ? "Retirer l'accès" : "Rendre l'accès"}
      </button>
    </div>
  );
}
