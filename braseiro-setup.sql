-- ============================================
-- BRASEIRO PREMIUM KNIVES - DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. MODELS (Modelos pai)
create table if not exists models (
  id bigint primary key generated always as identity,
  tipo text,
  codigo text unique not null,
  nome text not null,
  colecao text,
  fornecedor text,
  pais text,
  descricao text,
  aco text,
  acabamento text,
  lamina text,
  total_size text,
  peso text,
  custo numeric default 0,
  moeda text default 'BRL',
  frete numeric default 0,
  var_tags jsonb default '[]',
  foto text,
  created_at timestamptz default now()
);

-- 2. VARIATIONS (Variações)
create table if not exists variations (
  id bigint primary key generated always as identity,
  model_id bigint references models(id) on delete cascade,
  sufixo text not null,
  codigo text unique not null,
  sku_amazon text,
  descricao text not null,
  aco text,
  acabamento text,
  cabo text,
  cabo_cor text,
  tamanho text,
  obs text,
  tipo_var text default 'lote',
  qtd integer default 1,
  local text default 'texas',
  custo numeric default 0,
  foto text,
  created_at timestamptz default now()
);

-- 3. CLIENTS (Clientes)
create table if not exists clients (
  id bigint primary key generated always as identity,
  tipo text default 'colecionador',
  nome text not null,
  empresa text,
  pais text default 'EUA',
  vip boolean default false,
  bday date,
  origem text,
  whats text,
  email text,
  insta text,
  outro text,
  cidade text,
  cep text,
  endereco text,
  notas text,
  prefs jsonb default '[]',
  created_at timestamptz default now()
);

-- 4. STOCK (Estoque)
create table if not exists stock (
  id bigint primary key generated always as identity,
  codigo text not null,
  nome text not null,
  sku_amazon text,
  colecao text,
  local text default 'texas',
  qtd integer default 0,
  reservado integer default 0,
  custo numeric default 0,
  obs text,
  created_at timestamptz default now()
);

-- 5. STOCK MOVEMENTS (Movimentações)
create table if not exists stock_movements (
  id bigint primary key generated always as identity,
  tipo text not null,
  codigo text not null,
  nome_prod text,
  local text,
  destino text,
  qtd integer default 1,
  data date default current_date,
  cliente text,
  obs text,
  created_at timestamptz default now()
);

-- 6. ORDERS (Pedidos)
create table if not exists orders (
  id bigint primary key generated always as identity,
  numero text unique not null,
  cliente_id bigint references clients(id) on delete set null,
  canal text,
  tipo text,
  cliente text not null,
  contato text,
  cidade text,
  pais text,
  items jsonb default '[]',
  moeda text default 'BRL',
  desconto numeric default 0,
  frete numeric default 0,
  total numeric default 0,
  pagamento text,
  status text default 'aguardando',
  data_pedido date default current_date,
  data_entrega date,
  rastreio text,
  endereco text,
  obs text,
  rifa_num text,
  rifa_num_venc text,
  rifa_sorteio text,
  rifa_obs text,
  leilao_num integer,
  leilao_min numeric,
  leilao_venc numeric,
  leilao_plat text,
  leilao_link text,
  created_at timestamptz default now()
);

-- 7. PRICES (Precificações salvas)
create table if not exists prices (
  id bigint primary key generated always as identity,
  produto text not null,
  fluxo text,
  symbol text,
  custo_total numeric,
  preco_base numeric,
  margem integer,
  precos jsonb default '[]',
  data date default current_date,
  created_at timestamptz default now()
);

-- ============================================
-- DISABLE RLS for simplicity (single user app)
-- ============================================
alter table models disable row level security;
alter table variations disable row level security;
alter table clients disable row level security;
alter table stock disable row level security;
alter table stock_movements disable row level security;
alter table orders disable row level security;
alter table prices disable row level security;
