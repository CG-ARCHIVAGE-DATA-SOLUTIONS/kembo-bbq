"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Check, Search, ChevronUp, Printer, Download } from "lucide-react";
import { validerVente } from "@/app/actions/ventes";
import { mettreEnAttente, nouvelleCle, estPanneReseau } from "@/lib/file-attente";
import { formatFCFA, formatQuantite } from "@/lib/money";
import {
  LIB_CATEGORIE_PRODUIT,
  LIB_PAIEMENT,
  MODES_PAIEMENT,
  type CategorieProduit,
  type ModePaiement,
} from "@/domain/rules";
import { Bouton, Badge, Segmente } from "@/components/ui/primitives";
import { Feuille } from "@/components/ui/feuille";
import { useAnnonce } from "@/components/ui/annonces";
import { cn } from "@/lib/utils";

export type ProduitCaisse = {
  id: string;
  code: string;
  nom: string;
  categorie: string;
  unite: string;
  prixVente: number;
  suiviStock: boolean;
  stock: number;
};

type LigneTicket = {
  produitId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  stock: number;
  suiviStock: boolean;
};

const ORDRE: CategorieProduit[] = ["GRILLADE", "ACCOMPAGNEMENT", "BOISSON", "AUTRE"];

export function Caisse({ produits }: { produits: ProduitCaisse[] }) {
  const router = useRouter();
  const annoncer = useAnnonce();
  const [enCours, demarrer] = useTransition();

  const [lignes, setLignes] = useState<LigneTicket[]>([]);
  const [modePaiement, setModePaiement] = useState<ModePaiement>("ESPECES");
  const [remise, setRemise] = useState(0);
  const [client, setClient] = useState("");
  const [filtre, setFiltre] = useState<CategorieProduit | "TOUT">("TOUT");
  const [recherche, setRecherche] = useState("");

  const categories = useMemo(
    () => ORDRE.filter((c) => produits.some((p) => p.categorie === c)),
    [produits],
  );

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return produits.filter(
      (p) =>
        (filtre === "TOUT" || p.categorie === filtre) &&
        (terme === "" ||
          p.nom.toLowerCase().includes(terme) ||
          p.code.toLowerCase().includes(terme)),
    );
  }, [produits, filtre, recherche]);

  const brut = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
  const total = Math.max(0, brut - remise);
  const nbArticles = lignes.reduce((s, l) => s + l.quantite, 0);

  function ajouter(produit: ProduitCaisse) {
    setLignes((actuelles) => {
      const index = actuelles.findIndex((l) => l.produitId === produit.id);
      if (index >= 0) {
        const copie = [...actuelles];
        copie[index] = { ...copie[index], quantite: copie[index].quantite + 1 };
        return copie;
      }
      return [
        ...actuelles,
        {
          produitId: produit.id,
          nom: produit.nom,
          prixUnitaire: produit.prixVente,
          quantite: 1,
          stock: produit.stock,
          suiviStock: produit.suiviStock,
        },
      ];
    });
  }

  const changerQuantite = (produitId: string, delta: number) =>
    setLignes((actuelles) =>
      actuelles
        .map((l) => (l.produitId === produitId ? { ...l, quantite: l.quantite + delta } : l))
        .filter((l) => l.quantite > 0),
    );

  const changerPrix = (produitId: string, prix: number) =>
    setLignes((actuelles) =>
      actuelles.map((l) => (l.produitId === produitId ? { ...l, prixUnitaire: prix } : l)),
    );

  function viderTicket() {
    setLignes([]);
    setRemise(0);
    setClient("");
  }

  function encaisser(apresSucces?: () => void) {
    if (lignes.length === 0) {
      annoncer("erreur", "Le ticket est vide : touchez un produit pour l'ajouter.");
      return;
    }

    // La clé est fixée avant l'envoi : si le réseau lâche en route, le renvoi
    // portera la même clé et ne créera pas de second ticket.
    const cle = nouvelleCle();
    const charge = {
      lignes: lignes.map((l) => ({
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
      modePaiement,
      remise,
      client: modePaiement === "CREDIT" ? client.trim() || undefined : undefined,
      date: new Date().toISOString(),
      resume: lignes.map((l) => `${l.quantite}× ${l.nom}`).join(", "),
      total,
    };

    demarrer(async () => {
      try {
        const reponse = await validerVente({ ...charge, cleIdempotence: cle });
        if (!reponse.ok) {
          annoncer("erreur", reponse.message);
          return;
        }
        const alerte = reponse.avertissements?.length
          ? ` Stock à vérifier : ${reponse.avertissements.join(" ")}`
          : "";
        annoncer(
          "ok",
          `${formatFCFA(reponse.data?.total ?? 0)} FCFA encaissés — ticket ${reponse.data?.numero}.${alerte}`,
        );
        viderTicket();
        apresSucces?.();
        router.refresh();
      } catch (erreur) {
        if (!estPanneReseau(erreur)) {
          annoncer("erreur", "Enregistrement impossible. Réessayez.");
          return;
        }
        const garde = await mettreEnAttente({ cle, creeLe: Date.now(), charge });
        if (garde) {
          annoncer(
            "attente",
            `Pas de réseau : ticket de ${formatFCFA(total)} FCFA gardé sur le téléphone. Il partira au retour de la connexion.`,
          );
          viderTicket();
          apresSucces?.();
        } else {
          annoncer(
            "erreur",
            "Pas de réseau et impossible de garder le ticket. Notez-le sur papier.",
          );
        }
      }
    });
  }

  const detailTicket = (fermer?: () => void) => (
    <PanneauTicket
      lignes={lignes}
      total={total}
      brut={brut}
      remise={remise}
      setRemise={setRemise}
      modePaiement={modePaiement}
      setModePaiement={setModePaiement}
      client={client}
      setClient={setClient}
      changerQuantite={changerQuantite}
      changerPrix={changerPrix}
      viderTicket={viderTicket}
      encaisser={() => encaisser(fermer)}
      enCours={enCours}
    />
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* ─────────── Le gril */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cendre" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Chercher un produit"
                aria-label="Chercher un produit"
                className="h-11 w-full rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 pl-9 pr-3 text-craie placeholder:text-charbon-400 focus:border-flamme focus:outline-none"
              />
            </div>
            <Segmente
              etiquette="Filtrer par catégorie"
              valeur={filtre}
              onChange={setFiltre}
              options={[
                { valeur: "TOUT" as const, libelle: "Tout" },
                ...categories.map((c) => ({ valeur: c, libelle: LIB_CATEGORIE_PRODUIT[c] })),
              ]}
            />
          </div>

          <div className="grille-braise rounded-[var(--radius-carte)] border border-charbon-600 bg-charbon-800 p-2.5 sm:p-3">
            {visibles.length === 0 ? (
              <p className="px-4 py-14 text-center text-menu text-cendre">
                {recherche
                  ? `Aucun produit ne correspond à « ${recherche} ».`
                  : "Aucun produit dans cette catégorie."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 xl:grid-cols-4">
                {visibles.map((p) => {
                  const dansTicket = lignes.find((l) => l.produitId === p.id);
                  const rupture = p.suiviStock && p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ajouter(p)}
                      className={cn(
                        "group relative flex min-h-[96px] flex-col justify-between rounded-xl border p-3 text-left transition-all",
                        "border-charbon-500 bg-charbon-700 active:scale-[0.97]",
                        "hover:border-flamme hover:bg-charbon-600",
                        dansTicket && "border-flamme/70 bg-charbon-600",
                        rupture && !dansTicket && "border-braise/40",
                      )}
                    >
                      {dansTicket && (
                        <span className="chiffre absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-flamme px-1.5 text-micro font-bold text-charbon-900">
                          {dansTicket.quantite}
                        </span>
                      )}
                      <span className="text-menu font-bold leading-tight text-craie">{p.nom}</span>
                      <span className="flex items-end justify-between gap-2">
                        <span className="chiffre text-corps font-semibold text-flamme">
                          {formatFCFA(p.prixVente)}
                        </span>
                        {p.suiviStock && (
                          <span
                            className={cn(
                              "chiffre text-micro",
                              rupture ? "text-braise-clair" : "text-cendre",
                            )}
                          >
                            {formatQuantite(p.stock)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─────────── Bureau : le ticket reste visible en permanence */}
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
          <div className="carte overflow-hidden p-0">{detailTicket()}</div>
        </aside>
      </div>

      {/* ─────────── Téléphone : le ticket est accroché sous le pouce */}
      {nbArticles > 0 && (
        <div
          className="fixed inset-x-0 z-40 px-3 lg:hidden"
          style={{
            bottom: "calc(var(--hauteur-barre) + env(safe-area-inset-bottom, 0px) + 0.5rem)",
          }}
        >
          <Feuille
            titre="Ticket en cours"
            declencheur={(ouvrir) => (
              <button
                type="button"
                onClick={ouvrir}
                className="anim-monte flex w-full items-center gap-3 rounded-[var(--radius-carte)] border border-flamme/50 bg-charbon-700/95 px-4 py-3 shadow-2xl backdrop-blur"
              >
                <span className="chiffre flex h-8 min-w-8 items-center justify-center rounded-lg bg-flamme px-2 text-menu font-bold text-charbon-900">
                  {nbArticles}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-micro uppercase tracking-wide text-cendre">
                    Ticket en cours
                  </span>
                  <span className="chiffre block text-corps font-semibold text-craie">
                    {formatFCFA(total)} FCFA
                  </span>
                </span>
                <ChevronUp className="h-5 w-5 shrink-0 text-flamme" />
              </button>
            )}
          >
            {(fermer) => detailTicket(fermer)}
          </Feuille>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════ Contenu du ticket */

function PanneauTicket({
  lignes,
  total,
  brut,
  remise,
  setRemise,
  modePaiement,
  setModePaiement,
  client,
  setClient,
  changerQuantite,
  changerPrix,
  viderTicket,
  encaisser,
  enCours,
}: {
  lignes: LigneTicket[];
  total: number;
  brut: number;
  remise: number;
  setRemise: (n: number) => void;
  modePaiement: ModePaiement;
  setModePaiement: (m: ModePaiement) => void;
  client: string;
  setClient: (s: string) => void;
  changerQuantite: (id: string, delta: number) => void;
  changerPrix: (id: string, prix: number) => void;
  viderTicket: () => void;
  encaisser: () => void;
  enCours: boolean;
}) {
  const nbArticles = lignes.reduce((s, l) => s + l.quantite, 0);

  return (
    <div className="flex flex-col">
      <div className="hidden items-center justify-between border-b border-charbon-600 px-4 py-3 lg:flex">
        <div>
          <p className="eyebrow">Ticket en cours</p>
          <p className="titre-affiche text-titre text-craie">
            {nbArticles} article{nbArticles > 1 ? "s" : ""}
          </p>
        </div>
        {lignes.length > 0 && (
          <button
            type="button"
            onClick={viderTicket}
            aria-label="Vider le ticket"
            className="rounded-lg p-2 text-cendre transition-colors hover:bg-charbon-700 hover:text-braise-clair"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="max-h-[46vh] overflow-y-auto">
        {lignes.length === 0 ? (
          <p className="px-4 py-12 text-center text-menu text-cendre">
            Touchez un produit sur le gril pour commencer le ticket.
          </p>
        ) : (
          <ul className="divide-y divide-charbon-700">
            {lignes.map((l) => (
              <li key={l.produitId} className="anim-monte px-4 py-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-menu font-semibold text-craie">{l.nom}</p>
                  <p className="chiffre shrink-0 text-menu text-craie">
                    {formatFCFA(l.prixUnitaire * l.quantite)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-[var(--radius-champ)] border border-charbon-500">
                    <button
                      type="button"
                      onClick={() => changerQuantite(l.produitId, -1)}
                      aria-label={`Retirer un ${l.nom}`}
                      className="px-3 py-2.5 text-cendre transition-colors hover:text-craie"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="chiffre min-w-8 text-center text-menu font-semibold text-craie">
                      {l.quantite}
                    </span>
                    <button
                      type="button"
                      onClick={() => changerQuantite(l.produitId, 1)}
                      aria-label={`Ajouter un ${l.nom}`}
                      className="px-3 py-2.5 text-cendre transition-colors hover:text-craie"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="flex flex-1 items-center gap-1.5">
                    <span className="sr-only">Prix unitaire de {l.nom}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={l.prixUnitaire}
                      min={0}
                      step={50}
                      onChange={(e) => changerPrix(l.produitId, Number(e.target.value))}
                      className="chiffre h-10 w-full rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 px-2 text-right text-menu text-craie focus:border-flamme focus:outline-none"
                    />
                    <span className="text-micro text-cendre">/u</span>
                  </label>
                </div>
                {l.suiviStock && l.quantite > l.stock && (
                  <p className="mt-1.5 text-micro text-flamme">
                    Stock théorique : {formatQuantite(l.stock)}. La vente passe quand même.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-charbon-600 px-4 py-3">
        <div className="mb-3 flex gap-1.5">
          {MODES_PAIEMENT.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModePaiement(m)}
              aria-pressed={modePaiement === m}
              className={cn(
                "flex-1 rounded-[var(--radius-champ)] border px-2 py-2.5 text-micro font-bold uppercase transition-colors",
                modePaiement === m
                  ? "border-flamme bg-flamme/10 text-flamme"
                  : "border-charbon-500 text-cendre hover:text-craie",
              )}
            >
              {LIB_PAIEMENT[m]}
            </button>
          ))}
        </div>

        {modePaiement === "CREDIT" && (
          <div className="anim-monte mb-3">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nom du client"
              aria-label="Nom du client à crédit"
              className="mb-1.5 h-11 w-full rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 px-3 text-craie placeholder:text-charbon-400 focus:border-flamme focus:outline-none"
            />
            <p className="text-micro leading-snug text-cendre">
              Compté dans la recette, mais pas dans la caisse tant que le client n&apos;a pas payé.
              Le ticket ira dans « Crédits clients ».
            </p>
          </div>
        )}

        <label className="mb-3 flex items-center justify-between gap-3">
          <span className="text-micro uppercase tracking-wide text-cendre">Remise</span>
          <input
            type="number"
            inputMode="numeric"
            value={remise}
            min={0}
            step={100}
            onChange={(e) => setRemise(Math.max(0, Number(e.target.value)))}
            className="chiffre h-10 w-28 rounded-[var(--radius-champ)] border border-charbon-500 bg-charbon-900 px-2 text-right text-menu text-craie focus:border-flamme focus:outline-none"
          />
        </label>

        <div className="mb-3 flex items-end justify-between gap-3">
          <span className="eyebrow">À encaisser</span>
          <span className="text-right">
            {remise > 0 && (
              <span className="chiffre block text-micro text-cendre line-through">
                {formatFCFA(brut)}
              </span>
            )}
            <span className="chiffre block text-nombre font-semibold leading-none text-flamme">
              {formatFCFA(total)}
            </span>
          </span>
        </div>

        <Bouton
          onClick={encaisser}
          disabled={enCours || lignes.length === 0}
          taille="lg"
          className="w-full"
        >
          {enCours ? "Enregistrement…" : "Encaisser"}
          {!enCours && <Check className="h-4 w-4" />}
        </Bouton>

        {lignes.length > 0 && (
          <button
            type="button"
            onClick={viderTicket}
            className="mt-2 w-full py-2 text-micro font-semibold text-cendre transition-colors hover:text-braise-clair lg:hidden"
          >
            Vider le ticket
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════ Tickets du soir */

type TicketDuJour = {
  id: string;
  numero: string;
  heure: string;
  total: number;
  remise: number;
  modePaiement: string;
  articles: string;
  vendeur: string | null;
  lignes: { designation: string; quantite: number; prixUnitaire: number; total: number }[];
};

function genererHtmlRecu(t: TicketDuJour, nom: string): string {
  const libPaiement = LIB_PAIEMENT[t.modePaiement as ModePaiement] ?? t.modePaiement;
  const lignesHtml = t.lignes
    .map(
      (l) =>
        `<div class="row"><span>${l.quantite}&times; ${l.designation}</span><span>${formatFCFA(l.total)}</span></div>`,
    )
    .join("");
  const remiseHtml =
    t.remise > 0
      ? `<div class="row"><span>Remise</span><span>-${formatFCFA(t.remise)}</span></div>`
      : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${t.numero}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:monospace;font-size:13px;width:300px;margin:auto;padding:12px;background:#f5f5f5;color:#1c1c1c}
.entete{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px}
.entete img{width:32px;height:32px;object-fit:contain}
h1{font-size:16px;font-weight:bold;color:#1c1c1c}
.centre{text-align:center}
.sep{border-top:1px dashed #6b3e26;margin:8px 0}
.meta{margin-bottom:2px;color:#424242}
.row{display:flex;justify-content:space-between;gap:8px;margin:3px 0}
.total{font-size:15px;font-weight:bold;color:#e30613}
.paiement{color:#424242;margin-top:4px}
@media print{body{width:100%;padding:0;background:#fff}}
</style></head><body>
<div class="entete"><img src="/icones/kembo-192.png" alt=""><h1>${nom}</h1></div>
<div class="sep"></div>
<div class="meta"><strong>${t.numero}</strong> &nbsp;·&nbsp; ${t.heure}${t.vendeur ? ` &nbsp;·&nbsp; ${t.vendeur}` : ""}</div>
<div class="sep"></div>
${lignesHtml}
${remiseHtml}
<div class="sep"></div>
<div class="row total"><span>TOTAL</span><span>${formatFCFA(t.total)} FCFA</span></div>
<div class="paiement">Paiement : ${libPaiement}</div>
<div class="sep"></div>
<div class="centre" style="color:#6b3e26;font-style:italic">Merci de votre visite !</div>
</body></html>`;
}

function imprimerTicket(t: TicketDuJour, nom: string) {
  const w = window.open("", "_blank", "width=380,height=600");
  if (!w) return;
  w.document.write(genererHtmlRecu(t, nom));
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
}

async function telechargerTicket(t: TicketDuJour, nom: string) {
  const { jsPDF } = await import("jspdf");
  const libPaiement = LIB_PAIEMENT[t.modePaiement as ModePaiement] ?? t.modePaiement;
  // Remplace les espaces insécables de Intl.NumberFormat("fr-FR") par des espaces simples
  const fcfa = (n: number) => formatFCFA(n).replace(/[\u00a0\u202f]/g, " ");

  // Marges internes : 8 mm à gauche, 72 mm à droite (8 mm libres), centre à 40 mm
  const ML = 8;
  const MR = 72;
  const CX = 40;

  // Hauteur calculée bloc par bloc + 20 mm de padding (haut 10 + bas 10)
  // entête 18 + sep+gap 7 + méta 10 + sep+gap 7 + articles N×6 + remise 6? + total 12 + paiement 9 + sep+footer 13
  const hauteurPage =
    20 + 18 + 7 + 10 + 7 + t.lignes.length * 6 + (t.remise > 0 ? 6 : 0) + 12 + 9 + 13;

  const doc = new jsPDF({
    unit: "mm",
    format: [80, hauteurPage],
    orientation: "portrait",
    compress: true,
  });

  let y = 10; // padding haut

  // ── Logo + titre ──────────────────────────────────────
  try {
    const resp = await fetch("/icones/kembo-192.png");
    const blob = await resp.blob();
    const logoB64 = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.readAsDataURL(blob);
    });
    doc.addImage(logoB64, "PNG", ML, y, 11, 11);
  } catch { /* logo optionnel */ }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(nom.toUpperCase(), CX, y + 7, { align: "center" });
  y += 18;

  // ── Séparateur ────────────────────────────────────────
  doc.setDrawColor(150);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(ML, y, MR, y);
  y += 7;

  // ── Numéro · heure · vendeur ──────────────────────────
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(t.numero, ML, y);
  doc.setFont("helvetica", "normal");
  const meta = [t.heure, t.vendeur].filter(Boolean).join("  .  ");
  doc.text(meta, MR, y, { align: "right" });
  y += 10;

  // ── Séparateur ────────────────────────────────────────
  doc.line(ML, y, MR, y);
  y += 7;

  // ── Articles ──────────────────────────────────────────
  doc.setFontSize(8.5);
  for (const l of t.lignes) {
    doc.setFont("helvetica", "normal");
    doc.text(`${l.quantite}x ${l.designation}`, ML, y);
    doc.setFont("helvetica", "bold");
    doc.text(fcfa(l.total), MR, y, { align: "right" });
    y += 6;
  }

  if (t.remise > 0) {
    doc.setFont("helvetica", "italic");
    doc.text("Remise", ML, y);
    doc.text(`-${fcfa(t.remise)}`, MR, y, { align: "right" });
    y += 6;
  }

  // ── Total ─────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.line(ML, y, MR, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", ML, y);
  doc.text(`${fcfa(t.total)} FCFA`, MR, y, { align: "right" });
  y += 7;

  // ── Mode de paiement ──────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Paiement : ${libPaiement}`, ML, y);
  y += 9;

  // ── Séparateur + footer ───────────────────────────────
  doc.line(ML, y, MR, y);
  y += 7;

  doc.setFontSize(8);
  doc.text("Merci de votre visite !", CX, y, { align: "center" });

  doc.save(`${t.numero}.pdf`);
}

export function TicketsDuJour({
  tickets,
  nomEtablissement,
}: {
  tickets: TicketDuJour[];
  nomEtablissement: string;
}) {
  if (tickets.length === 0) return null;
  const totalJour = tickets.reduce((s, t) => s + t.total, 0);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Ce soir</p>
          <h2 className="titre-affiche text-titre text-craie">
            {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
          </h2>
        </div>
        <p className="chiffre text-menu text-cendre">{formatFCFA(totalJour)} FCFA</p>
      </div>

      <div className="border border-charbon-600 bg-charbon-800">
        {/* En-tête colonnes — desktop uniquement */}
        <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 border-b border-charbon-700 px-3 py-1.5 lg:grid">
          <span className="eyebrow">Ticket</span>
          <span className="eyebrow">Articles</span>
          <span className="eyebrow">Paiement</span>
          <span className="eyebrow text-right">Total</span>
          <span className="eyebrow sr-only">Actions</span>
        </div>

        <ul className="divide-y divide-charbon-700">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 lg:grid-cols-[auto_1fr_auto_auto_auto]"
            >
              {/* Méta : numéro · heure · vendeur */}
              <div className="flex items-center gap-1.5 lg:w-48 lg:shrink-0">
                <span className="chiffre text-micro font-bold text-flamme">{t.numero}</span>
                <span className="text-charbon-500">·</span>
                <span className="chiffre text-micro text-cendre">{t.heure}</span>
                {t.vendeur && (
                  <>
                    <span className="text-charbon-500">·</span>
                    <span className="text-micro text-cendre">{t.vendeur}</span>
                  </>
                )}
              </div>

              {/* Articles */}
              <p className="col-span-2 min-w-0 truncate text-micro text-craie lg:col-span-1">
                {t.articles}
              </p>

              {/* Badge paiement */}
              <Badge ton={t.modePaiement === "CREDIT" ? "alerte" : "neutre"} className="hidden lg:inline-flex">
                {LIB_PAIEMENT[t.modePaiement as ModePaiement] ?? t.modePaiement}
              </Badge>

              {/* Total */}
              <span className="chiffre text-right text-micro font-semibold text-craie lg:w-20">
                {formatFCFA(t.total)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Imprimer le ticket"
                  onClick={() => imprimerTicket(t, nomEtablissement)}
                  className="rounded p-1.5 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Télécharger le ticket"
                  onClick={() => telechargerTicket(t, nomEtablissement)}
                  className="rounded p-1.5 text-cendre transition-colors hover:bg-charbon-700 hover:text-craie"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
