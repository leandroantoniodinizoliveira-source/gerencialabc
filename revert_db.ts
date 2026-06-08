import { Pool } from "pg";

async function run() {
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const client = await dbPool.connect();
  
  try {
    await client.query("BEGIN");

    const prefixesToDrop = [
      'pl_task_areas', 'pl_task_responsibles', 'pl_task_categories',
      'pl_tasks', 'pl_category_areas', 'pl_categories', 'pl_responsible_areas', 'pl_responsibles', 'pl_areas', 'pl_plans',
      'wb_demand_entries', 'wb_demands', 'wb_operational_adjustments', 'wb_regions',
      'wb_risk_references', 'wb_supply_sources', 'wb_systems', 'wb_template_files',
      'wb_water_balance_maps', 'wb_water_balances'
    ];
    for (const t of prefixesToDrop) {
      await client.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
    }

    const renames = [
      { new: 'pl_areas', old: 'areas' },
      { new: 'wb_demand_entries', old: 'demand_entries' },
      { new: 'wb_demands', old: 'demands' },
      { new: 'wb_operational_adjustments', old: 'operational_adjustments' },
      { new: 'pl_plans', old: 'plans' },
      { new: 'wb_regions', old: 'regions' },
      { new: 'pl_responsibles', old: 'responsibles' },
      { new: 'wb_risk_references', old: 'risk_references' },
      { new: 'wb_supply_sources', old: 'supply_sources' },
      { new: 'wb_systems', old: 'systems' },
      { new: 'pl_task_areas', old: 'task_areas' },
      { new: 'pl_task_responsibles', old: 'task_responsibles' },
      { new: 'pl_tasks', old: 'tasks' },
      { new: 'wb_template_files', old: 'template_files' },
      { new: 'wb_water_balance_maps', old: 'water_balance_maps' },
      { new: 'wb_water_balances', old: 'water_balances' },
      
      { new: 'pl_tasks_id_seq', old: 'tasks_id_seq' },
      { new: 'pl_areas_id_seq', old: 'areas_id_seq' },
      { new: 'pl_plans_id_seq', old: 'plans_id_seq' },
      { new: 'pl_responsibles_id_seq', old: 'responsibles_id_seq' },
      { new: 'wb_water_balances_id_seq', old: 'water_balances_id_seq' }
    ];

    for (const r of renames) {
      const checkRes = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [r.old]);
      
      if (checkRes.rows[0].exists) {
        await client.query(`ALTER TABLE ${r.old} RENAME TO ${r.new};`);
        console.log(`Renamed table ${r.old} to ${r.new}`);
      } else {
        // Assume it might be a sequence
        const seqCheckRes = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.sequences 
            WHERE sequence_name = $1
          );
        `, [r.old]);
        if(seqCheckRes.rows[0].exists) {
          try {
            await client.query(`ALTER SEQUENCE ${r.old} RENAME TO ${r.new};`);
            console.log(`Renamed sequence ${r.old} to ${r.new}`);
          } catch(e) {}
        }
      }
    }

    await client.query("COMMIT");
    console.log("Migration (revert) applied successfully.");
  } catch(e) {
    await client.query("ROLLBACK");
    console.error("Error applying migration:", e);
  } finally {
    client.release();
  }
}
run();
