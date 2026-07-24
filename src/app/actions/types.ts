export type Reponse<T = undefined> =
  | { ok: true; message: string; data?: T; avertissements?: string[] }
  | { ok: false; message: string };

export function echec(erreur: unknown): { ok: false; message: string } {
  if (erreur instanceof Error) return { ok: false, message: erreur.message };
  return { ok: false, message: "Une erreur inattendue est survenue." };
}
