import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";

let dbPool: Pool | null = null;

function parseSafeInt(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") {
    return isNaN(val) ? null : Math.floor(val);
  }
  const str = String(val).trim();
  // Try parsing directly if it is already numeric
  const directParsed = parseInt(str, 10);
  if (!isNaN(directParsed) && /^-?\d+$/.test(str)) {
    return directParsed;
  }
  // Try extracting the first contiguous match of digits from the string (e.g., "wb-2026" -> 2026)
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
      // O banco de dados Neon exige conexões seguras por SSL
      ssl: { rejectUnauthorized: false }
    });
  }
  return dbPool;
}

async function rollUpTask(client: any, parentId: number | null) {
  if (!parentId) return;

  const res = await client.query(
    "SELECT start_date, end_date, progress FROM pl_tasks WHERE parent_id = $1",
    [parentId]
  );
  
  if (res.rows.length === 0) return;

  let minStart: Date | null = null;
  let maxEnd: Date | null = null;
  let totalProgress = 0;
  let validChildrenCount = 0;

  for (const row of res.rows) {
    if (row.start_date) {
      const d = new Date(row.start_date);
      if (!minStart || d < minStart) minStart = d;
    }
    if (row.end_date) {
      const d = new Date(row.end_date);
      if (!maxEnd || d > maxEnd) maxEnd = d;
    }
    totalProgress += Number(row.progress) || 0;
    validChildrenCount++;
  }

  const avgProgress = validChildrenCount > 0 ? Math.round(totalProgress / validChildrenCount) : 0;
  
  let status = "Não iniciada";
  if (avgProgress === 100) {
    status = "Concluída";
  } else if (avgProgress > 0) {
    status = "Em andamento";
  }

  await client.query(
    `UPDATE pl_tasks 
     SET start_date = $1, end_date = $2, progress = $3, status = $4
     WHERE id = $5`,
    [minStart, maxEnd, avgProgress, status, parentId]
  );

  const parentRes = await client.query("SELECT parent_id FROM pl_tasks WHERE id = $1", [parentId]);
  if (parentRes.rows.length > 0 && parentRes.rows[0].parent_id) {
    await rollUpTask(client, parentRes.rows[0].parent_id);
  }
}

async function cascadeAreasAndCategories(client: any, parentTaskId: number, areaIds: number[], categoryIds: number[]) {
  const childrenRes = await client.query("SELECT id FROM pl_tasks WHERE parent_id = $1", [parentTaskId]);
  for (const row of childrenRes.rows) {
    const childId = row.id;
    
    // update child areaIds
    await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [childId]);
    if (areaIds && areaIds.length > 0) {
      for (const aid of areaIds) {
        await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, aid]);
      }
    }
    
    // update child categoryIds
    await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [childId]);
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [childId, cid]);
      }
    }

    // recursive call
    await cascadeAreasAndCategories(client, childId, areaIds, categoryIds);
  }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentWord = "";
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(currentWord.trim());
      currentWord = "";
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord.trim());
  return result;
}

async function seedTasks(client: any) {
  const checkTable = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'pl_tasks'
    )
  `);
  if (!checkTable.rows[0].exists) {
    return;
  }

  if (fs.existsSync(path.join(process.cwd(), "tasks_cleared_marker.txt"))) {
    console.log("[LOG] seedTasks: pulando semeadura porque o arquivo tasks_cleared_marker.txt existe.");
    return;
  }

  const result = await client.query("SELECT COUNT(*) FROM pl_tasks");
  if (parseInt(result.rows[0].count, 10) > 0) {
    return;
  }

  const rawPath = path.join(process.cwd(), "src", "tasks_raw.txt");
  if (!fs.existsSync(rawPath)) {
    console.log("No seed file tasks_raw.txt found");
    return;
  }

  // Load plans
  let plan2025Id = null;
  let plan2026Id = null;
  try {
    const plansInfo = await client.query("SELECT id, name FROM pl_plans");
    plansInfo.rows.forEach((p: any) => {
      if (p.name.includes("2025")) plan2025Id = p.id;
      if (p.name.includes("2026")) plan2026Id = p.id;
    });
  } catch (err) {
    console.error("Error fetching plans for seeding:", err);
  }

  // Load categories and their associated areas
  const categoryMap = new Map();
  try {
    const catsAndAreas = await client.query(`
      SELECT c.id AS cat_id, c.name AS cat_name, ca.area_id
      FROM pl_categories c
      LEFT JOIN pl_category_areas ca ON c.id = ca.category_id
    `);
    catsAndAreas.rows.forEach((row: any) => {
      const nameKey = row.cat_name.trim().toLowerCase();
      if (!categoryMap.has(nameKey)) {
        categoryMap.set(nameKey, { id: row.cat_id, name: row.cat_name, areaIds: [] });
      }
      if (row.area_id) {
        categoryMap.get(nameKey).areaIds.push(row.area_id);
      }
    });
  } catch (err) {
    console.error("Error fetching categories for seeding:", err);
  }

  // Load responsibles
  let regId = null; // Equipe Técnica de Regulação
  let fiscId = null; // Superintendência de Fiscalização
  let qualId = null; // Núcleo de Qualidade do Atendimento
  let saneId = null; // Superintendência de Saneamento

  try {
    const resps = await client.query("SELECT id, name FROM pl_responsibles");
    resps.rows.forEach((r: any) => {
      if (r.name.includes("Regulação")) regId = r.id;
      else if (r.name.includes("Fiscalização")) fiscId = r.id;
      else if (r.name.includes("Qualidade")) qualId = r.id;
      else if (r.name.includes("Saneamento")) saneId = r.id;
    });
  } catch (err) {
    console.error("Error loading responsibles for seeding:", err);
  }

  const associateTaskRelations = async (taskId: number, matchedCat: any, matchedRespId: any) => {
    if (matchedCat) {
      await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, matchedCat.id]);
      if (matchedCat.areaIds && matchedCat.areaIds.length > 0) {
        for (const aId of matchedCat.areaIds) {
          await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, aId]);
        }
      }
    }
    if (matchedRespId) {
      await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, matchedRespId]);
    }
  };

  const content = fs.readFileSync(rawPath, "utf8");
  const lines = content.split("\n");
  let headerSeen = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith("﻿ID do Usuário") || trimmed.startsWith("ID do Usuário")) {
      continue;
    }
    if (trimmed.startsWith("0724fb5c") || trimmed.startsWith("fda950ef") || trimmed.startsWith("2ae3f3ed") || trimmed.startsWith("cf342551") || trimmed.startsWith("f481186f") || trimmed.startsWith("ec42f598") || trimmed.startsWith("cbb3f9ba") || trimmed.startsWith("b4475902") || trimmed.startsWith("ff74bee7")) {
      continue;
    }

    if (trimmed.startsWith("﻿Identificação da tarefa") || trimmed.startsWith("Identificação da tarefa")) {
      headerSeen = true;
      continue;
    }

    if (!headerSeen) continue;

    const parts = splitCsvLine(trimmed);
    if (parts.length < 5) continue;

    const title = parts[1] || "";
    const categoryName = parts[3] || "";
    let statusText = parts[4] || "Não iniciado";
    const priority = parts[5] || "Média";
    let assigned_to = parts[6] || "";
    const created_by = parts[7] || "";
    const end_date_str = parts[9] || null;
    const start_date_str = parts[10] || null;
    const checklist_itens_str = parts[16] || "";
    const notes = parts[18] || "";

    let status = "pending";
    if (statusText === "Concluída" || statusText === "Concluído") {
      status = "completed";
    } else if (statusText === "Em andamento") {
      status = "in_progress";
    }

    let start_date = start_date_str ? new Date(start_date_str) : null;
    let end_date = end_date_str ? new Date(end_date_str) : null;
    if (start_date && isNaN(start_date.getTime())) start_date = null;
    if (end_date && isNaN(end_date.getTime())) end_date = null;

    if (assigned_to.startsWith('"') && assigned_to.endsWith('"')) {
      assigned_to = assigned_to.substring(1, assigned_to.length - 1);
    }
    assigned_to = assigned_to.replace(/;/g, ", ").trim();

    // Determine plan_id based on year
    let plan_id = null;
    let year = null;
    if (start_date) {
      year = start_date.getUTCFullYear();
    } else if (end_date) {
      year = end_date.getUTCFullYear();
    }
    
    if (year === 2025 && plan2025Id) {
      plan_id = plan2025Id;
    } else if (year === 2026 && plan2026Id) {
      plan_id = plan2026Id;
    } else {
      plan_id = plan2026Id || plan2025Id || null;
    }

    // Match category
    const catClean = categoryName.trim().toLowerCase();
    let matchedCat = null;
    if (categoryMap.has(catClean)) {
      matchedCat = categoryMap.get(catClean);
    } else {
      for (const [key, val] of categoryMap.entries()) {
        if (key.includes(catClean) || catClean.includes(key)) {
          matchedCat = val;
          break;
        }
      }
    }

    // Determine responsible_id
    let matchedRespId = saneId;
    if (matchedCat && matchedCat.areaIds && matchedCat.areaIds.length > 0) {
      const firstAreaId = matchedCat.areaIds[0];
      if (firstAreaId === 1 && regId) matchedRespId = regId;
      else if (firstAreaId === 2 && fiscId) matchedRespId = fiscId;
      else if (firstAreaId === 3 && qualId) matchedRespId = qualId;
    }

    const insertRes = await client.query(
      `INSERT INTO pl_tasks (title, description, start_date, end_date, status, progress, priority, category, assigned_to, created_by, notes, plan_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        title,
        notes,
        start_date,
        end_date,
        status,
        status === "completed" ? 100 : 0,
        priority,
        categoryName,
        assigned_to,
        created_by,
        notes,
        plan_id
      ]
    );

    const parentId = insertRes.rows[0].id;
    await associateTaskRelations(parentId, matchedCat, matchedRespId);

    if (checklist_itens_str) {
      let checklist_clean = checklist_itens_str;
      if (checklist_clean.startsWith('"') && checklist_clean.endsWith('"')) {
        checklist_clean = checklist_clean.substring(1, checklist_clean.length - 1);
      }
      const checklist_items = checklist_clean.split(";");
      for (const item of checklist_items) {
        const title_sub = item.trim();
        if (!title_sub) continue;

        const subRes = await client.query(
          `INSERT INTO pl_tasks (title, description, start_date, end_date, status, progress, parent_id, priority, category, assigned_to, plan_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            title_sub,
            "",
            start_date,
            end_date,
            status,
            status === "completed" ? 100 : 0,
            parentId,
            priority,
            categoryName,
            assigned_to,
            plan_id
          ]
        );
        const subTaskId = subRes.rows[0].id;
        await associateTaskRelations(subTaskId, matchedCat, matchedRespId);
      }
      await rollUpTask(client, parentId);
    }
  }
}

async function runStartupMigration() {
  console.log("Migrating database schema: Creating tables safely if they do not exist...");
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_water_balances (
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
        CREATE TABLE IF NOT EXISTS wb_systems (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_regions (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
          description TEXT,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
        );
      `);

      await client.query(`
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
      `);

      await client.query(`
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
      `);

      await client.query(`
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
      `);

      await client.query(`
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
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_template_files (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          url TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_water_balance_maps (
          id SERIAL PRIMARY KEY,
          water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE UNIQUE,
          geojson_data JSONB
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wb_risk_references (
          id SERIAL PRIMARY KEY,
          iad VARCHAR(100) NOT NULL,
          risk_classification VARCHAR(255) NOT NULL,
          justification TEXT NOT NULL
        );
      `);

      const riskCountRes = await client.query("SELECT COUNT(*) FROM wb_risk_references");
      if (parseInt(riskCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO wb_risk_references (iad, risk_classification, justification) VALUES
          ('< 120%', 'Risco Alto (Crítico)', '**Inadequação Normativa e Insegurança de Pico.** O critério internacional de estresse severo (WEI+ da Agência Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renovável. Urbanamente, o coeficiente de variação de consumo diário (K1) é fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma relação abaixo de 1,2 indica que o sistema não suportará o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidráulica.'),
          ('120% a 130%', 'Risco Médio (Alerta)', '**Perda da Margem de Contingência Operacional.** Nesta faixa, a oferta atende estritamente à demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" física do sistema cai para menos de 10%. Manuais de operação de saneamento e relatórios de risco hídrico apontam que trabalhar com menos de 10% de folga impede paradas para manutenções emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas físicas por vazamentos na distribuição.'),
          ('> 130%', 'Risco Baixo (Adequado)', '**Resiliência e Segurança Hídrica Plena.** Garante o pleno atendimento das flutuações sazonais urbanas recomendadas pela engenharia civil clássica. A margem mínima acima de 30% absorve os coeficientes de pico de consumo, compensa variações na qualidade da água bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mantém o sistema operando em segurança contínua, em alinhamento com as zonas confortáveis prescritas pela ANA (Agência Nacional de Águas).')
        `);
      }

      await client.query(`
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
          notes TEXT
        );
      `);

      await client.query("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON pl_tasks(parent_id);");

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_areas (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          abbreviation VARCHAR(2)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_category_areas (
          category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          PRIMARY KEY (category_id, area_id)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_categories (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, category_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          title VARCHAR(255),
          description TEXT
        );
      `);
      
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES pl_plans(id) ON DELETE SET NULL;`);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_responsibles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(100)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_responsible_areas (
          responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          PRIMARY KEY (responsible_id, area_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_areas (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, area_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS pl_task_responsibles (
          task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
          responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
          PRIMARY KEY (task_id, responsible_id)
        );
      `);

      // Seed the tasks (checks if it exists internally)
      await seedTasks(client);

      // Verify that depends_on_task_id exists
      await client.query(`ALTER TABLE pl_tasks ADD COLUMN IF NOT EXISTS depends_on_task_id INTEGER REFERENCES pl_tasks(id) ON DELETE SET NULL;`);

      await client.query("COMMIT");
      console.log("Database tables verified successfully on server start!");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to verify/migrate database schema on startup:", err);
  }
}

async function startServer() {
  await runStartupMigration();

  const app = express();
  const PORT = 3000;

  // For parsing application/json. Increase limit for large GeoJSONs
  app.use(express.json({ limit: "50mb" }));

  const publicPath = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicPath)) {
    try {
      fs.mkdirSync(publicPath);
    } catch (e) {
      console.error(e);
    }
  }

  // API to save GeoJSON
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
          "INSERT INTO wb_water_balance_maps (water_balance_id, geojson_data) VALUES ($1, $2) ON CONFLICT (water_balance_id) DO UPDATE SET geojson_data = EXCLUDED.geojson_data",
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

  // API to save template files
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
        
        await client.query("TRUNCATE TABLE wb_template_files CASCADE");

        // Sanitize the IDs dynamically so that anything that is not an integer is converted/reassimilated to not crash Postgres serial constraint (<= 2147483647)
        let currentMaxId = 0;
        const sanitizedFiles = templateFiles.map((tf: any) => {
          let parsedId = parseInt(String(tf.id), 10);
          if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
            const digitsOnly = String(tf.id).replace(/\D/g, "");
            parsedId = parseInt(digitsOnly, 10);
            if (isNaN(parsedId) || parsedId > 2147483647 || parsedId <= 0) {
              parsedId = 0; // will be resolved sequentially
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
            "INSERT INTO wb_template_files (id, name, description, url) VALUES ($1, $2, $3, $4)",
            [tf.id, tf.name, tf.description, tf.url]
          );
        }

        // Adjust the Postgres sequences for the template_files table to ensure any next INSERT works seamlessly
        await client.query(
          "SELECT setval(pg_get_serial_sequence('wb_template_files', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_template_files"
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

  // API to load GeoJSON
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
          "SELECT geojson_data FROM wb_water_balance_maps WHERE water_balance_id = $1",
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

  // API to test Database connection
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

  // API to initialize Database tables
  app.post("/api/init-db", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        await client.query("DROP TABLE IF EXISTS wb_water_balance_maps CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_risk_references CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_template_files CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_demand_entries CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_demands CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_supply_sources CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_operational_adjustments CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_regions CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_systems CASCADE");
        await client.query("DROP TABLE IF EXISTS wb_water_balances CASCADE");
        await client.query("DROP TABLE IF EXISTS scenario_entries CASCADE");
        await client.query("DROP TABLE IF EXISTS scenarios CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_task_categories CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_categories CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_task_areas CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_task_responsibles CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_tasks CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_responsibles CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_areas CASCADE");
        await client.query("DROP TABLE IF EXISTS pl_plans CASCADE");

        await client.query(`
          CREATE TABLE wb_water_balances (
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
          CREATE TABLE wb_systems (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50),
            name VARCHAR(255) NOT NULL,
            water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
          );
        `);

        await client.query(`
          CREATE TABLE wb_regions (
            id SERIAL PRIMARY KEY,
            code VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            system_id INTEGER REFERENCES wb_systems(id) ON DELETE CASCADE,
            description TEXT,
            water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
          );
        `);

        await client.query(`
          CREATE TABLE wb_demands (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            modifiers_population NUMERIC,
            modifiers_coverage NUMERIC,
            modifiers_per_capita NUMERIC,
            modifiers_losses NUMERIC,
            water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE
          );
        `);

        await client.query(`
          CREATE TABLE wb_demand_entries (
            id SERIAL PRIMARY KEY,
            demand_id INTEGER REFERENCES wb_demands(id) ON DELETE CASCADE,
            region_id INTEGER REFERENCES wb_regions(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            population NUMERIC NOT NULL,
            coverage NUMERIC NOT NULL,
            per_capita_consumption NUMERIC NOT NULL,
            losses NUMERIC NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE wb_supply_sources (
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
        `);

        await client.query(`
          CREATE TABLE wb_operational_adjustments (
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
        `);

        await client.query(`
          CREATE TABLE wb_template_files (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            url TEXT
          );
        `);

        await client.query(`
          CREATE TABLE wb_water_balance_maps (
            id SERIAL PRIMARY KEY,
            water_balance_id INTEGER REFERENCES wb_water_balances(id) ON DELETE CASCADE UNIQUE,
            geojson_data JSONB
          );
        `);

        await client.query(`
          CREATE TABLE wb_risk_references (
            id SERIAL PRIMARY KEY,
            iad VARCHAR(100) NOT NULL,
            risk_classification VARCHAR(255) NOT NULL,
            justification TEXT NOT NULL
          );
        `);

        await client.query(`
          INSERT INTO wb_risk_references (iad, risk_classification, justification) VALUES
          ('< 120%', 'Risco Alto (Crítico)', '**Inadequação Normativa e Insegurança de Pico.** O critério internacional de estresse severo (WEI+ da Agência Europeia do Ambiente) define insustentabilidade a longo prazo quando a demanda sufoca a oferta renovável. Urbanamente, o coeficiente de variação de consumo diário (K1) é fixado internacionalmente e na ABNT NBR 12218 como 1,2. Uma relação abaixo de 1,2 indica que o sistema não suportará o dia de maior consumo do ano, resultando em desabastecimento imediato de bairros e falha hidráulica.'),
          ('120% a 130%', 'Risco Médio (Alerta)', '**Perda da Margem de Contingência Operacional.** Nesta faixa, a oferta atende estritamente à demanda no dia de pico urbano (K1 = 1,2), mas a "sobra" física do sistema cai para menos de 10%. Manuais de operação de saneamento e relatórios de risco hídrico apontam que trabalhar com menos de 10% de folga impede paradas para manutenções emergenciais (como queima de bombas) e desprotege a rede contra picos severos de perdas físicas por vazamentos na distribuição.'),
          ('> 130%', 'Risco Baixo (Adequado)', '**Resiliência e Segurança Hídrica Plena.** Garante o pleno atendimento das flutuações sazonais urbanas recomendadas pela engenharia civil clássica. A margem mínima acima de 30% absorve os coeficientes de pico de consumo, compensa variações na qualidade da água bruta (como turbidez severa em chuvas que reduzem o ritmo das ETAs) e mantém o sistema operando em segurança contínua, em alinhamento com as zonas confortáveis prescritas pela ANA (Agência Nacional de Águas).')
        `);

        // Recreation of Plans, Areas, Responsibles and Tasks tables in init-db inside server.ts
        await client.query(`
          CREATE TABLE pl_plans (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            title VARCHAR(255),
            description TEXT
          );
        `);

        await client.query(`
          CREATE TABLE pl_areas (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            abbreviation VARCHAR(2)
          );
        `);

        await client.query(`
          CREATE TABLE pl_responsibles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            role VARCHAR(255)
          );
        `);

        await client.query(`
          CREATE TABLE pl_responsible_areas (
            responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
            area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
            PRIMARY KEY (responsible_id, area_id)
          );
        `);

        await client.query(`
          CREATE TABLE pl_tasks (
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
            plan_id INTEGER REFERENCES pl_plans(id) ON DELETE SET NULL
          );
        `);

        await client.query(`
          CREATE TABLE pl_task_areas (
            task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
            area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, area_id)
          );
        `);

        await client.query(`
          CREATE TABLE pl_task_responsibles (
            task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
            responsible_id INTEGER REFERENCES pl_responsibles(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, responsible_id)
          );
        `);

        await client.query(`
          CREATE TABLE pl_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE pl_category_areas (
            category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
            area_id INTEGER REFERENCES pl_areas(id) ON DELETE CASCADE,
            PRIMARY KEY (category_id, area_id)
          );
        `);

        await client.query(`
          CREATE TABLE pl_task_categories (
            task_id INTEGER REFERENCES pl_tasks(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES pl_categories(id) ON DELETE CASCADE,
            PRIMARY KEY (task_id, category_id)
          );
        `);

        await client.query("CREATE INDEX IF NOT EXISTS idx_tasks_parent_id_init ON pl_tasks(parent_id);");

        // Seed default plans, areas, and responsibles
        const r2025 = await client.query("INSERT INTO pl_plans (name, title, description) VALUES ('Plano de Atividades 2025', 'Plano de Atividades 2025', 'Plano estratégico das ações para o ano de 2025.') RETURNING id");
        const r2026 = await client.query("INSERT INTO pl_plans (name, title, description) VALUES ('Plano de Atividades 2026', 'Plano de Atividades 2026', 'Planejamento estratégico das ações para o ano de 2026.') RETURNING id");
        
        const plan2025Id = r2025.rows[0].id;
        const plan2026Id = r2026.rows[0].id;

        await client.query("INSERT INTO pl_areas (name) VALUES ('Regulação'), ('Fiscalização'), ('Qualidade do Atendimento'), ('Sustentabilidade'), ('Gestão de Clientes')");

        // Seed default categories corresponding to their areas
        const areasRes = await client.query("SELECT id, name FROM pl_areas ORDER BY id ASC");
        for (const areaRow of areasRes.rows) {
          let catNames: string[] = [];
          if (areaRow.name === 'Regulação') {
            catNames = ['Auditoria de Tarifas', 'Análise de Contratos', 'NORMAS E ESTUDOS'];
          } else if (areaRow.name === 'Fiscalização') {
            catNames = ['Vistoria Técnica', 'Medição de Indicadores'];
          } else if (areaRow.name === 'Qualidade do Atendimento') {
            catNames = ['Pesquisa de Satisfação', 'Ouvidoria de Reclamações', 'PLANEJAMENTO'];
          } else if (areaRow.name === 'Sustentabilidade') {
            catNames = ['Eficiência Hidrelétrica', 'Reuso de Água', 'PROJETOS ESPECIAIS'];
          } else if (areaRow.name === 'Gestão de Clientes') {
            catNames = ['Cadastro de Usuários', 'Billing e Faturamento', 'PONTUAIS'];
          }
          for (const cName of catNames) {
            const resC = await client.query("INSERT INTO pl_categories (name) VALUES ($1) RETURNING id", [cName]);
            await client.query("INSERT INTO pl_category_areas (category_id, area_id) VALUES ($1, $2)", [resC.rows[0].id, areaRow.id]);
          }
        }

        await client.query("INSERT INTO pl_responsibles (name, email, role) VALUES ('Superintendência de Saneamento', 'saneamento@adasa.df.gov.br', 'Direção Técnica')");
        await client.query("INSERT INTO pl_responsibles (name, email, role) VALUES ('Equipe Técnica de Regulação', 'regulacao@adasa.df.gov.br', 'Equipe Técnica')");
        await client.query("INSERT INTO pl_responsibles (name, email, role) VALUES ('Superintendência de Fiscalização', 'fiscalizacao@adasa.df.gov.br', 'Fiscalizadores')");
        await client.query("INSERT INTO pl_responsibles (name, email, role) VALUES ('Núcleo de Qualidade do Atendimento', 'qualidade@adasa.df.gov.br', 'Atendimento')");

        await seedTasks(client);

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

  app.get("/api/load-data", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const dbWaterBalances = await client.query("SELECT * FROM wb_water_balances");
        const dbSystems = await client.query("SELECT * FROM wb_systems");
        const dbRegions = await client.query("SELECT * FROM wb_regions");
        const dbDemands = await client.query("SELECT * FROM wb_demands");
        const dbDemandEntries = await client.query("SELECT * FROM wb_demand_entries");
        const dbSupplySources = await client.query("SELECT * FROM wb_supply_sources");
        const dbOperationalAdjustments = await client.query("SELECT * FROM wb_operational_adjustments");
        const dbTemplateFiles = await client.query("SELECT * FROM wb_template_files");
        const dbRiskReferences = await client.query("SELECT * FROM wb_risk_references ORDER BY id ASC");
        const dbTasks = await client.query("SELECT * FROM pl_tasks ORDER BY id ASC");
        const dbPlans = await client.query("SELECT * FROM pl_plans ORDER BY id ASC");
        const dbAreas = await client.query("SELECT * FROM pl_areas ORDER BY id ASC");
        const dbResponsibles = await client.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
        const dbResponsibleAreas = await client.query("SELECT * FROM pl_responsible_areas");
        const dbTaskAreas = await client.query("SELECT * FROM pl_task_areas");
        const dbTaskResponsibles = await client.query("SELECT * FROM pl_task_responsibles");

        const responsibleAreasMap: Record<number, number[]> = {};
        dbResponsibleAreas.rows.forEach(r => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });

        const taskAreasMap: Record<number, number[]> = {};
        dbTaskAreas.rows.forEach(r => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });

        const taskResponsiblesMap: Record<number, number[]> = {};
        dbTaskResponsibles.rows.forEach(r => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });

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
          })),
          plans: dbPlans.rows.map(p => ({
            id: Number(p.id),
            name: p.name || p.title || "Plano Sem Nome",
            title: p.title || p.name || "Plano Sem Nome",
            description: p.description
          })),
          areas: dbAreas.rows.map(a => ({
            id: Number(a.id),
            name: a.name,
            abbreviation: a.abbreviation,
            planId: null
          })),
          responsibles: dbResponsibles.rows.map(r => ({
            id: Number(r.id),
            name: r.name,
            email: r.email,
            role: r.role,
            areaIds: responsibleAreasMap[Number(r.id)] || []
          })),
          tasks: dbTasks.rows.map(t => ({
            id: Number(t.id),
            title: t.title,
            description: t.description,
            startDate: t.start_date,
            endDate: t.end_date,
            status: t.status,
            parentId: t.parent_id ? Number(t.parent_id) : null,
            progress: Number(t.progress) || 0,
            priority: t.priority,
            category: t.category,
            assignedTo: t.assigned_to,
            createdBy: t.created_by,
            notes: t.notes,
            planId: t.plan_id ? Number(t.plan_id) : null,
            areaIds: taskAreasMap[Number(t.id)] || [],
            responsibleIds: taskResponsiblesMap[Number(t.id)] || []
          }))
        };

        res.json({ success: true, data: payload });
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error && error.message === "A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING", data: null });
      }
      console.error("Erro ao carregar dados:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

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
        
        await client.query("TRUNCATE TABLE wb_demand_entries, operational_adjustments, supply_sources, demands, regions, systems, water_balances CASCADE");

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
            `INSERT INTO wb_water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
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
            `INSERT INTO wb_systems (id, code, name, water_balance_id)
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
            `INSERT INTO wb_regions (id, code, name, system_id, description, water_balance_id)
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
            `INSERT INTO wb_demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
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
              INSERT INTO wb_demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
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
            `INSERT INTO wb_supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
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
            `INSERT INTO wb_operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
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
                `UPDATE wb_operational_adjustments SET linked_adjustment_id = $1 WHERE id = $2`,
                [parseSafeInt(adj.linkedAdjustmentId), parseSafeInt(adj.id)]
              );
            }
          }
        }

        // Synchronize sequences so Postgres automatic serialization works flawlessly
        await client.query("SELECT setval(pg_get_serial_sequence('wb_water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_water_balances");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_systems");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_regions");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_demands");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_supply_sources");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_operational_adjustments");

        await client.query("COMMIT");
        res.json({ success: true, message: "Dados salvos no PostgreSQL com sucesso!" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error && error.message === "A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING" });
      }
      console.error("Erro ao salvar dados:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

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
              INSERT INTO wb_water_balances (id, description, responsible, delivery_date, received_by, receipt_date, status)
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
            await client.query(`DELETE FROM wb_water_balances WHERE id NOT IN (${keepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, keepIds);
          } else {
            await client.query(`DELETE FROM wb_water_balances`);
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
              INSERT INTO wb_systems (id, code, name, water_balance_id)
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
              INSERT INTO wb_regions (id, code, name, system_id, description, water_balance_id)
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
            await client.query(`DELETE FROM wb_regions WHERE id NOT IN (${regKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, regKeepIds);
          } else {
            await client.query(`DELETE FROM wb_regions`);
          }
          
          if (sysKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_systems WHERE id NOT IN (${sysKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, sysKeepIds);
          } else {
            await client.query(`DELETE FROM wb_systems`);
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
              INSERT INTO wb_demands (id, name, description, modifiers_population, modifiers_coverage, modifiers_per_capita, modifiers_losses, water_balance_id)
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
            await client.query(`DELETE FROM wb_demand_entries WHERE demand_id IN (${scKeepIds.join(", ")})`);
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
                INSERT INTO wb_demand_entries (demand_id, region_id, year, population, coverage, per_capita_consumption, losses)
                VALUES ${chunkParts.join(", ")}
                ON CONFLICT DO NOTHING
              `, chunkValues);
            }
          }

          if (scKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_demands WHERE id NOT IN (${scKeepIds.join(", ")})`);
          } else {
            await client.query(`DELETE FROM wb_demands`);
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
              INSERT INTO wb_supply_sources (id, code, system_id, name, type, granted_flow, operational_flow, unavailable_flow, unavailability_reason, water_balance_id)
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
            await client.query(`DELETE FROM wb_supply_sources WHERE id NOT IN (${supKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, supKeepIds);
          } else {
            await client.query(`DELETE FROM wb_supply_sources`);
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
              INSERT INTO wb_operational_adjustments (id, system_id, type, description, start_year, end_year, flow_value, water_balance_id, linked_adjustment_id)
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
              UPDATE wb_operational_adjustments as o 
              SET linked_adjustment_id = v.linked_id 
              FROM (VALUES ${linkParts.join(", ")}) as v(id, linked_id) 
              WHERE o.id = v.id
            `, linkValues);
          }

          if (adjKeepIds.length > 0) {
            await client.query(`DELETE FROM wb_operational_adjustments WHERE id NOT IN (${adjKeepIds.map((_, idx) => '$' + (idx + 1) + '::integer').join(', ')})`, adjKeepIds);
          } else {
            await client.query(`DELETE FROM wb_operational_adjustments`);
          }
        }

        // Synchronize sequences so Postgres automatic serialization works flawlessly
        await client.query("SELECT setval(pg_get_serial_sequence('wb_water_balances', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_water_balances");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_systems', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_systems");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_regions', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_regions");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_demands', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_demands");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_supply_sources', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_supply_sources");
        await client.query("SELECT setval(pg_get_serial_sequence('wb_operational_adjustments', 'id'), COALESCE(max(id), 1), max(id) IS NOT NULL) FROM wb_operational_adjustments");

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

  // Diagnostic endpoint for plans
  app.get("/api/diagnostic/save-planos", async (req, res) => {
    try {
      console.log("[LOG] GET /api/diagnostic/save-planos diagnostics requested");
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const dbInfoRes = await client.query("SELECT version() as version, current_database() as database");
        const columnsRes = await client.query(`
          SELECT table_name, column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name IN ('pl_plans', 'pl_areas', 'pl_task_areas', 'pl_tasks')
          ORDER BY table_name, column_name;
        `);
        const fksRes = await client.query(`
          SELECT
              tc.table_name, 
              kcu.column_name, 
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name 
          FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
          AND tc.table_name IN ('pl_plans', 'pl_areas', 'pl_task_areas', 'pl_tasks');
        `);
        const plansCount = await client.query("SELECT COUNT(*) FROM pl_plans");
        const areasCount = await client.query("SELECT COUNT(*) FROM pl_areas");
        const taskAreasCount = await client.query("SELECT COUNT(*) FROM pl_task_areas");

        res.json({
          success: true,
          message: "Diagnostic analysis performed successfully for Plans module",
          dialect: "PostgreSQL (direct pool connections: pg)",
          database: dbInfoRes.rows[0],
          counts: {
            plans: parseInt(plansCount.rows[0].count, 10),
            areas: parseInt(areasCount.rows[0].count, 10),
            task_areas: parseInt(taskAreasCount.rows[0].count, 10)
          },
          schemaColumns: columnsRes.rows,
          foreignKeys: fksRes.rows
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("[DIAGNOSTIC ERROR]:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Bulk / individual plan saving handler
  app.post("/api/save-planos", async (req, res) => {
    try {
      console.log("[LOG] POST /api/save-planos received request:", req.body);
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ success: false, error: "O corpo da requisição é obrigatório." });
      }

      const { id, planId, name, title, description } = req.body;
      const targetId = id || planId;
      const planName = (name && typeof name === "string") ? name.trim() : (title && typeof title === "string") ? title.trim() : "Plano Sem Nome";
      const planTitle = (title && typeof title === "string") ? title.trim() : (name && typeof name === "string") ? name.trim() : "Plano Sem Nome";
      const planDesc = (description && typeof description === "string") ? description.trim() : "";

      const pool = getDbPool();

      if (targetId) {
        const parsedId = parseInt(targetId, 10);
        const result = await pool.query(
          "UPDATE pl_plans SET name = $1, title = $2, description = $3 WHERE id = $4 RETURNING *",
          [planName, planTitle, planDesc, parsedId]
        );
        if (result.rows.length === 0) {
          const insertRes = await pool.query(
            "INSERT INTO pl_plans (id, name, title, description) VALUES ($1, $2, $3, $4) RETURNING *",
            [parsedId, planName, planTitle, planDesc]
          );
          return res.json({
            success: true,
            data: {
              id: Number(insertRes.rows[0].id),
              name: insertRes.rows[0].name || insertRes.rows[0].title || "Plano Sem Nome",
              title: insertRes.rows[0].title || insertRes.rows[0].name || "Plano Sem Nome",
              description: insertRes.rows[0].description
            }
          });
        }
        return res.json({
          success: true,
          data: {
            id: Number(result.rows[0].id),
            name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome",
            title: result.rows[0].title || result.rows[0].name || "Plano Sem Nome",
            description: result.rows[0].description
          }
        });
      } else {
        const result = await pool.query(
          "INSERT INTO pl_plans (name, title, description) VALUES ($1, $2, $3) RETURNING *",
          [planName, planTitle, planDesc]
        );
        return res.json({
          success: true,
          data: {
            id: Number(result.rows[0].id),
            name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome",
            title: result.rows[0].title || result.rows[0].name || "Plano Sem Nome",
            description: result.rows[0].description
          }
        });
      }
    } catch (error: any) {
      console.error("[API ERROR] Erro crítico ao salvar plano via /api/save-planos:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for plans
  app.post("/api/plans", async (req, res) => {
    try {
      const { name, description } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO pl_plans (name, title, description) VALUES ($1, $1, $2) RETURNING *",
        [name || "Plano Sem Nome", description || ""]
      );
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome", description: result.rows[0].description } });
    } catch (error: any) {
      console.error("Erro ao criar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/plans/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const { name, description } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE pl_plans SET name = $1, title = $1, description = $2 WHERE id = $3 RETURNING *",
        [name || "Plano Sem Nome", description || "", planId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Plano não encontrado" });
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name || result.rows[0].title || "Plano Sem Nome", description: result.rows[0].description } });
    } catch (error: any) {
      console.error("Erro ao atualizar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/plans/:id", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_plans WHERE id = $1", [planId]);
      res.json({ success: true, deletedId: planId });
    } catch (error: any) {
      console.error("Erro ao deletar plano:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for areas
  app.post("/api/areas", async (req, res) => {
    try {
      const { name, abbreviation } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "INSERT INTO pl_areas (name, abbreviation) VALUES ($1, $2) RETURNING *",
        [name || "Área Sem Nome", abbreviation || ""]
      );
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, abbreviation: result.rows[0].abbreviation, planId: null } });
    } catch (error: any) {
      console.error("Erro ao criar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const { name, abbreviation } = req.body;
      const pool = getDbPool();
      const result = await pool.query(
        "UPDATE pl_areas SET name = $1, abbreviation = $2 WHERE id = $3 RETURNING *",
        [name, abbreviation || "", areaId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Área não encontrada" });
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, abbreviation: result.rows[0].abbreviation, planId: null } });
    } catch (error: any) {
      console.error("Erro ao atualizar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_areas WHERE id = $1", [areaId]);
      res.json({ success: true, deletedId: areaId });
    } catch (error: any) {
      console.error("Erro ao deletar área:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for responsibles
  app.post("/api/responsibles", async (req, res) => {
    try {
      const { name, email, role, areaIds } = req.body;
      const pool = getDbPool();
      let createdId;
      try {
        await pool.query("BEGIN");
        const result = await pool.query(
          "INSERT INTO pl_responsibles (name, email, role) VALUES ($1, $2, $3) RETURNING *",
          [name || "Responsável Sem Nome", email || "", role || ""]
        );
        createdId = result.rows[0].id;
        
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_responsible_areas (responsible_id, area_id) VALUES ($1, $2)", [createdId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ success: true, data: { id: Number(createdId), name: name, email: email, role: role, areaIds: areaIds || [] } });
    } catch (error: any) {
      console.error("Erro ao criar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/responsibles/:id", async (req, res) => {
    try {
      const respId = parseInt(req.params.id);
      const { name, email, role, areaIds } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "UPDATE pl_responsibles SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *",
          [name, email, role, respId]
        );
        if (result.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Responsável não encontrado" });
        }
        
        await pool.query("DELETE FROM pl_responsible_areas WHERE responsible_id = $1", [respId]);
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_responsible_areas (responsible_id, area_id) VALUES ($1, $2)", [respId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      res.json({ success: true, data: { id: Number(result.rows[0].id), name: result.rows[0].name, email: result.rows[0].email, role: result.rows[0].role, areaIds: areaIds || [] } });
    } catch (error: any) {
      console.error("Erro ao atualizar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/responsibles/:id", async (req, res) => {
    try {
      const respId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_responsibles WHERE id = $1", [respId]);
      res.json({ success: true, deletedId: respId });
    } catch (error: any) {
      console.error("Erro ao deletar responsável:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // REST endpoints for categories
  app.get("/api/categories", async (req, res) => {
    try {
      const pool = getDbPool();
      const result = await pool.query("SELECT id, name FROM pl_categories ORDER BY id ASC");
      const mapping = await pool.query("SELECT category_id, area_id FROM pl_category_areas");
      
      const areaMap: Record<number, number[]> = {};
      mapping.rows.forEach(r => {
        const catId = Number(r.category_id);
        if (!areaMap[catId]) areaMap[catId] = [];
        areaMap[catId].push(Number(r.area_id));
      });

      res.json({
        success: true,
        data: result.rows.map(c => ({
          id: Number(c.id),
          name: c.name,
          areaIds: areaMap[Number(c.id)] || []
        }))
      });
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, areaIds } = req.body;
      const pool = getDbPool();
      let createdId;
      try {
        await pool.query("BEGIN");
        const result = await pool.query(
          "INSERT INTO pl_categories (name) VALUES ($1) RETURNING *",
          [name || "Categoria Sem Nome"]
        );
        createdId = result.rows[0].id;
        
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id) VALUES ($1, $2)", [createdId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }

      res.json({
        success: true,
        data: {
          id: Number(createdId),
          name: name,
          areaIds: areaIds || []
        }
      });
    } catch (error: any) {
      console.error("Erro ao criar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const catId = parseInt(req.params.id);
      const { name, areaIds } = req.body;
      const pool = getDbPool();
      let result;
      try {
        await pool.query("BEGIN");
        result = await pool.query(
          "UPDATE pl_categories SET name = $1 WHERE id = $2 RETURNING *",
          [name, catId]
        );
        if (result.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Categoria não encontrada" });
        }
        
        await pool.query("DELETE FROM pl_category_areas WHERE category_id = $1", [catId]);
        if (Array.isArray(areaIds) && areaIds.length > 0) {
          for (const aId of areaIds) {
            await pool.query("INSERT INTO pl_category_areas (category_id, area_id) VALUES ($1, $2)", [catId, aId]);
          }
        }
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        throw err;
      }
      
      res.json({
        success: true,
        data: {
          id: Number(result.rows[0].id),
          name: result.rows[0].name,
          areaIds: areaIds || []
        }
      });
    } catch (error: any) {
      console.error("Erro ao atualizar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const catId = parseInt(req.params.id);
      const pool = getDbPool();
      await pool.query("DELETE FROM pl_categories WHERE id = $1", [catId]);
      res.json({ success: true, deletedId: catId });
    } catch (error: any) {
      console.error("Erro ao deletar categoria:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        const result = await client.query(`
          WITH RECURSIVE task_tree AS (
            SELECT id, title, description, start_date, end_date, status, parent_id, progress, priority, category, assigned_to, created_by, notes, plan_id, depends_on_task_id, 1 AS depth
            FROM pl_tasks
            WHERE parent_id IS NULL
            UNION ALL
            SELECT t.id, t.title, t.description, t.start_date, t.end_date, t.status, t.parent_id, t.progress, t.priority, t.category, t.assigned_to, t.created_by, t.notes, t.plan_id, t.depends_on_task_id, tt.depth + 1
            FROM pl_tasks t
            INNER JOIN task_tree tt ON t.parent_id = tt.id
          )
          SELECT * FROM task_tree ORDER BY depth, id;
        `);
        const dbPlans = await client.query("SELECT * FROM pl_plans ORDER BY id ASC");
        const dbAreas = await client.query("SELECT * FROM pl_areas ORDER BY id ASC");
        const dbResponsibles = await client.query("SELECT * FROM pl_responsibles ORDER BY id ASC");
        const dbTaskAreas = await client.query("SELECT * FROM pl_task_areas");
        const dbTaskResponsibles = await client.query("SELECT * FROM pl_task_responsibles");
        const dbTaskCategories = await client.query("SELECT * FROM pl_task_categories");
        const dbCategories = await client.query("SELECT * FROM pl_categories ORDER BY id ASC");
        const dbCategoryAreas = await client.query("SELECT * FROM pl_category_areas");
        const dbResponsibleAreas = await client.query("SELECT * FROM pl_responsible_areas");

        const categoryAreasMap: Record<number, number[]> = {};
        dbCategoryAreas.rows.forEach(r => {
          const cid = Number(r.category_id);
          const aid = Number(r.area_id);
          if (!categoryAreasMap[cid]) categoryAreasMap[cid] = [];
          categoryAreasMap[cid].push(aid);
        });

        const responsibleAreasMap: Record<number, number[]> = {};
        dbResponsibleAreas.rows.forEach(r => {
          const rid = Number(r.responsible_id);
          const aid = Number(r.area_id);
          if (!responsibleAreasMap[rid]) responsibleAreasMap[rid] = [];
          responsibleAreasMap[rid].push(aid);
        });

        const taskAreasMap: Record<number, number[]> = {};
        dbTaskAreas.rows.forEach(r => {
          const tid = Number(r.task_id);
          const aid = Number(r.area_id);
          if (!taskAreasMap[tid]) taskAreasMap[tid] = [];
          taskAreasMap[tid].push(aid);
        });

        const taskResponsiblesMap: Record<number, number[]> = {};
        dbTaskResponsibles.rows.forEach(r => {
          const tid = Number(r.task_id);
          const rid = Number(r.responsible_id);
          if (!taskResponsiblesMap[tid]) taskResponsiblesMap[tid] = [];
          taskResponsiblesMap[tid].push(rid);
        });

        const taskCategoriesMap: Record<number, number[]> = {};
        dbTaskCategories.rows.forEach(r => {
          const tid = Number(r.task_id);
          const cid = Number(r.category_id);
          if (!taskCategoriesMap[tid]) taskCategoriesMap[tid] = [];
          taskCategoriesMap[tid].push(cid);
        });
        
        const tasks = result.rows.map(t => ({
          id: Number(t.id),
          title: t.title,
          description: t.description,
          startDate: t.start_date,
          endDate: t.end_date,
          status: t.status,
          parentId: t.parent_id ? Number(t.parent_id) : null,
          progress: Number(t.progress) || 0,
          priority: t.priority,
          category: t.category,
          assignedTo: t.assigned_to,
          createdBy: t.created_by,
          notes: t.notes,
          planId: t.plan_id ? Number(t.plan_id) : null,
          dependsOnTaskId: t.depends_on_task_id ? Number(t.depends_on_task_id) : null,
          areaIds: taskAreasMap[Number(t.id)] || [],
          responsibleIds: taskResponsiblesMap[Number(t.id)] || [],
          categoryIds: taskCategoriesMap[Number(t.id)] || []
        }));
        
        res.json({ 
          success: true, 
          data: tasks,
          plans: dbPlans.rows.map(p => ({
            id: Number(p.id),
            name: p.name || p.title || "Plano Sem Nome",
            title: p.title || p.name || "Plano Sem Nome",
            description: p.description
          })),
          areas: dbAreas.rows.map(a => ({
            id: Number(a.id),
            name: a.name,
            abbreviation: a.abbreviation,
            planId: null
          })),
          responsibles: dbResponsibles.rows.map(r => ({
            id: Number(r.id),
            name: r.name,
            email: r.email,
            role: r.role,
            areaIds: responsibleAreasMap[Number(r.id)] || []
          })),
          categories: dbCategories.rows.map(c => ({
            id: Number(c.id),
            name: c.name,
            areaIds: categoryAreasMap[Number(c.id)] || []
          }))
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error && error.message === "A variável DATABASE_URL (Neon PostgreSQL) está ausente no ambiente.") {
        return res.status(200).json({ success: false, error: "DATABASE_URL_MISSING", data: [] });
      }
      console.error("Erro ao carregar tarefas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { title, description, startDate, endDate, status, parentId, progress, priority, category, assignedTo, notes, planId, areaIds, responsibleIds, categoryIds, dependsOnTaskId } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const finalProgress = progress !== undefined ? parseInt(progress) : 0;
        const finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";
        
        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
            const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId)]);
            if (parentAreasRes.rows.length > 0) {
               finalAreaIds = parentAreasRes.rows.map(r => r.area_id);
            }
            const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId)]);
            if (parentCatsRes.rows.length > 0) {
               finalCategoryIds = parentCatsRes.rows.map(r => r.category_id);
            }
        }
        
        const result = await client.query(
          `INSERT INTO pl_tasks (title, description, start_date, end_date, status, parent_id, progress, priority, category, assigned_to, notes, plan_id, depends_on_task_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            title || "Sem título",
            description || "",
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null,
            finalStatus,
            parentId ? parseInt(parentId) : null,
            finalProgress,
            priority || "Média",
            category || "PONTUAIS",
            "", // assigned_to will be updated below
            notes || "",
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null
          ]
        );
        
        const createdTask = result.rows[0];
        const createdTaskId = Number(createdTask.id);

        // Save task_areas
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, aid]);
          }
        }

        // Save task_responsibles
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, rid]);
          }
        }

        // Save task_categories
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [createdTaskId, cid]);
          }
        }

        // Format and update assignedTo string based on actual responsible names
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map(r => r.name).join(", ");
          }
          await client.query("UPDATE pl_tasks SET assigned_to = $1 WHERE id = $2", [finalAssignedTo, createdTaskId]);
        }
        
        if (createdTask.parent_id) {
          await rollUpTask(client, createdTask.parent_id);
        }
        
        await client.query("COMMIT");
        
        res.json({
          success: true,
          data: {
            id: Number(createdTask.id),
            title: createdTask.title,
            description: createdTask.description,
            startDate: createdTask.start_date,
            endDate: createdTask.end_date,
            status: createdTask.status,
            parentId: createdTask.parent_id ? Number(createdTask.parent_id) : null,
            progress: Number(createdTask.progress) || 0,
            priority: createdTask.priority,
            category: createdTask.category,
            assignedTo: finalAssignedTo,
            createdBy: createdTask.created_by,
            notes: createdTask.notes,
            planId: createdTask.plan_id ? Number(createdTask.plan_id) : null,
            areaIds: areaIds || [],
            responsibleIds: responsibleIds || [],
            categoryIds: categoryIds || []
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { title, description, startDate, endDate, status, progress, priority, category, assignedTo, notes, parentId, planId, areaIds, responsibleIds, categoryIds, dependsOnTaskId } = req.body;
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        const currentTaskRes = await client.query("SELECT parent_id, start_date, end_date, progress, status, depends_on_task_id FROM pl_tasks WHERE id = $1", [taskId]);
        if (currentTaskRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Tarefa não encontrada." });
        }
        const oldParentId = currentTaskRes.rows[0].parent_id;

        const childrenCheck = await client.query("SELECT COUNT(*) FROM pl_tasks WHERE parent_id = $1", [taskId]);
        const hasChildren = parseInt(childrenCheck.rows[0].count, 10) > 0;

        let finalStartDate = startDate ? new Date(startDate) : null;
        let finalEndDate = endDate ? new Date(endDate) : null;
        let finalProgress = progress !== undefined ? parseInt(progress) : 0;
        let finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";

        if (hasChildren) {
          finalStartDate = currentTaskRes.rows[0].start_date;
          finalEndDate = currentTaskRes.rows[0].end_date;
          finalProgress = currentTaskRes.rows[0].progress || 0;
          finalStatus = finalProgress === 100 ? "Concluída" : finalProgress > 0 ? "Em andamento" : "Não iniciada";
        }

        let finalAreaIds = areaIds || [];
        let finalCategoryIds = categoryIds || [];
        if (parentId) {
            const parentAreasRes = await client.query("SELECT area_id FROM pl_task_areas WHERE task_id = $1", [parseInt(parentId, 10)]);
            if (parentAreasRes.rows.length > 0) {
               finalAreaIds = parentAreasRes.rows.map(r => r.area_id);
            }
            const parentCatsRes = await client.query("SELECT category_id FROM pl_task_categories WHERE task_id = $1", [parseInt(parentId, 10)]);
            if (parentCatsRes.rows.length > 0) {
               finalCategoryIds = parentCatsRes.rows.map(r => r.category_id);
            }
        }

        const result = await client.query(
          `UPDATE pl_tasks 
           SET title = $1, description = $2, start_date = $3, end_date = $4, status = $5, progress = $6, priority = $7, category = $8, assigned_to = $9, notes = $10, parent_id = $11, plan_id = $12, depends_on_task_id = $13
           WHERE id = $14
           RETURNING *`,
          [
            title || "Sem título",
            description || "",
            finalStartDate,
            finalEndDate,
            finalStatus,
            finalProgress,
            priority || "Média",
            category || "PONTUAIS",
            "", // assigned_to will be updated below
            notes || "",
            parentId ? parseInt(parentId) : null,
            planId ? parseInt(planId) : null,
            dependsOnTaskId ? parseInt(dependsOnTaskId) : null,
            taskId
          ]
        );

        const updatedTask = result.rows[0];

        // Reset and save task_areas
        await client.query("DELETE FROM pl_task_areas WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalAreaIds) && finalAreaIds.length > 0) {
          for (const aid of finalAreaIds) {
            await client.query("INSERT INTO pl_task_areas (task_id, area_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, aid]);
          }
        }

        // Reset and save task_responsibles
        await client.query("DELETE FROM pl_task_responsibles WHERE task_id = $1", [taskId]);
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          for (const rid of responsibleIds) {
            await client.query("INSERT INTO pl_task_responsibles (task_id, responsible_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, rid]);
          }
        }

        // Reset and save task_categories
        await client.query("DELETE FROM pl_task_categories WHERE task_id = $1", [taskId]);
        if (Array.isArray(finalCategoryIds) && finalCategoryIds.length > 0) {
          for (const cid of finalCategoryIds) {
            await client.query("INSERT INTO pl_task_categories (task_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [taskId, cid]);
          }
        }

        // Format and update assignedTo string based on actual responsible names
        let finalAssignedTo = assignedTo || "";
        if (Array.isArray(responsibleIds) && responsibleIds.length > 0) {
          const respNamesRes = await client.query("SELECT name FROM pl_responsibles WHERE id = ANY($1::integer[])", [responsibleIds]);
          if (respNamesRes.rows.length > 0) {
            finalAssignedTo = respNamesRes.rows.map(r => r.name).join(", ");
          }
          await client.query("UPDATE pl_tasks SET assigned_to = $1 WHERE id = $2", [finalAssignedTo, taskId]);
        }

        // Trigger cascade to override children
        await cascadeAreasAndCategories(client, taskId, finalAreaIds, finalCategoryIds);

        if (updatedTask.parent_id) {
          await rollUpTask(client, updatedTask.parent_id);
        }
        if (oldParentId && oldParentId !== updatedTask.parent_id) {
          await rollUpTask(client, oldParentId);
        }

        await client.query("COMMIT");
        
        res.json({
          success: true,
          data: {
            id: Number(updatedTask.id),
            title: updatedTask.title,
            description: updatedTask.description,
            startDate: updatedTask.start_date,
            endDate: updatedTask.end_date,
            status: updatedTask.status,
            parentId: updatedTask.parent_id ? Number(updatedTask.parent_id) : null,
            progress: Number(updatedTask.progress) || 0,
            priority: updatedTask.priority,
            category: updatedTask.category,
            assignedTo: finalAssignedTo,
            createdBy: updatedTask.created_by,
            notes: updatedTask.notes,
            planId: updatedTask.plan_id ? Number(updatedTask.plan_id) : null,
            areaIds: areaIds || [],
            responsibleIds: responsibleIds || [],
            categoryIds: categoryIds || []
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao atualizar tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        const taskRes = await client.query("SELECT parent_id FROM pl_tasks WHERE id = $1", [taskId]);
        if (taskRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ success: false, error: "Tarefa não encontrada." });
        }
        const parentId = taskRes.rows[0].parent_id;

        await client.query("DELETE FROM pl_tasks WHERE id = $1", [taskId]);

        if (parentId) {
          await rollUpTask(client, parentId);
        }

        await client.query("COMMIT");
        res.json({ success: true, deletedId: taskId });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao demover tarefa:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/tasks", async (req, res) => {
    try {
      console.log("[LOG] DELETE /api/tasks: Deletando todas as tarefas...");
      const pool = getDbPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query("DELETE FROM pl_tasks");
        
        const markerPath = path.join(process.cwd(), "tasks_cleared_marker.txt");
        fs.writeFileSync(markerPath, "tasks_cleared_" + Date.now(), "utf8");
        
        await client.query("COMMIT");
        console.log(`[LOG] DELETE /api/tasks: Sucesso! Deletadas ${result.rowCount} tarefas.`);
        res.json({ success: true, message: "Todos os registros da tabela 'pl_tasks' foram excluídos com sucesso!", deletedCount: result.rowCount });
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error("Erro ao excluir todas as tarefas:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Global API error handler for things like PayloadTooLargeError from body-parser
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express API error:", err);
    res.status(err.status || 500).json({ success: false, error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
       if (req.path.startsWith('/api')) return res.status(404).end();
       res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
