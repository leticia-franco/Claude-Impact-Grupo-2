import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Marca uma área da estrutura que ainda não tem dado ligado. */
export function Placeholder({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">{titulo}</CardTitle>
            <CardDescription className="text-pretty">{descricao}</CardDescription>
          </div>
          <Badge variant="secondary">Em breve</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="from-primary/7 via-background to-secondary/70 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed bg-gradient-to-br p-6 text-center">
          <span className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-xl">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">Estamos preparando esta visão</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
            Os dados aparecerão aqui de forma clara assim que esta etapa for conectada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
