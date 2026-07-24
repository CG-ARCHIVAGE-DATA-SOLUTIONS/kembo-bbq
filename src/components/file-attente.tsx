"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, Check } from "lucide-react";
import { validerVente } from "@/app/actions/ventes";
import {
  listerAttente,
  retirerDeAttente,
  EVENEMENT_FILE,
  estPanneReseau,
  type VenteEnAttente,
} from "@/lib/file-attente";
import { formatFCFA } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Rejoue les ventes saisies sans réseau. Se déclenche au chargement, au retour
 * de la connexion, et toutes les trente secondes tant qu'il reste des tickets.
 * Une vente rejouée porte sa clé d'idempotence : un double envoi ne crée pas
 * de second ticket.
 */
export function FileAttente() {
  const router = useRouter();
  const [attente, setAttente] = useState<VenteEnAttente[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [dernierEchec, setDernierEchec] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    setAttente(await listerAttente());
  }, []);

  const synchroniser = useCallback(async () => {
    if (enCours) return;
    const tickets = await listerAttente();
    if (tickets.length === 0) {
      setAttente([]);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setAttente(tickets);
      return;
    }

    setEnCours(true);
    let envoye = 0;
    for (const ticket of tickets) {
      try {
        const reponse = await validerVente({
          ...ticket.charge,
          date: ticket.charge.date,
          cleIdempotence: ticket.cle,
          origineHorsLigne: true,
        });
        if (reponse.ok) {
          await retirerDeAttente(ticket.cle);
          envoye += 1;
          setDernierEchec(null);
        } else {
          // Refus métier : le renvoyer indéfiniment ne servirait à rien.
          await retirerDeAttente(ticket.cle);
          setDernierEchec(`${ticket.charge.resume} — ${reponse.message}`);
        }
      } catch (erreur) {
        if (estPanneReseau(erreur)) break; // toujours hors ligne : on réessaiera
        setDernierEchec("Envoi impossible pour l'instant.");
        break;
      }
    }
    setEnCours(false);
    await recharger();
    if (envoye > 0) router.refresh();
  }, [enCours, recharger, router]);

  useEffect(() => {
    recharger();
    synchroniser();
    const surChangement = () => recharger();
    const surRetour = () => synchroniser();
    window.addEventListener(EVENEMENT_FILE, surChangement);
    window.addEventListener("online", surRetour);
    const minuteur = setInterval(surRetour, 30_000);
    return () => {
      window.removeEventListener(EVENEMENT_FILE, surChangement);
      window.removeEventListener("online", surRetour);
      clearInterval(minuteur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (attente.length === 0 && !dernierEchec) return null;

  const total = attente.reduce((somme, t) => somme + t.charge.total, 0);

  return (
    <div className="anim-monte mb-5">
      {attente.length > 0 && (
        <div className="carte flex flex-wrap items-center gap-3 border-flamme/40 bg-flamme/5 p-4">
          <CloudOff className="h-5 w-5 shrink-0 text-flamme" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-craie">
              {attente.length} vente{attente.length > 1 ? "s" : ""} en attente d&apos;envoi —{" "}
              <span className="chiffre">{formatFCFA(total)} FCFA</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-cendre">
              {attente.map((t) => t.charge.resume).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={synchroniser}
            disabled={enCours}
            className="flex items-center gap-2 rounded-lg border border-flamme/50 px-3 py-2 text-xs font-bold uppercase text-flamme transition-colors hover:bg-flamme/10 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", enCours && "animate-spin")} />
            {enCours ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      )}

      {dernierEchec && attente.length === 0 && (
        <div className="carte flex items-start gap-3 border-braise/40 bg-braise/5 p-4">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-braise-clair" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-craie">File vidée, avec une réserve</p>
            <p className="mt-0.5 text-xs text-cendre">{dernierEchec}</p>
          </div>
          <button
            type="button"
            onClick={() => setDernierEchec(null)}
            className="ml-auto text-xs font-semibold text-cendre hover:text-craie"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
