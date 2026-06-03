import express from "express";
import path from "path";
import fs from "fs";
import { Pool } from "pg";

let dbPool: Pool | null = null;

function parseSafeInt(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : Math.floor(val);
  }
  const str = String(val).trim();
  const directParsed = parseInt(str, 10);
  if (!isNaN(directParsed) && /^-?\d+$/.test(str)) {
    return directParsed;
  }
  const match = str.match(/-?\d+/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseSafeFloat(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function parseSafeFloatOrNull(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : val;
  }
  const str = String(val).replace(",", ".").trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

function getDbPool(): Pool {
  if (!dbPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.");
    }
    dbPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return dbPool;
}

const app = express();

// Middleware para parsing de JSON grande
app.use(express.json({ limit: "50mb" }));

// API para salvar GeoJSON do mapa
app.post("/api/save-geojson", async (req, res) => {
  try {
    const waterBalanceId = parseSafeInt(req.query.waterBalanceId as string);
    if (waterBalanceId === null) {
      return res.status(400).json({ error: "waterBalanceId is required and must be convertible to a number" });
    }
    
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO water_balance_maps (water_balance_id, geojson_data) VALUES ($1, $2) ON CONFLICT (water_balance_id) DO UPDATE SET geojson_data = EXCLUDED.geojson_data",
        [waterBalanceId, JSON.stringify(req.body)]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save geojson" });
  }
});

// API para salvar arquivos de modelo (templates)
app.post("/api/save-templates", async (req, res) => {
  try {
    const { templateFiles } = req.body;
    if (!Array.isArray(templateFiles)) {
       return res.status(400).json({ success: false, error: "templateFiles must be an array" });
    }
    
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      
      await client.query("TRUNCATE TABLE template_files CASCADE");

      let currentMaxId = 0;
      const sanitizedFiles = templateFiles.map((tf: any) => {
        let parsedId = parseInt(String(tf.id), 10);
        if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
          const digitsOnly = String(tf.id).replace(/\D/g, "");
          parsedId = parseInt(digitsOnly, 10);
          if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
            parsedId = 0;
          }
        }
        return { ...tf, id: parsedId };
      });

      for (const tf of sanitizedFiles) {
        if (tf.id > currentMaxId) {
          currentMaxId = tf.id;
        }
      }
      for (const tf of sanitizedFiles) {
        if (tf.id === 0) {
          currentMaxId = currentMaxId + 1;
          tf.id = currentMaxId;
        }
      }

      for (const tf of sanitizedFiles) {
        await client.query(
          "INSERT INTO template_files (id, name, description, url) VALUES ($1, $2, $3, $4)",
          [tf.id, tf.name, tf.description, tf.url]
        );
      }

      await client.query(
        "SELECT setval(pg_get_serial_sequence('template_files', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM template_files"
      );

      await client.query("COMMIT");
      res.json({ success: true, message: "Modelos salvos com sucesso!" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro ao salvar arquivos modelo:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para carregar GeoJSON do mapa
app.get("/api/load-geojson", async (req, res) => {
  try {
    const waterBalanceId = parseSafeInt(req.query.waterBalanceId as string);
    if (waterBalanceId === null) {
      return res.status(400).json({ error: "waterBalanceId is required and must be convertible to a number" });
    }

    const pool = getDbPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT geojson_data FROM water_balance_maps WHERE water_balance_id = $1",
        [waterBalanceId]
      );
      if (result.rows.length > 0 && result.rows[0].geojson_data) {
        res.json(result.rows[0].geojson_data);
      } else {
        res.status(404).json({ error: "No saved geojson found for this water balance" });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load geojson" });
  }
});

// API para checar conexão com o Banco
app.get("/api/db-status", async (req, res) => {
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT NOW() as current_time, current_database() as database, version() as version");
      res.json({ success: true, message: "Conectado com sucesso ao PostgreSQL!", data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro ao conectar no banco:", error);
    res.status(500).json({ success: false, error: error.message || "Falha na conexão com o banco de dados." });
  }
});

// API para inicializar do zero as tabelas do Banco
app.post("/api/init-db", async (req, res) => {
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await client.query("DROP TABLE IF EXISTS water_balance_maps CASCADE");
      await client.query("DROP TABLE IF EXISTS risk_references CASCADE");
      await client.query("DROP TABLE IF EXISTS template_files CASCADE");
      await client.query("DROP TABLE IF EXISTS demand_entries CASCADE");
      await client.query("DROP TABLE IF EXISTS demands CASCADE");
      await client.query("DROP TABLE IF EXISTS supply_sources CASCADE");
      await client.query("DROP TABLE IF EXISTS operational_adjustments CASCADE");
      await client.query("DROP TABLE IF EXISTS regions CASCADE");
      await client.query("DROP TABLE IF EXISTS systems CASCADE");
      await client.query("DROP TABLE IF EXISTS water_balances CASCADE");
      await client.query("DROP TABLE IF EXISTS scenario_entries CASCADE");
      await client.query("DROP TABLE IF EXISTS scenarios CASCADE");

      await client.query(`
        CREATE TABLE water_balances (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          responsible VARCHAR(255) NOT NULL,
          delivery_date TIMESTAMP,
          received_by VARCHAR(255),
          receipt_date TIMESTAMP,
          status VARCHAR(50) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE systems (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE regions (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          description TEXT,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE demands (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          modifiers_population NUMERIC,
          modifiers_coverage NUMERIC,
          modifiers_per_capita NUMERIC,
          modifiers_losses NUMERIC,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE demand_entries (
          id SERIAL PRIMARY KEY,
          demand_id INTEGER REFERENCES demands(id) ON DELETE CASCADE,
          region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
          year INTEGER NOT NULL,
          population NUMERIC NOT NULL,
          coverage NUMERIC NOT NULL,
          per_capita_consumption NUMERIC NOT NULL,
          losses NUMERIC NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE supply_sources (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          granted_flow NUMERIC NOT NULL,
          operational_flow NUMERIC NOT NULL,
          unavailable_flow NUMERIC NOT NULL,
          unavailability_reason TEXT,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE operational_adjustments (
          id SERIAL PRIMARY KEY,
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          flow_value NUMERIC NOT NULL,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE,
          linked_adjustment_id INTEGER REFERENCES operational_adjustments(id) ON DELETE SET NULL
        );
      `);

      await client.query(`
        CREATE TABLE template_files (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          url TEXT
        );
      `);

      await client.query(`
        CREATE TABLE water_balance_maps (
          id SERIAL PRIMARY KEY,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE UNIQUE,
          geojson_data JSONB
        );
      `);

      await client.query(`
        CREATE TABLE risk_references (
          id SERIAL PRIMARY KEY,
          iad VARCHAR(100) NOT NULL,
          risk_classification VARCHAR(255) NOT NULL,
          justification TEXT NOT NULL
        );
      `);

      await client.query(`
        INSERT INTO risk_references (iad, risk_classification, justification) VALUES
        ('< 120%', 'Risco Alto (Crítico)', '**Inadequação Normativa e Insegurança de Pico.** O critério internacional de estresse severo (WEI+ da Agência Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renovável. Urbanamente, o coeficiente de variação de consumo diário (K1) é fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma relação abaixo de 1,2 indica que o sistema não suportará o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidráulica.'),
        ('120% a 130%', 'Risco Médio (Alerta)', '**Perda da Margem de Contingência Operacional.** Nesta faixa, a oferta atende estritamente à demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" física do sistema cai para menos de 10%. Manuais de operação de saneamento e relatórios de risco hídrico apontam que trabalhar com menos de 10% de folga impede paradas para manutenções emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas físicas por vazamentos na distribution.'),
        ('> 130%', 'Risco Baixo (Adequado)', '**Resiliência e Segurança Hídrica Plena.** Garante o pleno atendimento das flutuações sazonais urbanas recomendadas pela engenharia civil clássica. A margem mínima acima de 30% absorve os coeficientes de pico de consumo, compensa variações na qualidade da água bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mantém o sistema operando em segurança contínua, em alinhamento com as zonas confortáveis prescritas pela ANA (Agência Nacional de Águas).')
      `);

      await client.query("COMMIT");
      res.json({ success: true, message: "Tabelas recriadas e limpas com sucesso no Neon PostgreSQL!" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro ao inicializar tabelas:", error);
    res.status(500).json({ success: false, error: error.message || "Falha ao criar as tabelas no banco de dados." });
  }
});

// API para ler e estruturar todos os dados da aplicação
app.get("/api/load-data", async (req, res) => {
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DROP TABLE IF EXISTS scenario_entries CASCADE");
      await client.query("DROP TABLE IF EXISTS scenarios CASCADE");
      
      // Auto-cria tabelas caso ainda não existam (segurança em produção)
      await client.query(`
        CREATE TABLE IF NOT EXISTS water_balances (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          responsible VARCHAR(255) NOT NULL,
          delivery_date TIMESTAMP,
          received_by VARCHAR(255),
          receipt_date TIMESTAMP,
          status VARCHAR(50) NOT NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS systems (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS regions (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          description TEXT,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS demands (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          modifiers_population NUMERIC,
          modifiers_coverage NUMERIC,
          modifiers_per_capita NUMERIC,
          modifiers_losses NUMERIC,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS demand_entries (
          id SERIAL PRIMARY KEY,
          demand_id INTEGER REFERENCES demands(id) ON DELETE CASCADE,
          region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
          year INTEGER NOT NULL,
          population NUMERIC NOT NULL,
          coverage NUMERIC NOT NULL,
          per_capita_consumption NUMERIC NOT NULL,
          losses NUMERIC NOT NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS supply_sources (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          granted_flow NUMERIC NOT NULL,
          operational_flow NUMERIC NOT NULL,
          unavailable_flow NUMERIC NOT NULL,
          unavailability_reason TEXT,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS operational_adjustments (
          id SERIAL PRIMARY KEY,
          system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          flow_value NUMERIC NOT NULL,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE,
          linked_adjustment_id INTEGER REFERENCES operational_adjustments(id) ON DELETE SET NULL
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS template_files (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          url TEXT
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS water_balance_maps (
          id SERIAL PRIMARY KEY,
          water_balance_id INTEGER REFERENCES water_balances(id) ON DELETE CASCADE UNIQUE,
          geojson_data JSONB
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS risk_references (
          id SERIAL PRIMARY KEY,
          iad VARCHAR(100) NOT NULL,
          risk_classification VARCHAR(255) NOT NULL,
          justification TEXT NOT NULL
        );
      `);
      const countResult = await client.query("SELECT COUNT(*) FROM risk_references");
      if (parseInt(countResult.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO risk_references (iad, risk_classification, justification) VALUES
          ('< 120%', 'Risco Alto (Crítico)', '**Inadequação Normativa e Insegurança de Pico.** O critério internacional de estresse severo (WEI+ da Agência Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renovável. Urbanamente, o coeficiente de variação de consumo diário (K1) é fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma relação abaixo de 1,2 indica que o sistema não suportará o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidráulica.'),
          ('120% a 130%', 'Risco Médio (Alerta)', '**Perda da Margem de Contingência Operacional.** Nesta faixa, a oferta atende estritamente à demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" física do sistema cai para menos de 10%. Manuais de operação de saneamento e relatórios de risco hídrico apontam que trabalhar com menos de 10% de folga impede paradas para manutenções emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas físicas por vazamentos na distribuição.'),
          ('> 130%', 'Risco Baixo (Adequado)', '**Resiliência e Segurança Hídrica Plena.** Garante o pleno atendimento das flutuações sazonais urbanas recomendadas pela engenharia civil clássica. A margem mínima acima de 30% absorve os coeficientes de pico de consumo, compensa variações na qualidade da água bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mantém o sistema operando em segurança contínua, em alinhamento com as zonas confortáveis prescritas pela ANA (Agência Nacional de Águas).')
        `);
      }
      await client.query(`
        UPDATE demands SET modifiers_coverage = NULL WHERE modifiers_coverage = 0;
      `);
      await client.query(`
        UPDATE demands SET modifiers_losses = NULL WHERE modifiers_losses = 0;
      `);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erro no INIT DB inline", err);
    } finally {
      client.release();
    }

    const clientRead = await pool.connect();
    try {
      const dbWaterBalances = await clientRead.query("SELECT * FROM water_balances");
      const dbSystems = await clientRead.query("SELECT * FROM systems");
      const dbRegions = await clientRead.query("SELECT * FROM regions");
      const dbDemands = await clientRead.query("SELECT * FROM demands");
      const dbDemandEntries = await clientRead.query("SELECT * FROM demand_entries");
      const dbSupplySources = await clientRead.query("SELECT * FROM supply_sources");
      const dbOperationalAdjustments = await clientRead.query("SELECT * FROM operational_adjustments");
      const dbTemplateFiles = await clientRead.query("SELECT * FROM template_files");
      const dbRiskReferences = await clientRead.query("SELECT * FROM risk_references ORDER BY id ASC");

      const mapEntriesToDemand = (demandId: number) => 
        dbDemandEntries.rows
          .filter(e => Number(e.demand_id) === demandId)
          .map(e => ({
            regionId: Number(e.region_id),
            year: e.year,
            population: Number(e.population),
            coverage: Number(e.coverage),
            perCapitaConsumption: Number(e.per_capita_consumption),
            losses: Number(e.losses)
          }));

      const demands = dbDemands.rows.map(s => ({
        id: Number(s.id),
        name: s.name,
        description: s.description,
        waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null,
        modifiers: {
          population: Number(s.modifiers_population),
          coverage: s.modifiers_coverage !== null && s.modifiers_coverage !== undefined ? Number(s.modifiers_coverage) : null,
          perCapitaConsumption: Number(s.modifiers_per_capita),
          losses: s.modifiers_losses !== null && s.modifiers_losses !== undefined ? Number(s.modifiers_losses) : null
        },
        entries: mapEntriesToDemand(Number(s.id))
      }));

      const payload = {
        waterBalances: dbWaterBalances.rows.map(wb => ({
          id: Number(wb.id),
          description: wb.description,
          responsible: wb.responsible,
          deliveryDate: wb.delivery_date,
          receivedBy: wb.received_by,
          receiptDate: wb.receipt_date,
          status: wb.status
        })),
        systems: dbSystems.rows.map(s => ({
          id: Number(s.id),
          code: s.code,
          name: s.name,
          waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null
        })),
        regions: dbRegions.rows.map(r => ({
          id: Number(r.id),
          code: r.code,
          name: r.name,
          systemId: Number(r.system_id),
          description: r.description,
          waterBalanceId: r.water_balance_id ? Number(r.water_balance_id) : null
        })),
        demands: demands,
        supplySources: dbSupplySources.rows.map(s => ({
          id: Number(s.id),
          code: s.code,
          systemId: Number(s.system_id),
          name: s.name,
          type: s.type,
          grantedFlow: Number(s.granted_flow),
          operationalFlow: Number(s.operational_flow),
          unavailableFlow: Number(s.unavailable_flow),
          unavailabilityReason: s.unavailability_reason,
          waterBalanceId: s.water_balance_id ? Number(s.water_balance_id) : null
        })),
        operationalAdjustments: dbOperationalAdjustments.rows.map(o => ({
          id: Number(o.id),
          systemId: Number(o.system_id),
          type: o.type,
          description: o.description,
          startYear: o.start_year,
          endYear: o.end_year,
          flowValue: Number(o.flow_value),
          waterBalanceId: o.water_balance_id ? Number(o.water_balance_id) : null,
          linkedAdjustmentId: o.linked_adjustment_id ? Number(o.linked_adjustment_id) : null
        })),
        templateFiles: dbTemplateFiles.rows.map(t => ({
          id: Number(t.id),
          name: t.name,
          description: t.description,
          url: t.url
        })),
        riskReferences: dbRiskReferences.rows.map(r => ({
          id: Number(r.id),
          iad: r.iad,
          riskClassification: r.risk_classification,
          justification: r.justification
        }))
      };

      res.json({ success: true, data: payload });
    } finally {
      clientRead.release();
    }
  } catch (error: any) {
    console.error("Erro ao carregar dados:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API salvar os dados (bulk)
app.post("/api/save-data", async (req, res) => {
  try {
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: "Empty payload. Aborting save to prevent data loss." });
    }
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      await client.query("TRUNCATE TABLE demand_entries, operational_adjustments, supply_sources, demands, regions, systems, water_balances CASCADE");

      const { waterBalances, systems, regions, demands, supplySources, operationalAdjustments } = data;

      if (waterBalances && waterBalances.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const wb of waterBalances) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6})`);
          values.push(
            parseSafeInt(wb.id),
            wb.description,
            wb.responsible,
            wb.deliveryDate ? new Date(wb.deliveryDate) : null,
            wb.receivedBy,
            wb.receiptDate ? new Date(wb.receiptDate) : null,
            wb.status
          );
          paramIndex += 7;
        }
        await client.query(
          `INSERT INTO water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             description = EXCLUDED.description,
             responsible = EXCLUDED.responsible,
             delivery_date = EXCLUDED.delivery_date,
             received_by = EXCLUDED.received_by,
             receipt_date = EXCLUDED.receipt_date,
             status = EXCLUDED.status`,
          values
        );
      }

      if (systems && systems.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const sys of systems) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3})`);
          values.push(
            parseSafeInt(sys.id),
            sys.code || null,
            sys.name,
            parseSafeInt(sys.waterBalanceId)
          );
          paramIndex += 4;
        }
        await client.query(
          `INSERT INTO systems (id, code, name, water_balance_id)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             code = EXCLUDED.code,
             name = EXCLUDED.name,
             water_balance_id = EXCLUDED.water_balance_id`,
          values
        );
      }

      if (regions && regions.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const reg of regions) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5})`);
          values.push(
            parseSafeInt(reg.id),
            reg.code || null,
            reg.name,
            parseSafeInt(reg.systemId),
            reg.description || null,
            parseSafeInt(reg.waterBalanceId)
          );
          paramIndex += 6;
        }
        await client.query(
          `INSERT INTO regions (id, code, name, system_id, description, water_balance_id)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             code = EXCLUDED.code,
             name = EXCLUDED.name,
             system_id = EXCLUDED.system_id,
             description = EXCLUDED.description,
             water_balance_id = EXCLUDED.water_balance_id`,
          values
        );
      }

      if (demands && demands.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const sc of demands) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
          values.push(
            parseSafeInt(sc.id),
            sc.name,
            sc.description || null,
            parseSafeFloat(sc.modifiers?.population),
            parseSafeFloatOrNull(sc.modifiers?.coverage),
            parseSafeFloat(sc.modifiers?.perCapitaConsumption),
            parseSafeFloatOrNull(sc.modifiers?.losses),
            parseSafeInt(sc.waterBalanceId)
          );
          paramIndex += 8;
        }
        await client.query(
          `INSERT INTO demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             modifiers_population = EXCLUDED.modifiers_population,
             modifiers_coverage = EXCLUDED.modifiers_coverage,
             modifiers_per_capita = EXCLUDED.modifiers_per_capita,
             modifiers_losses = EXCLUDED.modifiers_losses,
             water_balance_id = EXCLUDED.water_balance_id`,
          values
        );
      }

      const allEntries: any[] = [];
      if (demands) {
        for (const sc of demands) {
          if (sc.entries) {
            for (const entry of sc.entries) {
              allEntries.push({
                scId: parseSafeInt(sc.id),
                regionId: parseSafeInt(entry.regionId),
                year: parseSafeInt(entry.year) || 2026,
                population: parseSafeFloat(entry.population),
                coverage: parseSafeFloat(entry.coverage),
                perCapitaConsumption: parseSafeFloat(entry.perCapitaConsumption),
                losses: parseSafeFloat(entry.losses)
              });
            }
          }
        }
      }
      if (allEntries.length > 0) {
        const chunkSize = 2000;
        for (let i = 0; i < allEntries.length; i += chunkSize) {
          const chunk = allEntries.slice(i, i + chunkSize);
          const chunkValues: any[] = [];
          const chunkParts: string[] = [];
          let deParamIndex = 1;
          for (const row of chunk) {
            chunkParts.push(`($${deParamIndex}::integer, $${deParamIndex+1}::integer, $${deParamIndex+2}::integer, $${deParamIndex+3}::numeric, $${deParamIndex+4}::numeric, $${deParamIndex+5}::numeric, $${deParamIndex+6}::numeric)`);
            chunkValues.push(row.scId, row.regionId, row.year, row.population, row.coverage, row.perCapitaConsumption, row.losses);
            deParamIndex += 7;
          }
          const query = `
            INSERT INTO demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
            VALUES ${chunkParts.join(", ")}
            ON CONFLICT DO NOTHING
          `;
          await client.query(query, chunkValues);
        }
      }

      if (supplySources && supplySources.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const src of supplySources) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9})`);
          values.push(
            parseSafeInt(src.id),
            src.code || null,
            parseSafeInt(src.systemId),
            src.name,
            src.type,
            parseSafeFloat(src.grantedFlow),
            parseSafeFloat(src.operationalFlow),
            parseSafeFloat(src.unavailableFlow),
            src.unavailabilityReason || null,
            parseSafeInt(src.waterBalanceId)
          );
          paramIndex += 10;
        }
        await client.query(
          `INSERT INTO supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             code = EXCLUDED.code,
             system_id = EXCLUDED.system_id,
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             granted_flow = EXCLUDED.granted_flow,
             operational_flow = EXCLUDED.operational_flow,
             unavailable_flow = EXCLUDED.unavailable_flow,
             unavailability_reason = EXCLUDED.unavailability_reason,
             water_balance_id = EXCLUDED.water_balance_id`,
          values
        );
      }

      if (operationalAdjustments && Array.isArray(operationalAdjustments) && operationalAdjustments.length > 0) {
        const values: any[] = [];
        const queryParts = [];
        let paramIndex = 1;
        for (const adj of operationalAdjustments) {
          queryParts.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, NULL)`);
          values.push(
            parseSafeInt(adj.id),
            parseSafeInt(adj.systemId),
            adj.type,
            adj.description,
            parseSafeInt(adj.startYear) || 2026,
            parseSafeInt(adj.endYear) || 2026,
            parseSafeFloat(adj.flowValue),
            parseSafeInt(adj.waterBalanceId)
          );
          paramIndex += 8;
        }
        await client.query(
          `INSERT INTO operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
           VALUES ${queryParts.join(", ")}
           ON CONFLICT (id) DO UPDATE SET
             system_id = EXCLUDED.system_id,
             type = EXCLUDED.type,
             description = EXCLUDED.description,
             start_year = EXCLUDED.start_year,
             end_year = EXCLUDED.end_year,
             flow_value = EXCLUDED.flow_value,
             water_balance_id = EXCLUDED.water_balance_id`,
          values
        );

        for (const adj of operationalAdjustments) {
          if (adj.linkedAdjustmentId) {
            await client.query(
              `UPDATE operational_adjustments SET linked_adjustment_id = $1 WHERE id = $2`,
              [parseSafeInt(adj.linkedAdjustmentId), parseSafeInt(adj.id)]
            );
          }
        }
      }

      await client.query("SELECT setval(pg_get_serial_sequence('water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM water_balances");
      await client.query("SELECT setval(pg_get_serial_sequence('systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM systems");
      await client.query("SELECT setval(pg_get_serial_sequence('regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM regions");
      await client.query("SELECT setval(pg_get_serial_sequence('demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM demands");
      await client.query("SELECT setval(pg_get_serial_sequence('supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM supply_sources");
      await client.query("SELECT setval(pg_get_serial_sequence('operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM operational_adjustments");

      await client.query("COMMIT");
      res.json({ success: true, message: "Dados salvos no PostgreSQL com sucesso!" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro ao salvar dados:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API para salvar por módulo individual
app.post("/api/save-module", async (req, res) => {
  try {
    const { module, data } = req.body;
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (module === "water-balances") {
        const { waterBalances } = data;
        const keepIds = [];
        const wbValues: any[] = [];
        const wbParts = [];
        let wbParamIndex = 1;
        for (const wb of waterBalances) {
          const wbId = parseSafeInt(wb.id);
          if (wbId !== null) {
            keepIds.push(wbId);
            wbParts.push(`($${wbParamIndex}, $${wbParamIndex+1}, $${wbParamIndex+2}, $${wbParamIndex+3}, $${wbParamIndex+4}, $${wbParamIndex+5}, $${wbParamIndex+6})`);
            wbValues.push(
              wbId,
              wb.description,
              wb.responsible,
              wb.deliveryDate ? new Date(wb.deliveryDate) : null,
              wb.receivedBy,
              wb.receiptDate ? new Date(wb.receiptDate) : null,
              wb.status
            );
            wbParamIndex += 7;
          }
        }
        if (wbParts.length > 0) {
          await client.query(`
            INSERT INTO water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
            VALUES ${wbParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              description = EXCLUDED.description,
              responsible = EXCLUDED.responsible,
              delivery_date = EXCLUDED.delivery_date,
              received_by = EXCLUDED.received_by,
              receipt_date = EXCLUDED.receipt_date,
              status = EXCLUDED.status
          `, wbValues);
        }
        if (keepIds.length > 0) {
          await client.query(`DELETE FROM water_balances WHERE id NOT IN (${keepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, keepIds);
        } else {
          await client.query(`DELETE FROM water_balances`);
        }
      }

      if (module === "systems") {
        const { systems = [], regions = [] } = data;
        
        const sysKeepIds = [];
        const sysValues: any[] = [];
        const sysParts = [];
        let sysParamIndex = 1;
        for (const sys of systems) {
          const sysId = parseSafeInt(sys.id);
          if (sysId !== null) {
            sysKeepIds.push(sysId);
            sysParts.push(`($${sysParamIndex}, $${sysParamIndex+1}, $${sysParamIndex+2}, $${sysParamIndex+3})`);
            sysValues.push(
              sysId,
              sys.code || null,
              sys.name,
              parseSafeInt(sys.waterBalanceId)
            );
            sysParamIndex += 4;
          }
        }
        if (sysParts.length > 0) {
          await client.query(`
            INSERT INTO systems (id, code, name, water_balance_id)
            VALUES ${sysParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              name = EXCLUDED.name,
              water_balance_id = EXCLUDED.water_balance_id
          `, sysValues);
        }

        const regKeepIds = [];
        const regValues: any[] = [];
        const regParts = [];
        let regParamIndex = 1;
        for (const reg of regions) {
          const regId = parseSafeInt(reg.id);
          if (regId !== null) {
            regKeepIds.push(regId);
            regParts.push(`($${regParamIndex}, $${regParamIndex+1}, $${regParamIndex+2}, $${regParamIndex+3}, $${regParamIndex+4}, $${regParamIndex+5})`);
            regValues.push(
              regId,
              reg.code || null,
              reg.name,
              parseSafeInt(reg.systemId),
              reg.description || null,
              parseSafeInt(reg.waterBalanceId)
            );
            regParamIndex += 6;
          }
        }
        if (regParts.length > 0) {
          await client.query(`
            INSERT INTO regions (id, code, name, system_id, description, water_balance_id)
            VALUES ${regParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              name = EXCLUDED.name,
              system_id = EXCLUDED.system_id,
              description = EXCLUDED.description,
              water_balance_id = EXCLUDED.water_balance_id
          `, regValues);
        }

        if (regKeepIds.length > 0) {
          await client.query(`DELETE FROM regions WHERE id NOT IN (${regKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, regKeepIds);
        } else {
          await client.query(`DELETE FROM regions`);
        }
        
        if (sysKeepIds.length > 0) {
          await client.query(`DELETE FROM systems WHERE id NOT IN (${sysKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, sysKeepIds);
        } else {
          await client.query(`DELETE FROM systems`);
        }
      }

      if (module === "demands") {
        const { demands = [] } = data;
        const scKeepIds: number[] = [];
        const demandValues: any[] = [];
        const demandParts: string[] = [];
        let dParamIndex = 1;
        
        for (const sc of demands) {
          const scId = parseSafeInt(sc.id);
          if (scId !== null) {
            scKeepIds.push(scId);
            demandParts.push(`($${dParamIndex}::integer, $${dParamIndex+1}::varchar, $${dParamIndex+2}::text, $${dParamIndex+3}::numeric, $${dParamIndex+4}::numeric, $${dParamIndex+5}::numeric, $${dParamIndex+6}::numeric, $${dParamIndex+7}::integer)`);
            demandValues.push(
              scId,
              sc.name,
              sc.description || null,
              parseSafeFloat(sc.modifiers?.population),
              parseSafeFloatOrNull(sc.modifiers?.coverage),
              parseSafeFloat(sc.modifiers?.perCapitaConsumption),
              parseSafeFloatOrNull(sc.modifiers?.losses),
              parseSafeInt(sc.waterBalanceId)
            );
            dParamIndex += 8;
          }
        }
        
        if (demandParts.length > 0) {
          await client.query(`
            INSERT INTO demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
            VALUES ${demandParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              modifiers_population = EXCLUDED.modifiers_population,
              modifiers_coverage = EXCLUDED.modifiers_coverage,
              modifiers_per_capita = EXCLUDED.modifiers_per_capita,
              modifiers_losses = EXCLUDED.modifiers_losses,
              water_balance_id = EXCLUDED.water_balance_id
          `, demandValues);
        }

        if (scKeepIds.length > 0) {
          await client.query(`DELETE FROM demand_entries WHERE demand_id IN (${scKeepIds.join(", ")})`);
        }

        const allEntries: any[] = [];
        for (const sc of demands) {
          const scId = parseSafeInt(sc.id);
          if (scId !== null && sc.entries) {
            for (const entry of sc.entries) {
              allEntries.push({
                scId,
                regionId: parseSafeInt(entry.regionId),
                year: parseSafeInt(entry.year) || 2026,
                population: parseSafeFloat(entry.population),
                coverage: parseSafeFloat(entry.coverage),
                perCapitaConsumption: parseSafeFloat(entry.perCapitaConsumption),
                losses: parseSafeFloat(entry.losses)
              });
            }
          }
        }

        if (allEntries.length > 0) {
          const chunkSize = 2000;
          for (let i = 0; i < allEntries.length; i += chunkSize) {
            const chunk = allEntries.slice(i, i + chunkSize);
            const chunkValues: any[] = [];
            const chunkParts: string[] = [];
            let eParamIndex = 1;
            for (const row of chunk) {
              chunkParts.push(`($${eParamIndex}::integer, $${eParamIndex+1}::integer, $${eParamIndex+2}::integer, $${eParamIndex+3}::numeric, $${eParamIndex+4}::numeric, $${eParamIndex+5}::numeric, $${eParamIndex+6}::numeric)`);
              chunkValues.push(row.scId, row.regionId, row.year, row.population, row.coverage, row.perCapitaConsumption, row.losses);
              eParamIndex += 7;
            }
            await client.query(`
              INSERT INTO demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
              VALUES ${chunkParts.join(", ")}
              ON CONFLICT DO NOTHING
            `, chunkValues);
          }
        }

        if (scKeepIds.length > 0) {
          await client.query(`DELETE FROM demands WHERE id NOT IN (${scKeepIds.join(", ")})`);
        } else {
          await client.query(`DELETE FROM demands`);
        }
      }

      if (module === "supply-sources") {
        const { supplySources = [], operationalAdjustments = [] } = data;
        
        const supKeepIds = [];
        const supValues: any[] = [];
        const supParts = [];
        let supParamIndex = 1;
        for (const src of supplySources) {
          const srcId = parseSafeInt(src.id);
          if (srcId !== null) {
            supKeepIds.push(srcId);
            supParts.push(`($${supParamIndex}, $${supParamIndex+1}, $${supParamIndex+2}, $${supParamIndex+3}, $${supParamIndex+4}, $${supParamIndex+5}, $${supParamIndex+6}, $${supParamIndex+7}, $${supParamIndex+8}, $${supParamIndex+9})`);
            supValues.push(
              srcId,
              src.code || null,
              parseSafeInt(src.systemId),
              src.name,
              src.type,
              parseSafeFloat(src.grantedFlow),
              parseSafeFloat(src.operationalFlow),
              parseSafeFloat(src.unavailableFlow),
              src.unavailabilityReason || null,
              parseSafeInt(src.waterBalanceId)
            );
            supParamIndex += 10;
          }
        }
        if (supParts.length > 0) {
          await client.query(`
            INSERT INTO supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
            VALUES ${supParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              system_id = EXCLUDED.system_id,
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              granted_flow = EXCLUDED.granted_flow,
              operational_flow = EXCLUDED.operational_flow,
              unavailable_flow = EXCLUDED.unavailable_flow,
              unavailability_reason = EXCLUDED.unavailability_reason,
              water_balance_id = EXCLUDED.water_balance_id
          `, supValues);
        }
        if (supKeepIds.length > 0) {
          await client.query(`DELETE FROM supply_sources WHERE id NOT IN (${supKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, supKeepIds);
        } else {
          await client.query(`DELETE FROM supply_sources`);
        }

        const adjKeepIds = [];
        const adjValues: any[] = [];
        const adjParts = [];
        let adjParamIndex = 1;
        for (const adj of operationalAdjustments) {
          const adjId = parseSafeInt(adj.id);
          if (adjId !== null) {
            adjKeepIds.push(adjId);
            adjParts.push(`($${adjParamIndex}, $${adjParamIndex+1}, $${adjParamIndex+2}, $${adjParamIndex+3}, $${adjParamIndex+4}, $${adjParamIndex+5}, $${adjParamIndex+6}, $${adjParamIndex+7}, NULL)`);
            adjValues.push(
              adjId,
              parseSafeInt(adj.systemId),
              adj.type,
              adj.description,
              parseSafeInt(adj.startYear) || 2026,
              parseSafeInt(adj.endYear) || 2026,
              parseSafeFloat(adj.flowValue),
              parseSafeInt(adj.waterBalanceId)
            );
            adjParamIndex += 8;
          }
        }

        if (adjParts.length > 0) {
          await client.query(`
            INSERT INTO operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
            VALUES ${adjParts.join(", ")}
            ON CONFLICT (id) DO UPDATE SET
              system_id = EXCLUDED.system_id,
              type = EXCLUDED.type,
              description = EXCLUDED.description,
              start_year = EXCLUDED.start_year,
              end_year = EXCLUDED.end_year,
              flow_value = EXCLUDED.flow_value,
              water_balance_id = EXCLUDED.water_balance_id
          `, adjValues);
        }

        const linkUpdates = operationalAdjustments.filter((adj: any) => parseSafeInt(adj.id) !== null && adj.linkedAdjustmentId);
        if (linkUpdates.length > 0) {
          const linkParts = [];
          const linkValues: any[] = [];
          let linkIndex = 1;
          for (const adj of linkUpdates) {
            linkParts.push(`($${linkIndex}::integer, $${linkIndex+1}::integer)`);
            linkValues.push(parseSafeInt(adj.id), parseSafeInt(adj.linkedAdjustmentId));
            linkIndex += 2;
          }
          await client.query(`
            UPDATE operational_adjustments as o 
            SET linked_adjustment_id = v.linked_id 
            FROM (VALUES ${linkParts.join(", ")}) as v(id, linked_id) 
            WHERE o.id = v.id
          `, linkValues);
        }

        if (adjKeepIds.length > 0) {
          await client.query(`DELETE FROM operational_adjustments WHERE id NOT IN (${adjKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, adjKeepIds);
        } else {
          await client.query(`DELETE FROM operational_adjustments`);
        }
      }

      await client.query("SELECT setval(pg_get_serial_sequence('water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM water_balances");
      await client.query("SELECT setval(pg_get_serial_sequence('systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM systems");
      await client.query("SELECT setval(pg_get_serial_sequence('regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM regions");
      await client.query("SELECT setval(pg_get_serial_sequence('demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM demands");
      await client.query("SELECT setval(pg_get_serial_sequence('supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM supply_sources");
      await client.query("SELECT setval(pg_get_serial_sequence('operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM operational_adjustments");

      await client.query("COMMIT");
      res.json({ success: true, message: `Módulo ${module} salvo com sucesso.` });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Erro ao salvar módulo:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handler de erros global
app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express API error:", err);
  res.status(err.status || 500).json({ success: false, error: err.message || "Internal Server Error" });
});

export default app;
