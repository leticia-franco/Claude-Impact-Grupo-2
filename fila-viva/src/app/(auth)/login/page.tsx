import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const destino = typeof next === "string" && next.startsWith("/") ? next : "/painel";

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <Wordmark className="text-lg" />
          <h1 className="text-2xl font-semibold tracking-tight">Acessar o painel</h1>
          <p className="text-muted-foreground text-sm">
            Use o e-mail cadastrado na sua Coordenadoria Regional de Educação.
          </p>
        </div>

        <LoginForm next={destino} />

        <p className="text-muted-foreground text-xs text-pretty">
          Protótipo do Hackathon SME-Rio + Rio Impact Lab. Não substitui o sistema
          oficial de inscrição.
        </p>
      </div>
    </main>
  );
}
