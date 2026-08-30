import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { RioEducacaoLogo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <header className="bg-background/90 sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 backdrop-blur-xl lg:hidden">
        <RioEducacaoLogo className="w-36" />
        <UserMenu email={user.email ?? "sem e-mail"} compact />
      </header>

      <aside className="bg-sidebar/95 sticky top-0 hidden h-dvh flex-col border-r p-5 backdrop-blur-xl lg:flex">
        <RioEducacaoLogo className="max-w-[13rem]" />
        <Separator className="my-5" />
        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Operação
          </p>
          <Badge variant="secondary" className="text-[10px]">
            2025
          </Badge>
        </div>
        <NavLinks />
        <div className="mt-auto">
          <UserMenu email={user.email ?? "sem e-mail"} />
        </div>
      </aside>

      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-[96rem]">{children}</div>
      </main>

      <div className="bg-background/92 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-1 pb-[calc(.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden">
        <NavLinks mobile />
      </div>
    </div>
  );
}
