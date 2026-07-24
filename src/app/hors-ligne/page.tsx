import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function PageHorsLigne() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-charbon-700">
        <CloudOff className="h-7 w-7 text-flamme" strokeWidth={2.2} />
      </span>
      <h1 className="titre-affiche text-3xl text-craie">Pas de réseau</h1>
      <p className="text-sm text-cendre">
        Cette page n&apos;a pas encore été chargée sur l&apos;appareil. La caisse, elle, reste
        utilisable : les tickets sont gardés sur le téléphone et partent dès le retour de la
        connexion.
      </p>
      <Link
        href="/caisse"
        className="rounded-lg bg-braise px-5 py-3 text-sm font-bold text-craie transition-colors hover:bg-braise-clair"
      >
        Ouvrir la caisse
      </Link>
    </div>
  );
}
