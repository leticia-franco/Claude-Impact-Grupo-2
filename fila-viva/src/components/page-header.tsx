export function PageHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <header className="mb-8 space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-muted-foreground text-sm text-pretty">{descricao}</p>
    </header>
  );
}
