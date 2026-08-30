import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_META,
  type SituacaoOpcao,
} from "@/lib/fila/logica";

export function TagStatus({
  situacao,
  className,
}: {
  situacao: SituacaoOpcao;
  className?: string;
}) {
  const meta = STATUS_META[situacao];
  return <Badge className={cn(meta.classes, className)}>{meta.rotulo}</Badge>;
}

export const TAG_CADUNICO =
  "border-transparent bg-indigo-600 text-white dark:bg-indigo-500";
export const TAG_CRITERIO =
  "border-transparent bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200";
export const TAG_VAGA =
  "border-transparent bg-emerald-600 text-white dark:bg-emerald-500";
/** Saiu desta fila de prioridade porque há convocação em aberto em outra unidade. */
export const TAG_FORA_CONVOCADA =
  "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
