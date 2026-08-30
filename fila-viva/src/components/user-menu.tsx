import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserMenu({ email }: { email: string }) {
  const iniciais = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{iniciais}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 lg:block hidden">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="text-muted-foreground text-xs">Coordenadoria Regional</p>
      </div>

      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
          <LogOut className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
