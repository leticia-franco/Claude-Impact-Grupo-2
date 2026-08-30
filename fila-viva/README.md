# Fila Viva

Painel de classificação e convocação da fila de creche da SME-Rio, para as 11
Coordenadorias Regionais de Educação. Frente do desafio: **Eixo 2 (Classificação)**,
com gancho no Eixo 3 (Convocação).

O que o protótipo ataca, a partir dos achados na base 2021–2025:

- a fila publicada tem cerca de **2x** o tamanho da fila real (16.345 posições para
  7.851 crianças em 2025), porque a mesma criança conta em até 5 unidades;
- **11.981** chamadas de vaga em 2025 foram para crianças que terminaram o processo
  sem vaga nenhuma, cada uma segurando a vaga por até 6 dias;
- não existe registro de **quando** uma opção mudou de status, então ninguém sabe há
  quanto tempo uma vaga "Selecionada" está parada esperando confirmação.

## Stack

| Camada | Escolha |
| --- | --- |
| App | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Auth e dados | Supabase (Postgres + Auth, sessão via cookie com `@supabase/ssr`) |
| Deploy | Vercel |

O banco Supabase é compartilhado com outro projeto, então **todo objeto leva o prefixo
`fv_`** (ver `supabase/migrations/0001_fila_viva_init.sql`).

## Rodando local

```sh
npm install
cp .env.example .env.local   # preencher URL e anon key do Supabase
npm run dev
```

Variáveis (Supabase > Project Settings > API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Schema: rodar `supabase/migrations/0001_fila_viva_init.sql` no SQL Editor do projeto.
O arquivo é idempotente, pode rodar de novo sem quebrar.

## Estrutura

```
src/
  proxy.ts                     renova a sessão e barra rota privada (Next 16 usa proxy, não middleware)
  app/
    layout.tsx                 shell raiz, metadata, Toaster
    page.tsx                   redireciona para /painel
    (auth)/login/              tela de login: page, form client, server actions
    auth/callback/route.ts     troca o code do e-mail por sessão
    (app)/                     área autenticada
      layout.tsx               guarda de sessão + sidebar
      painel/                  fila real x publicada, ofertas em risco
      fila/                    ordenação por unidade, turno e grupamento
      convocacoes/             tentativas de contato e prazo
      unidades/                oferta e ocupação
  components/
    ui/                        shadcn
    brand.tsx                  marca
    nav-links.tsx              navegação lateral
    user-menu.tsx              usuário + sair
  lib/supabase/
    client.ts                  browser
    server.ts                  Server Components, Actions, Route Handlers
    proxy.ts                   renovação de sessão por request
supabase/migrations/           schema com prefixo fv_
```

## Estado atual

Estrutura e autenticação de ponta a ponta funcionando. As quatro páginas da área
autenticada estão com o esqueleto e placeholders marcados, ainda sem dado ligado.
