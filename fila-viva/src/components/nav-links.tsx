"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, FileUp, LayoutDashboard, ListOrdered, School } from "lucide-react";

import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/fila", label: "Fila", icon: ListOrdered },
  { href: "/convocacoes", label: "Convocações", icon: CalendarClock },
  { href: "/unidades", label: "Unidades", icon: School },
  { href: "/ingestao", label: "Ingestão", icon: FileUp },
] as const;

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        mobile ? "grid grid-cols-5 gap-1" : "flex flex-col gap-1.5",
      )}
    >
      {ITENS.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "group relative flex items-center rounded-xl font-medium outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50",
              mobile
                ? "min-w-0 flex-col gap-1 px-1 py-2 text-[10px]"
                : "gap-3 px-3 py-2.5 text-sm",
              ativo
                ? mobile
                  ? "text-primary"
                  : "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {!mobile && ativo && (
              <span className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full" />
            )}
            <Icon
              className={cn(
                "transition-transform group-hover:scale-105",
                mobile ? "size-5" : "size-4.5",
              )}
              aria-hidden
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
