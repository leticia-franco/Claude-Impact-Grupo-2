-- Fila Viva, esquema inicial.
-- O banco é compartilhado com outro projeto, por isso todo objeto leva o prefixo fv_.
-- Rodar no SQL Editor do Supabase (projeto Exodus).

-- ---------------------------------------------------------------------------
-- Domínio: rede
-- ---------------------------------------------------------------------------

create table if not exists public.fv_cre (
  id smallint primary key,
  nome text not null
);

create table if not exists public.fv_unidade (
  id text primary key,                        -- código da unidade na SME
  nome text not null,
  cre_id smallint references public.fv_cre (id),
  gestao text check (gestao in ('direta', 'conveniada', 'parceria')),
  bairro text,
  cep text,
  latitude double precision,
  longitude double precision
);

create index if not exists fv_unidade_cre_idx on public.fv_unidade (cre_id);

-- ---------------------------------------------------------------------------
-- Domínio: processo seletivo e régua de pontuação (muda a cada ano)
-- ---------------------------------------------------------------------------

create table if not exists public.fv_processo (
  id integer primary key,                     -- número do processo (ex.: 195)
  ano smallint not null,
  descricao text
);

create table if not exists public.fv_criterio (
  id bigserial primary key,
  processo_id integer not null references public.fv_processo (id) on delete cascade,
  pergunta text not null,
  criterio text,
  pontuacao numeric(6, 2) not null,
  ordem smallint,
  unique (processo_id, pergunta)
);

-- ---------------------------------------------------------------------------
-- Domínio: inscrição
-- ---------------------------------------------------------------------------

create table if not exists public.fv_crianca (
  id text primary key,                        -- código anônimo (aluno_NNNNNNN)
  data_nascimento date
);

create table if not exists public.fv_inscricao (
  id bigserial primary key,
  processo_id integer not null references public.fv_processo (id),
  crianca_id text not null references public.fv_crianca (id),
  responsavel_id text not null,               -- código anônimo (responsavel_NNNNNNN)
  cre_id smallint references public.fv_cre (id),
  bairro text,
  cep text,
  pontuacao numeric(6, 2),                    -- soma da régua do processo
  criada_em timestamptz not null default now(),
  unique (processo_id, crianca_id, responsavel_id)
);

create index if not exists fv_inscricao_processo_idx on public.fv_inscricao (processo_id);
create index if not exists fv_inscricao_crianca_idx on public.fv_inscricao (crianca_id);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fv_situacao_opcao') then
    create type fv_situacao_opcao as enum (
      'ativo',
      'selecionado',
      'selecionado_lista',
      'confirmado',
      'lista_espera',
      'cancelado',
      'cancelado_confirmacao',
      'cancelado_sistema'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fv_grupamento') then
    create type fv_grupamento as enum ('bercario', 'maternal_1', 'maternal_2');
  end if;

  if not exists (select 1 from pg_type where typname = 'fv_turno') then
    create type fv_turno as enum ('integral', 'parcial');
  end if;
end;
$$;

create table if not exists public.fv_opcao (
  id bigserial primary key,
  inscricao_id bigint not null references public.fv_inscricao (id) on delete cascade,
  ordem smallint not null check (ordem between 1 and 5),
  unidade_id text not null references public.fv_unidade (id),
  grupamento fv_grupamento not null,
  turno fv_turno not null,
  situacao fv_situacao_opcao not null default 'ativo',
  situacao_em timestamptz not null default now(),   -- o gap central: quando o status mudou
  unique (inscricao_id, ordem)
);

create index if not exists fv_opcao_fila_idx
  on public.fv_opcao (unidade_id, turno, grupamento, situacao);

-- ---------------------------------------------------------------------------
-- Domínio: convocação (Eixo 3, hoje manual e sem rastro)
-- ---------------------------------------------------------------------------

create table if not exists public.fv_convocacao (
  id bigserial primary key,
  opcao_id bigint not null references public.fv_opcao (id) on delete cascade,
  aberta_em timestamptz not null default now(),
  prazo_contato_em timestamptz,               -- 3 dias de tentativa
  prazo_comparecimento_em timestamptz,        -- 3 dias úteis após o contato
  desfecho text check (
    desfecho in ('confirmada', 'nao_localizada', 'recusada', 'expirada')
  ),
  desfecho_em timestamptz
);

create index if not exists fv_convocacao_aberta_idx
  on public.fv_convocacao (desfecho, prazo_comparecimento_em);

create table if not exists public.fv_tentativa_contato (
  id bigserial primary key,
  convocacao_id bigint not null references public.fv_convocacao (id) on delete cascade,
  canal text not null check (canal in ('telefone', 'whatsapp', 'sms', 'email')),
  resultado text not null check (
    resultado in ('atendeu', 'nao_atendeu', 'numero_invalido', 'aguardando')
  ),
  tentada_em timestamptz not null default now(),
  registrada_por uuid references auth.users (id)
);

create index if not exists fv_tentativa_convocacao_idx
  on public.fv_tentativa_contato (convocacao_id, tentada_em desc);

-- ---------------------------------------------------------------------------
-- Acesso: perfil do usuário, ligado ao auth do Supabase
-- ---------------------------------------------------------------------------

create table if not exists public.fv_perfil (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  email text,
  cre_id smallint references public.fv_cre (id),
  papel text not null default 'cre' check (papel in ('sme', 'cre', 'unidade', 'leitura')),
  criado_em timestamptz not null default now()
);

create or replace function public.fv_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fv_perfil (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists fv_on_auth_user_created on auth.users;
create trigger fv_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fv_handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS: o banco é compartilhado, então tudo fica fechado por padrão.
-- Nesta fase, quem está autenticado lê; escrita de convocação fica com CRE e SME.
-- ---------------------------------------------------------------------------

alter table public.fv_cre               enable row level security;
alter table public.fv_unidade           enable row level security;
alter table public.fv_processo          enable row level security;
alter table public.fv_criterio          enable row level security;
alter table public.fv_crianca           enable row level security;
alter table public.fv_inscricao         enable row level security;
alter table public.fv_opcao             enable row level security;
alter table public.fv_convocacao        enable row level security;
alter table public.fv_tentativa_contato enable row level security;
alter table public.fv_perfil            enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'fv_cre', 'fv_unidade', 'fv_processo', 'fv_criterio', 'fv_crianca',
    'fv_inscricao', 'fv_opcao', 'fv_convocacao', 'fv_tentativa_contato'
  ]
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

drop policy if exists fv_perfil_proprio on public.fv_perfil;
create policy fv_perfil_proprio on public.fv_perfil
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists fv_convocacao_escrita on public.fv_convocacao;
create policy fv_convocacao_escrita on public.fv_convocacao
  for all to authenticated
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

drop policy if exists fv_tentativa_escrita on public.fv_tentativa_contato;
create policy fv_tentativa_escrita on public.fv_tentativa_contato
  for all to authenticated
  using (
    exists (
      select 1 from public.fv_perfil p
      where p.user_id = (select auth.uid()) and p.papel in ('sme', 'cre', 'unidade')
    )
  )
  with check (
    exists (
      select 1 from public.fv_perfil p
      where p.user_id = (select auth.uid()) and p.papel in ('sme', 'cre', 'unidade')
    )
  );

-- ---------------------------------------------------------------------------
-- Semente mínima: as 11 CREs
-- ---------------------------------------------------------------------------

insert into public.fv_cre (id, nome) values
  (1, '1ª CRE'), (2, '2ª CRE'), (3, '3ª CRE'), (4, '4ª CRE'),
  (5, '5ª CRE'), (6, '6ª CRE'), (7, '7ª CRE'), (8, '8ª CRE'),
  (9, '9ª CRE'), (10, '10ª CRE'), (11, '11ª CRE')
on conflict (id) do nothing;
