import { Squelette, SqueletteIndicateurs, SqueletteListe } from "@/components/ui/primitives";

export default function Chargement() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Chargement">
      <div className="flex flex-col gap-2">
        <Squelette className="h-3 w-32" />
        <Squelette className="h-9 w-56" />
      </div>
      <SqueletteIndicateurs />
      <SqueletteListe />
    </div>
  );
}
