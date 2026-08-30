import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { Wordmark } from "@/components/brand";

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
    <div className="grid min-h-dvh lg:grid-cols-[16rem_1fr]">
      <aside className="bg-muted/30 flex flex-col gap-6 border-b p-4 lg:border-r lg:border-b-0 lg:p-6">
        <Wordmark />
        <NavLinks />
        <div className="mt-auto">
          <UserMenu email={user.email ?? "sem e-mail"} />
        </div>
      </aside>

      <main className="min-w-0 p-6 lg:p-10">{children}</main>
    </div>
  );
}
