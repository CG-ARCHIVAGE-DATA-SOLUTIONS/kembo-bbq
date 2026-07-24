import clsx, { type ClassValue } from "clsx";

export const cn = (...classes: ClassValue[]) => clsx(classes);

/** Sérialise proprement les objets Prisma passés aux composants clients. */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
