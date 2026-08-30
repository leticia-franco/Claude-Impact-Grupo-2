export function PageHeader({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <header className="mb-7 max-w-3xl space-y-2">
      <div className="text-primary flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
        <span className="bg-primary size-1.5 rounded-full" />
        Gestão da rede
      </div>
      <h1 className="text-foreground text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
        {titulo}
      </h1>
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty sm:text-[15px]">
        {descricao}
      </p>
    </header>
  );
}
