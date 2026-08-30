import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { RioEducacaoLogo } from "@/components/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destino = typeof next === "string" && next.startsWith("/") ? next : "/painel";

  return (
    <main className="from-primary/10 via-background to-secondary/70 flex h-dvh items-center justify-center overflow-hidden bg-gradient-to-br p-4 sm:p-6">
      <Card className="max-h-[calc(100dvh-2rem)] w-full max-w-md gap-0 overflow-y-auto py-0 shadow-2xl shadow-slate-950/10 sm:max-h-[calc(100dvh-3rem)]">
        <CardHeader className="items-center gap-3 border-b px-6 py-7 text-center sm:px-8 sm:py-8">
          <RioEducacaoLogo className="max-w-[16rem]" />
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Acessar o painel
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm leading-relaxed text-pretty">
              Entre com o e-mail cadastrado na sua Coordenadoria Regional de
              Educação.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
          <LoginForm next={destino} />
          <p className="text-muted-foreground mt-6 border-t pt-5 text-center text-xs leading-relaxed text-pretty">
            Protótipo do Hackathon SME-Rio + Rio Impact Lab. Não substitui o
            sistema oficial de inscrição.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
