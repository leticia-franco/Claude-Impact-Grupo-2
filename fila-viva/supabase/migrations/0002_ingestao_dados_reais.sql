-- Fila Viva, ajustes de schema para receber a base real 2021–2025.
-- Idempotente, pode rodar de novo sem quebrar.
--
-- O que a base real ensinou (e o 0001 não previa):
-- 1. A chave natural da inscrição é (prm_id, plm_id, ipl_id): a mesma criança tem
--    mais de uma inscrição no mesmo processo em 34 mil casos, então a unique
--    (processo, criança, responsável) não se sustenta.
-- 2. Existe opção nº 6 (11 linhas na base), o check 1..5 estoura.
-- 3. Não há registro histórico de quando a situação mudou; na carga o campo fica
--    nulo e o rastro passa a existir daqui pra frente, via trigger.

-- ---------------------------------------------------------------------------
-- fv_inscricao: chave natural real + pontuação declarada x confirmada
-- ---------------------------------------------------------------------------

alter table public.fv_inscricao
  drop constraint if exists fv_inscricao_processo_id_crianca_id_responsavel_id_key;

alter table public.fv_inscricao
  add column if not exists plm_id integer,
  add column if not exists ipl_id integer,
  add column if not exists pontuacao_confirmada numeric(6, 2);

comment on column public.fv_inscricao.pontuacao is
  'Soma da régua sobre as respostas declaradas (resposta = Sim).';
comment on column public.fv_inscricao.pontuacao_confirmada is
  'Soma da régua sobre as respostas validadas (confirmado = Sim).';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fv_inscricao_chave_natural'
  ) then
    alter table public.fv_inscricao
      add constraint fv_inscricao_chave_natural unique (processo_id, plm_id, ipl_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- fv_crianca: sexo e ano-mês de nascimento (grão da extração anonimizada)
-- ---------------------------------------------------------------------------

alter table public.fv_crianca
  add column if not exists sexo text check (sexo in ('M', 'F')),
  add column if not exists nascimento_anomes text;   -- 'yyyy-MM', generalizado por privacidade

-- ---------------------------------------------------------------------------
-- fv_opcao: opção 6 existe; situacao_em desconhecida na carga histórica
-- ---------------------------------------------------------------------------

alter table public.fv_opcao drop constraint if exists fv_opcao_ordem_check;
alter table public.fv_opcao add constraint fv_opcao_ordem_check check (ordem between 1 and 6);
alter table public.fv_opcao alter column situacao_em drop not null;

-- ---------------------------------------------------------------------------
-- fv_criterio: chaves da origem para juntar com as respostas
-- ---------------------------------------------------------------------------

alter table public.fv_criterio
  add column if not exists perg_id integer,        -- chave estável da pergunta entre anos
  add column if not exists ich_perg_id integer;    -- instância da pergunta no processo (junta com respostas)

create unique index if not exists fv_criterio_processo_perg_idx
  on public.fv_criterio (processo_id, ich_perg_id);

-- ---------------------------------------------------------------------------
-- fv_resposta: respostas socioeconômicas, formato esparso.
-- A extração tem 4,36 mi de linhas mas 91% são Nao/Nao; só entra linha com
-- algum Sim (883 mil). Ausência de linha = respondeu Nao e não foi confirmado.
-- ---------------------------------------------------------------------------

create table if not exists public.fv_resposta (
  id bigserial primary key,
  inscricao_id bigint not null references public.fv_inscricao (id) on delete cascade,
  criterio_id bigint not null references public.fv_criterio (id),
  resposta boolean not null default false,    -- família declarou Sim
  confirmado boolean not null default false,  -- validação confirmou
  unique (inscricao_id, criterio_id)
);

create index if not exists fv_resposta_criterio_idx on public.fv_resposta (criterio_id);

-- ---------------------------------------------------------------------------
-- fv_capacidade: vagas por unidade e grupamento (SME, jul/2025).
-- Cobre as 488 unidades da rede pública; conveniadas ainda sem fonte.
-- ---------------------------------------------------------------------------

create table if not exists public.fv_capacidade (
  id bigserial primary key,
  unidade_id text not null references public.fv_unidade (id),
  grupamento fv_grupamento not null,
  vagas integer not null,
  referencia date not null,                   -- data-base da medição
  unique (unidade_id, grupamento, referencia)
);

-- ---------------------------------------------------------------------------
-- fv_opcao_evento: o rastro que a origem não tem.
-- Toda mudança de situação em fv_opcao vira um evento daqui pra frente.
-- ---------------------------------------------------------------------------

create table if not exists public.fv_opcao_evento (
  id bigserial primary key,
  opcao_id bigint not null references public.fv_opcao (id) on delete cascade,
  situacao_de fv_situacao_opcao,
  situacao_para fv_situacao_opcao not null,
  em timestamptz not null default now(),
  por uuid references auth.users (id)
);

create index if not exists fv_opcao_evento_opcao_idx
  on public.fv_opcao_evento (opcao_id, em desc);

create or replace function public.fv_registra_mudanca_opcao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.situacao is distinct from old.situacao then
    new.situacao_em := now();
    insert into public.fv_opcao_evento (opcao_id, situacao_de, situacao_para, por)
    values (new.id, old.situacao, new.situacao, (select auth.uid()));
  end if;
  return new;
end;
$$;

drop trigger if exists fv_opcao_mudanca on public.fv_opcao;
create trigger fv_opcao_mudanca
  before update on public.fv_opcao
  for each row execute function public.fv_registra_mudanca_opcao();

-- ---------------------------------------------------------------------------
-- RLS das tabelas novas: leitura autenticada, como as demais
-- ---------------------------------------------------------------------------

alter table public.fv_resposta     enable row level security;
alter table public.fv_capacidade   enable row level security;
alter table public.fv_opcao_evento enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['fv_resposta', 'fv_capacidade', 'fv_opcao_evento']
  loop
    execute format(
      'drop policy if exists %I on public.%I', 'leitura_autenticada_' || t, t
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'leitura_autenticada_' || t, t
    );
  end loop;
end;
$$;

-- Escrita de fv_opcao (mudança de situação) fica com CRE e SME, mesmo critério
-- da convocação; o evento é gerado pelo trigger.
drop policy if exists fv_opcao_escrita on public.fv_opcao;
create policy fv_opcao_escrita on public.fv_opcao
  for update to authenticated
  using (
    exists (
      select 1 from public.fv_perfil p
      where p.user_id = (select auth.uid()) and p.papel in ('sme', 'cre')
    )
  )
  with check (
    exists (
      select 1 from public.fv_perfil p
      where p.user_id = (select auth.uid()) and p.papel in ('sme', 'cre')
    )
  );
