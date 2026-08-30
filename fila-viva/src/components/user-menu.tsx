import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserMenu({ email, compact = false }: { email: string; compact?: boolean }) {
  const iniciais = email.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        !compact && "border-sidebar-border bg-sidebar-accent/40 rounded-xl border p-2.5",
      )}
    >
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {iniciais}
        </AvatarFallback>
      </Avatar>

      <div className={cn("min-w-0 flex-1", compact && "hidden")}>
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="text-muted-foreground text-xs">Coordenadoria Regional</p>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sair da conta">
          <LogOut className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
