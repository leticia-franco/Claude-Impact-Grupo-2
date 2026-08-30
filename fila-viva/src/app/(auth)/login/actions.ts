"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/painel"),
  };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/painel");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  if (!email || password.length < 8) {
    return { error: "Informe um e-mail e uma senha de ao menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Sem confirmação de e-mail o Supabase já devolve sessão.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/painel");
  }

  return { message: "Conta criada. Confirme o e-mail para entrar." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
