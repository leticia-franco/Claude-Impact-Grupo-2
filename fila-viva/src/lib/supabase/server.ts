import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Sempre criar um novo por request: o cookie store não pode ser reaproveitado.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie. O proxy já renova a sessão.
          }
        },
      },
    },
  );
}
