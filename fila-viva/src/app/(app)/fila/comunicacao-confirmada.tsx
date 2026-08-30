"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Mail, MessageCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DURACAO_CONFIRMACAO_MS = 10_000;

export function ComunicacaoConfirmada({
  criancaId,
  criancaIds,
  chamada,
  total,
}: {
  criancaId?: string;
  criancaIds?: string[];
  chamada?: number;
  total?: number;
}) {
  const [aberto, setAberto] = useState(true);
  const alunos = useMemo(
    () => criancaIds ?? (criancaId ? [criancaId] : []),
    [criancaId, criancaIds],
  );
  const varios = total != null && total > 1;

  useEffect(() => {
    const temporizador = window.setTimeout(
      () => setAberto(false),
      DURACAO_CONFIRMACAO_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, []);

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[101] grid place-items-center overflow-y-auto p-4 sm:p-6">
          <Dialog.Popup className="animate-in fade-in-0 zoom-in-90 slide-in-from-bottom-4 relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-300 bg-background p-6 text-center shadow-2xl duration-500 outline-none sm:p-8 dark:border-emerald-800">
            <span
              className="comunicacao-rastro pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-emerald-200/45 to-transparent dark:via-emerald-400/10"
              aria-hidden
            />

            <Dialog.Close
              aria-label="Fechar confirmação"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "absolute top-3 right-3 text-muted-foreground",
              )}
            >
              <X aria-hidden />
            </Dialog.Close>

            <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
              <span
                className="comunicacao-pulso absolute inset-0 rounded-full border-2 border-emerald-500"
                aria-hidden
              />
              <Check className="size-8" strokeWidth={3} aria-hidden />
            </div>

            <Dialog.Title className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              Disparo automático realizado
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pretty">
              {varios
                ? `${total} alunos tiveram uma nova chamada enviada com sucesso.`
                : `A comunicação${chamada ? ` da ${chamada}ª chamada` : ""} foi enviada com sucesso.`}
            </Dialog.Description>

            {alunos.length > 0 && (
              <div className="bg-emerald-50 text-emerald-950 mt-5 rounded-xl border border-emerald-200 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                <span className="text-emerald-700 dark:text-emerald-300">
                  Aluno{alunos.length > 1 ? "s" : ""}
                </span>{" "}
                <strong className="font-semibold">{alunos.join(", ")}</strong>
              </div>
            )}

            <div
              className="mt-4 flex flex-wrap justify-center gap-2"
              aria-label="Canais utilizados"
            >
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              >
                <Mail data-icon="inline-start" aria-hidden /> E-mail enviado
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              >
                <MessageCircle data-icon="inline-start" aria-hidden /> WhatsApp enviado
              </Badge>
            </div>

            <Dialog.Close
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 w-full bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              Concluir
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
