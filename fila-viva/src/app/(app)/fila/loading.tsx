import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto exibido enquanto o servidor monta a fila (feedback imediato). */
export default function FilaCarregando() {
  return (
    <>
      <PageHeader
        titulo="Fila"
        descricao="Ordenação por unidade, turno e grupamento, com a régua de pontuação do processo de 2025, simulação da liberação automática e gestão da convocação."
      />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_11rem_11rem]">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
