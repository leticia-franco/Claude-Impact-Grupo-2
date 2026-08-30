"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { signIn, signUp, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const INITIAL: AuthState = {};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }

  if (state.message) {
    return (
      <Alert>
        <CheckCircle2 aria-hidden />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function LoginForm({ next }: { next: string }) {
  const [signInState, signInAction] = useActionState(signIn, INITIAL);
  const [signUpState, signUpAction] = useActionState(signUp, INITIAL);

  return (
    <Tabs defaultValue="entrar" className="w-full gap-0">
      <TabsList className="h-10 w-full">
        <TabsTrigger value="entrar">Entrar</TabsTrigger>
        <TabsTrigger value="criar">Criar conta</TabsTrigger>
      </TabsList>

      <TabsContent value="entrar" className="mt-6">
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-2">
            <Label htmlFor="email">E-mail institucional</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nome@rioeduca.rj.gov.br"
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              required
            />
          </div>

          <Feedback state={signInState} />
          <SubmitButton>Entrar</SubmitButton>
        </form>
      </TabsContent>

      <TabsContent value="criar" className="mt-6">
        <form action={signUpAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">E-mail institucional</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nome@rioeduca.rj.gov.br"
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Senha</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="h-10"
              required
            />
            <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres.</p>
          </div>

          <Feedback state={signUpState} />
          <SubmitButton>Criar conta</SubmitButton>
        </form>
      </TabsContent>
    </Tabs>
  );
}
