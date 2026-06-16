-- Script de criação do banco de dados (Apenas estrutura, sem dados)

CREATE TABLE IF NOT EXISTS wb_water_balances (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  responsible VARCHAR(255) NOT NULL,
  delivery_date TIMESTAMP,
  received_by VARCHAR(255),
  receipt_date TIMESTAMP,
  status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS wb_systems (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wb_regions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
  description TEXT,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wb_demands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  modifiers_population NUMERIC,
  modifiers_coverage NUMERIC,
  modifiers_per_capita NUMERIC,
  modifiers_losses NUMERIC,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wb_demand_entries (
  id SERIAL PRIMARY KEY,
  demand_id INTEGER REFERENCES wb_demands(id) ON DELETE CASCADE,
  region_id INTEGER REFERENCES wb_regions(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  population NUMERIC NOT NULL,
  coverage NUMERIC NOT NULL,
  per_capita_consumption NUMERIC NOT NULL,
  losses NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS wb_supply_sources (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255),
  system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  granted_flow NUMERIC NOT NULL,
  operational_flow NUMERIC NOT NULL,
  unavailable_flow NUMERIC NOT NULL,
  unavailability_reason TEXT,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wb_operational_adjustments (
  id SERIAL PRIMARY KEY,
  system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  flow_value NUMERIC NOT NULL,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE,
  linked_adjustment_id INTEGER REFERENCES wb_operational_adjustments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wb_template_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url TEXT
);

CREATE TABLE IF NOT EXISTS wb_water_balance_maps (
  id SERIAL PRIMARY KEY,
  water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE UNIQUE,
  geojson_data JSONB
);

CREATE TABLE IF NOT EXISTS wb_risk_references (
  id SERIAL PRIMARY KEY,
  iad VARCHAR(100) NOT NULL,
  risk_classification VARCHAR(255) NOT NULL,
  justification TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pl_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP,
  updated_by VARCHAR(255),
  is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pl_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  parent_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  priority VARCHAR(50),
  category VARCHAR(100),
  assigned_to VARCHAR(255),
  created_by VARCHAR(255),
  notes TEXT,
  sei_process TEXT,
  plan_id INTEGER REFERENCES pl_plans(id) ON DELETE SET NULL,
  depends_on_task_id INTEGER REFERENCES pl_tasks(id) ON DELETE SET NULL,
  updated_at TIMESTAMP,
  updated_by VARCHAR(255),
  weight REAL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON pl_tasks(parent_id);

CREATE TABLE IF NOT EXISTS pl_areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(4),
  created_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP,
  updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP,
  updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_category_areas (
  category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
  area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, area_id)
);

CREATE TABLE IF NOT EXISTS pl_task_categories (
  task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, category_id)
);

CREATE TABLE IF NOT EXISTS au_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id VARCHAR(100) DEFAULT 'provider',
  status VARCHAR(50) DEFAULT 'active',
  agency VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_responsibles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  user_id INTEGER REFERENCES au_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMP,
  updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_responsible_areas (
  responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
  area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (responsible_id, area_id)
);

CREATE TABLE IF NOT EXISTS pl_task_areas (
  task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
  area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, area_id)
);

CREATE TABLE IF NOT EXISTS pl_task_responsibles (
  task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
  responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, responsible_id)
);

CREATE TABLE IF NOT EXISTS pl_task_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pl_model_tasks (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES pl_task_models(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_days INTEGER DEFAULT 0,
  weight REAL DEFAULT 1.0,
  sequence_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS re_resolutions (
  id SERIAL PRIMARY KEY,
  especie VARCHAR(100),
  numero INTEGER,
  ano INTEGER,
  data VARCHAR(20),
  ementa TEXT,
  situacao VARCHAR(100),
  area VARCHAR(255),
  segmento VARCHAR(255),
  tipo VARCHAR(100),
  link TEXT,
  imagem_capa TEXT
);

CREATE TABLE IF NOT EXISTS re_agendas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  tema VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS re_agenda_tasks (
  id SERIAL PRIMARY KEY,
  agenda_id INTEGER REFERENCES re_agendas(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
  status VARCHAR(100) DEFAULT 'Não Concluída',
  entrega TEXT,
  entrega_link TEXT
);

CREATE TABLE IF NOT EXISTS pu_publications (
  id SERIAL PRIMARY KEY,
  titulo_assunto TEXT,
  descricao TEXT,
  tipo_documento VARCHAR(255),
  responsavel_autor VARCHAR(255),
  data_publicacao VARCHAR(50),
  link_acesso TEXT,
  observacoes TEXT,
  imagem_capa TEXT
);
