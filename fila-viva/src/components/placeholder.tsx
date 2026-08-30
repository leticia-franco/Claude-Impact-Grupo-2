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
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription className="text-pretty">{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 h-40 rounded-md" />
      </CardContent>
    </Card>
  );
}
