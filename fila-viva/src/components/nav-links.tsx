"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, LayoutDashboard, ListOrdered, School } from "lucide-react";

import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/fila", label: "Fila", icon: ListOrdered },
  { href: "/convocacoes", label: "Convocações", icon: CalendarClock },
  { href: "/unidades", label: "Unidades", icon: School },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 lg:flex-col">
      {ITENS.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              ativo
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
