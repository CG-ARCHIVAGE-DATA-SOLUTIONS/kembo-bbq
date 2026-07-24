import { redirect } from "next/navigation";
import { sessionCourante } from "@/domain/auth";
import { lireParametre } from "@/domain/parametres";
import { CLES_PARAMETRE } from "@/domain/rules";
import { Navigation } from "@/components/navigation";
import { FileAttente } from "@/components/file-attente";

export default async function LayoutApplication({
  children,
}: {
  children: React.ReactNode;
}) {
  const utilisateur = await sessionCourante();
  if (!utilisateur) redirect("/connexion");

  const [nom, slogan] = await Promise.all([
    lireParametre(CLES_PARAMETRE.NOM_ETABLISSEMENT),
    lireParametre(CLES_PARAMETRE.SLOGAN),
  ]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Navigation nom={nom} slogan={slogan} utilisateur={utilisateur} />
      <main className="marge-barre flex-1 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:py-10">
          <FileAttente />
          {children}
        </div>
      </main>
    </div>
  );
}
