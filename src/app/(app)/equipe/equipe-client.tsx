"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Settings2 } from "lucide-react";
import { creerUtilisateur, modifierUtilisateur, changerCode, basculerUtilisateur } from "@/app/actions/auth";
import { ROLES, LIB_ROLE, type Role } from "@/domain/roles";
import { Bouton, Champ, Selecteur } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";

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

export function GestionUtilisateur({
  id,
  nom: nomInitial,
  role: roleInitial,
  actif,
  estMoi,
}: {
  id: string;
  nom: string;
  role: Role;
  actif: boolean;
  estMoi: boolean;
}) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [nom, setNom] = useState(nomInitial);
  const [role, setRole] = useState<Role>(roleInitial);
  const [nouveauCode, setNouveauCode] = useState("");

  return (
    <Feuille
      titre={`Gérer ${nomInitial}`}
      declencheur={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={`Gérer ${nomInitial}`}
          className="rounded-lg p-2 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      )}
    >
      {(fermer) => (
        <div className="flex flex-col gap-5">
          {/* ── Identité */}
          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Identité</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ
                label="Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Prénom"
              />
              <Selecteur
                label="Rôle"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                options={ROLES.map((r) => ({ valeur: r, libelle: LIB_ROLE[r] }))}
              />
            </div>
            <Bouton
              taille="sm"
              variante="secondaire"
              className="mt-3"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await modifierUtilisateur(id, { nom, role });
                  annoncer(r.ok ? "ok" : "erreur", r.message);
                  if (r.ok) { fermer(); router.refresh(); }
                })
              }
            >
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Bouton>
          </section>

          <hr className="border-charbon-700" />

          {/* ── Code d'accès */}
          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Code d'accès</p>
            <div className="flex gap-2">
              <Champ
                label="Nouveau code"
                type="password"
                inputMode="numeric"
                value={nouveauCode}
                onChange={(e) => setNouveauCode(e.target.value.replace(/\D/g, ""))}
                placeholder="4 à 8 chiffres"
                className="flex-1"
              />
              <Bouton
                variante="secondaire"
                taille="sm"
                className="mt-auto"
                disabled={enCours || nouveauCode.length < 4}
                onClick={() =>
                  demarrer(async () => {
                    const r = await changerCode(id, nouveauCode);
                    annoncer(r.ok ? "ok" : "erreur", r.message);
                    if (r.ok) setNouveauCode("");
                  })
                }
              >
                Changer
              </Bouton>
            </div>
          </section>

          <hr className="border-charbon-700" />

          {/* ── Accès */}
          <section>
            <p className="mb-3 text-micro font-bold uppercase tracking-wider text-cendre">Accès à l'application</p>
            {estMoi ? (
              <p className="text-sm text-cendre">Vous ne pouvez pas désactiver votre propre compte.</p>
            ) : (
              <Bouton
                variante="danger"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    const r = await basculerUtilisateur(id);
                    annoncer(r.ok ? "ok" : "erreur", r.message);
                    if (r.ok) { fermer(); router.refresh(); }
                  })
                }
              >
                {actif ? "Retirer l'accès" : "Rendre l'accès"}
              </Bouton>
            )}
          </section>
        </div>
      )}
    </Feuille>
  );
}
