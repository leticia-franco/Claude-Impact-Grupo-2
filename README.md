# SIDEC-Rio | Sistema Integrado de Distribuição de Creches

Desafio: **Inteligência na Fila da Creche** (SME-Rio).

## Nome da equipe

Grupo 2

## Membros

Felippe Rodrigues Oliveira<br>
Karina de Melo Santos<br>
Leticia Figueira Franco<br>
Matheus Louback Passos<br>

## Resumo

O SIDEC é um painel de classificação e convocação da fila de creche, utilizado pelas 11 Coordenadorias Regionais de Educação (CREs).
Seu objetivo principal é otimizar a gestão da fila, tornando o processo de alocação mais ágil e garantindo que o status de cada criança seja visível tanto para as CREs quanto para as direções escolares.

Por se tratar de uma fila dinâmica, o sistema também assegura a veracidade do número de crianças ainda não alocadas: embora cada fila seja administrada localmente, todas são alimentadas por uma fonte de dados única e integrada, o que evita divergências e desatualizações de lista.

Como avanço na gestão da fila, o critério de alocação foi ampliado. Anteriormente baseado apenas nas preferências indicadas pela família no momento do cadastro, o processo passou a considerar também:
<ul>
<li>disponibilidade de vagas;
<li>proximidade entre a residência da família e a unidade escolar;
<li>vulnerabilidade social da criança/família.
</ul>
Essa combinação de critérios torna a alocação mais justa, eficiente e alinhada às reais necessidades das crianças e das creches.


## Arquitetura

Next.js 16 + Tailwind v4 + shadcn/ui, Supabase (Postgres e Auth) e deploy na Vercel.
Detalhe técnico e estrutura de pastas em [`fila-viva/README.md`](fila-viva/README.md).

## Links

- Aplicação: https://sidec-rio.vercel.app/login?next=%2F
  - login: admin@admin.com
  - senha: admin
- Vídeo demo: _a gravar_

## Estrutura do repositório

```
fila-viva/    aplicação Next.js
```
