import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Entrar",
};

const DESTAQUES = [
  {
    numero: "2,1x",
    texto: "de inflação na fila publicada: 16.345 posições para 7.851 crianças em 2025.",
  },
  {
    numero: "11.981",
    texto: "chamadas de vaga em 2025 para crianças que terminaram o processo sem vaga alguma.",
  },
  {
    numero: "81,4%",
    texto: "de aceite na 5ª opção. Distância não é o que trava o processo.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="bg-muted/40 hidden flex-col justify-between border-r p-12 lg:flex">
        <Wordmark className="text-lg" />

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              A fila de creche do Rio, com prazo visível e chamada rastreada.
            </h1>
            <p className="text-muted-foreground text-pretty">
              Painel de classificação e convocação para as 11 CREs. Cinco processos
              seletivos, 837 mil opções de creche, uma leitura só.
            </p>
          </div>

          <dl className="space-y-5">
            {DESTAQUES.map((item) => (
              <div key={item.numero} className="flex gap-4">
                <dt className="text-primary w-20 shrink-0 text-2xl font-semibold tabular-nums">
                  {item.numero}
                </dt>
                <dd className="text-muted-foreground text-sm text-pretty">{item.texto}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-muted-foreground text-xs">
          Dados anonimizados da SME-Rio, processos 2021 a 2025.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <Wordmark className="text-lg lg:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight">Acessar o painel</h2>
            <p className="text-muted-foreground text-sm">
              Use o e-mail cadastrado na sua Coordenadoria Regional de Educação.
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <LoginForm />
          </Suspense>

          <p className="text-muted-foreground text-xs text-pretty">
            Protótipo do Hackathon SME-Rio + Rio Impact Lab. Não substitui o sistema
            oficial de inscrição.
          </p>
        </div>
      </section>
    </main>
  );
}
