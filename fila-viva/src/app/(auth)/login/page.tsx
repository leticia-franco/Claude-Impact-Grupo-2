import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, UsersRound } from "lucide-react";

import { LoginForm } from "./login-form";
import { RioEducacaoLogo } from "@/components/brand";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destino = typeof next === "string" && next.startsWith("/") ? next : "/painel";

  return (
    <main className="from-primary/8 via-background to-secondary/70 flex h-dvh items-center justify-center overflow-y-auto bg-gradient-to-br p-4 sm:p-6 md:overflow-hidden">
      <Card className="w-full max-w-5xl gap-0 overflow-hidden py-0 shadow-2xl shadow-slate-950/8 [display:grid] md:h-[min(43rem,calc(100dvh-3rem))] md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-primary text-primary-foreground relative hidden h-full min-h-0 overflow-hidden p-10 md:flex md:flex-col">
          <div className="absolute -top-24 -right-20 size-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-black/10" />

          <div className="relative my-auto space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">
                Rede municipal do Rio
              </p>
              <h1 className="max-w-sm text-3xl font-semibold tracking-tight text-balance">
                Uma fila mais clara para decisões mais humanas.
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-white/75 text-pretty">
                Acompanhe posições, convocações e vagas da educação infantil com
                transparência e segurança.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/85">
              <p className="flex items-center gap-3">
                <CheckCircle2 className="size-4" aria-hidden />
                Fila organizada por unidade e turma
              </p>
              <p className="flex items-center gap-3">
                <UsersRound className="size-4" aria-hidden />
                Visão única para toda a equipe
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck className="size-4" aria-hidden />
                Acesso restrito e rastreável
              </p>
            </div>
          </div>
        </section>

        <CardContent className="flex flex-col justify-center p-6 sm:p-10 md:p-12">
          <div className="mx-auto w-full max-w-sm space-y-7">
            <RioEducacaoLogo className="max-w-[15rem]" />
            <div className="space-y-2">
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                Bem-vindo de volta
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Acessar o painel
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Entre com o e-mail cadastrado na sua Coordenadoria Regional de
                Educação.
              </p>
            </div>

            <LoginForm next={destino} />

            <p className="text-muted-foreground border-t pt-5 text-xs leading-relaxed text-pretty">
              Protótipo do Hackathon SME-Rio + Rio Impact Lab. Não substitui o
              sistema oficial de inscrição.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
