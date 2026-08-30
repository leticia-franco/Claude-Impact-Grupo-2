-- Fila Viva, ETL da base do hackathon para os CSVs de carga.
-- Rodar a partir da raiz do app:  duckdb < scripts/etl.sql
-- Saída em supabase/seed/*.csv, no formato das tabelas fv_ (migração 0002 aplicada).

load excel;

-- ---------------------------------------------------------------------------
-- Fontes
-- ---------------------------------------------------------------------------

create view src_a as
  select * from read_csv_auto('../../dadoscreche/Bases IC_ ClassificadoseFila/01_QueryA_InscricoesPorAno.csv.gz', delim=';');

create view src_b as
  select * from read_csv_auto('../../dadoscreche/Bases IC_ ClassificadoseFila/02_QueryB_RespostasSocioEconomicas.csv.gz', delim=';');

create view src_c as
  select * from read_csv_auto('../../dadoscreche/Bases IC_ ClassificadoseFila/03_QueryC_PerguntasComDescricao.csv', delim=';');

-- Query D não tem cabeçalho e grava ausência como a string NULL
create view src_d as
  select * from read_csv('../../dadoscreche/Bases IC_ ClassificadoseFila/04_UnidadesEscolaresComEndereco.csv',
    delim=';', header=false, nullstr='NULL',
    names=['seq','esc_codigo','nome','tipo','logradouro','numero','complemento','bairro','cep']);

-- Localização: DESIGNACAO perdeu o zero à esquerda no Excel, lpad devolve
create view src_loc as
  select lpad("DESIGNACAO", 7, '0') as esc_codigo,
         try_cast("LATITUDE" as double) as latitude,
         try_cast("LONGITUDE" as double) as longitude
  from read_xlsx('../../dadoscreche/OferecimentosEvagas/Unidades_Unificadas_com_Localizacao.xlsx',
                 header=true, all_varchar=true);

create view src_cap as
  select "Designação" as esc_codigo,
         try_cast("Berçário" as int) as bercario,
         try_cast("Maternal I" as int) as maternal_1,
         try_cast("Maternal II" as int) as maternal_2
  from read_xlsx('../../fontes-oficiais-creche/dados/SME_capacidade-total-por-grupamento_2025-07-11.xlsx',
                 header=true, all_varchar=true);

-- ---------------------------------------------------------------------------
-- fv_processo
-- ---------------------------------------------------------------------------

copy (
  select distinct prm_id as id, ano,
         'Processo seletivo creche ' || ano as descricao
  from src_a order by ano
) to 'supabase/seed/fv_processo.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_criterio (id determinístico, referenciado por fv_resposta)
-- ---------------------------------------------------------------------------

create table criterios as
  select row_number() over (order by ano, "perg_ordemVisualizacao") as id,
         prm_id as processo_id,
         trim(pergunta_texto) as pergunta,
         perg_criterio as criterio,
         perg_pontuacao as pontuacao,
         "perg_ordemVisualizacao" as ordem,
         perg_id,
         ich_perg_id
  from src_c;

copy (select * from criterios order by id)
  to 'supabase/seed/fv_criterio.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_unidade: as 872 unidades que aparecem na Query A, com endereço (Query D)
-- e localização (planilha unificada). CRE = 2 primeiros dígitos do código.
-- ---------------------------------------------------------------------------

create table unidades as
  with da_fila as (
    select unidade as id, arg_max(nome_unidade, ano) as nome
    from src_a group by 1
  )
  select f.id, f.nome,
         case when try_cast(substr(f.id, 1, 2) as int) between 1 and 11
              then try_cast(substr(f.id, 1, 2) as int) end as cre_id,
         null as gestao,
         d.bairro, d.cep,
         l.latitude, l.longitude
  from da_fila f
  left join src_d d on d.esc_codigo = f.id
  left join src_loc l on l.esc_codigo = f.id;

copy (select * from unidades order by id)
  to 'supabase/seed/fv_unidade.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_crianca
-- ---------------------------------------------------------------------------

copy (
  select aluno_anon as id,
         arg_max(sexo_crianca, data_criacao) as sexo,
         arg_max(nascimento_aluno_anomes, data_criacao) as nascimento_anomes,
         null as data_nascimento
  from src_a group by 1 order by 1
) to 'supabase/seed/fv_crianca.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_inscricao (id determinístico, referenciado por fv_opcao e fv_resposta)
-- Grão real: (prm_id, plm_id, ipl_id). Pontuação recalculada da régua:
-- declarada (resposta = Sim) e confirmada (confirmado = Sim).
-- ---------------------------------------------------------------------------

create table inscricoes as
  with base as (
    select prm_id, plm_id, ipl_id,
           arg_max(aluno_anon, data_criacao) as crianca_id,
           arg_max(responsavel_anon, data_criacao) as responsavel_id,
           arg_max(bairro, data_criacao) as bairro,
           arg_max("CEP", data_criacao) as cep,
           min(data_criacao) as criada_em,
           arg_min(unidade, opcao) as unidade_1a_opcao
    from src_a
    group by 1, 2, 3
  ),
  pontos as (
    select b.prm_id, b.plm_id, b.ipl_id,
           sum(case when b.resposta = 'Sim' then c.pontuacao else 0 end) as pontuacao,
           sum(case when b.confirmado = 'Sim' then c.pontuacao else 0 end) as pontuacao_confirmada
    from src_b b
    join criterios c on c.processo_id = b.prm_id and c.ich_perg_id = b.ich_perg_id
    group by 1, 2, 3
  )
  select row_number() over (order by base.prm_id, base.plm_id, base.ipl_id) as id,
         base.prm_id as processo_id,
         base.plm_id, base.ipl_id,
         base.crianca_id, base.responsavel_id,
         case when try_cast(substr(base.unidade_1a_opcao, 1, 2) as int) between 1 and 11
              then try_cast(substr(base.unidade_1a_opcao, 1, 2) as int) end as cre_id,
         base.bairro, base.cep,
         coalesce(p.pontuacao, 0) as pontuacao,
         coalesce(p.pontuacao_confirmada, 0) as pontuacao_confirmada,
         base.criada_em
  from base
  left join pontos p using (prm_id, plm_id, ipl_id);

copy (select * from inscricoes order by id)
  to 'supabase/seed/fv_inscricao.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_opcao: situacao_em fica vazio de propósito (a origem não registra quando
-- o status mudou; o rastro começa com o trigger fv_opcao_mudanca).
-- ---------------------------------------------------------------------------

copy (
  select i.id as inscricao_id,
         a.opcao as ordem,
         a.unidade as unidade_id,
         case trim(a.grupamento)
           when 'Berçário' then 'bercario'
           when 'Maternal I' then 'maternal_1'
           when 'Maternal II' then 'maternal_2'
         end as grupamento,
         lower(a.horario) as turno,
         case a.situacao
           when 'Ativo' then 'ativo'
           when 'Selecionado' then 'selecionado'
           when 'Selecionado da lista' then 'selecionado_lista'
           when 'Confirmado' then 'confirmado'
           when 'Lista de espera' then 'lista_espera'
           when 'Cancelado' then 'cancelado'
           when 'Cancelado na confirmacao' then 'cancelado_confirmacao'
           when 'Cancelado pelo sistema' then 'cancelado_sistema'
         end as situacao
  from src_a a
  join inscricoes i
    on i.processo_id = a.prm_id and i.plm_id = a.plm_id and i.ipl_id = a.ipl_id
  order by i.id, a.opcao
) to 'supabase/seed/fv_opcao.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_resposta: só linhas com algum Sim (883 mil de 4,36 mi; o resto é Nao/Nao
-- e a ausência da linha já diz isso).
-- ---------------------------------------------------------------------------

copy (
  select i.id as inscricao_id,
         c.id as criterio_id,
         (b.resposta = 'Sim') as resposta,
         (b.confirmado = 'Sim') as confirmado
  from src_b b
  join inscricoes i
    on i.processo_id = b.prm_id and i.plm_id = b.plm_id and i.ipl_id = b.ipl_id
  join criterios c on c.processo_id = b.prm_id and c.ich_perg_id = b.ich_perg_id
  where b.resposta = 'Sim' or b.confirmado = 'Sim'
  order by i.id, c.id
) to 'supabase/seed/fv_resposta.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- fv_capacidade: rede pública, medição SME de 2025-07-11
-- ---------------------------------------------------------------------------

copy (
  select u.id as unidade_id, x.grupamento, x.vagas, date '2025-07-11' as referencia
  from src_cap c
  join unidades u on u.id = c.esc_codigo
  cross join lateral (values
    ('bercario', c.bercario),
    ('maternal_1', c.maternal_1),
    ('maternal_2', c.maternal_2)
  ) as x(grupamento, vagas)
  where x.vagas is not null
  order by 1, 2
) to 'supabase/seed/fv_capacidade.csv' (header, delimiter ',');

-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------

select 'fv_processo' tabela, count(*) linhas from read_csv_auto('supabase/seed/fv_processo.csv')
union all select 'fv_criterio', count(*) from read_csv_auto('supabase/seed/fv_criterio.csv')
union all select 'fv_unidade', count(*) from read_csv_auto('supabase/seed/fv_unidade.csv')
union all select 'fv_crianca', count(*) from read_csv_auto('supabase/seed/fv_crianca.csv')
union all select 'fv_inscricao', count(*) from read_csv_auto('supabase/seed/fv_inscricao.csv')
union all select 'fv_opcao', count(*) from read_csv_auto('supabase/seed/fv_opcao.csv')
union all select 'fv_resposta', count(*) from read_csv_auto('supabase/seed/fv_resposta.csv')
union all select 'fv_capacidade', count(*) from read_csv_auto('supabase/seed/fv_capacidade.csv')
order by tabela;
