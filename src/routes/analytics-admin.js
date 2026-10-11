import { Router } from "express";

export function createAnalyticsAdminRouter({ pool, audit, asDate, dateRange, normalizeRegion, regions, tokenRegions }) {
  const router = Router();

  router.get("/api/regions", async (req, res, next) => {
    try {
      const [start, end] = dateRange(req);
      const values = [start, end];
      let regionFilter = "";
      const selectedRegion = normalizeRegion(req.query.region);
      if (selectedRegion) { values.push(selectedRegion); regionFilter = ` AND s.region = $${values.length}`; }
      const { rows } = await pool.query(`SELECT s.region, COUNT(DISTINCT s.sale_key)::int fact,
        COALESCE(MAX(p.plan), 0)::int plan
        FROM sales s JOIN import_files i ON i.id = s.import_file_id AND i.source = 'msms-api'
        LEFT JOIN sales_plans p ON p.scope_type = 'region' AND p.scope_key = s.region
        AND p.period_start = date_trunc('month', $1::date)::date
        WHERE s.sale_date BETWEEN $1 AND $2${regionFilter} GROUP BY s.region ORDER BY fact DESC`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.get("/api/regions/daily", async (req, res, next) => {
    try {
      const date = req.query.date || dateRange(req)[1];
      const values = [date];
      let regionFilter = "";
      const selectedRegion = normalizeRegion(req.query.region);
      if (selectedRegion) { values.push(selectedRegion); regionFilter = ` AND s.region = $${values.length}`; }
      const { rows } = await pool.query(`SELECT s.region, COUNT(DISTINCT s.sale_key)::int fact,
        COALESCE(ROUND(MAX(p.plan)::numeric / EXTRACT(DAY FROM (date_trunc('month', $1::date) + interval '1 month - 1 day')))::int, 0) plan
        FROM sales s JOIN import_files i ON i.id = s.import_file_id AND i.source = 'msms-api'
        LEFT JOIN sales_plans p ON p.scope_type = 'region' AND p.scope_key = s.region
        AND p.period_start = date_trunc('month', $1::date)::date
        WHERE s.sale_date = $1${regionFilter} GROUP BY s.region ORDER BY fact DESC`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.get("/api/analytics/daily", async (req, res, next) => {
    try {
      const [start, end] = dateRange(req);
      const values = [start, end];
      let regionFilter = "";
      const selectedRegion = normalizeRegion(req.query.region);
      if (selectedRegion) { values.push(selectedRegion); regionFilter = ` AND region = $${values.length}`; }
      const { rows } = await pool.query(`SELECT TO_CHAR(s.sale_date, 'YYYY-MM-DD') date, COUNT(DISTINCT s.sale_key)::int fact
        FROM sales s JOIN import_files i ON i.id = s.import_file_id AND i.source = 'msms-api'
        WHERE s.sale_date BETWEEN $1 AND $2${regionFilter.replaceAll("region", "s.region")} GROUP BY s.sale_date ORDER BY s.sale_date`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.get("/api/analytics/tariffs", async (req, res, next) => {
    try {
      const [start, end] = dateRange(req);
      const values = [start, end];
      let regionFilter = "";
      const selectedRegion = normalizeRegion(req.query.region);
      if (selectedRegion) { values.push(selectedRegion); regionFilter = ` AND s.region = $${values.length}`; }
      const { rows } = await pool.query(`SELECT COALESCE(NULLIF(TRIM(s.tariff_name), ''), 'Nomaʼlum') tariff, COUNT(*)::int fact
        FROM sales s JOIN import_files i ON i.id = s.import_file_id AND i.source = 'msms-api'
        WHERE s.sale_date BETWEEN $1 AND $2${regionFilter}
        GROUP BY 1 ORDER BY fact DESC`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.get("/api/analytics/summary", async (req, res, next) => {
    try {
      const [start, end] = dateRange(req);
      const { rows } = await pool.query(`WITH filtered_sales AS (
        SELECT DISTINCT ON (s.sale_key) s.*
        FROM sales s JOIN import_files i ON i.id = s.import_file_id AND i.source = 'msms-api'
        WHERE s.sale_date BETWEEN ($1::date - interval '1 month')::date AND $2
        ORDER BY s.sale_key, s.id DESC
      )
      SELECT
        COUNT(DISTINCT sale_key) FILTER (WHERE sale_date = $2)::int today,
        COUNT(DISTINCT sale_key) FILTER (WHERE sale_date = ($2::date - 1))::int yesterday,
        COUNT(DISTINCT sale_key) FILTER (WHERE sale_date BETWEEN ($1::date - interval '1 month')::date AND ($2::date - interval '1 month')::date)::int "previousMonth"
        , (SELECT region FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 GROUP BY region ORDER BY COUNT(*) DESC, region LIMIT 1) "bestRegion"
        , (SELECT region FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 GROUP BY region ORDER BY COUNT(*) ASC, region LIMIT 1) "worstRegion"
        , (SELECT dealer_name FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 AND NULLIF(TRIM(dealer_name), '') IS NOT NULL GROUP BY dealer_name ORDER BY COUNT(*) DESC, dealer_name LIMIT 1) "bestDealer"
        , (SELECT dealer_name FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 AND NULLIF(TRIM(dealer_name), '') IS NOT NULL GROUP BY dealer_name ORDER BY COUNT(*) ASC, dealer_name LIMIT 1) "worstDealer"
        , (SELECT sales_point FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 AND NULLIF(TRIM(sales_point), '') IS NOT NULL GROUP BY sales_point ORDER BY COUNT(*) DESC, sales_point LIMIT 1) "bestDistrict"
        , (SELECT sales_point FROM filtered_sales WHERE sale_date BETWEEN $1 AND $2 AND NULLIF(TRIM(sales_point), '') IS NOT NULL GROUP BY sales_point ORDER BY COUNT(*) ASC, sales_point LIMIT 1) "worstDistrict"
        FROM filtered_sales WHERE sale_date BETWEEN ($1::date - interval '1 month')::date AND $2`, [start, end]);
      res.json(rows[0] || {});
    } catch (error) { next(error); }
  });

  router.get("/api/dealers", async (req, res, next) => { try { const [start, end] = dateRange(req); const values = [start, end]; let where = ""; const selectedRegion = normalizeRegion(req.query.regionKey || req.query.region); if (selectedRegion) { if (selectedRegion === "Farg'ona") where += " AND (d.region = 'Farg''ona' OR dr.region = 'Farg''ona')"; else { values.push(selectedRegion); where += ` AND (d.region = $${values.length} OR dr.region = $${values.length})`; } } if (req.query.district) { values.push(req.query.district); where += ` AND d.district = $${values.length}`; } if (req.query.category) { values.push(req.query.category); where += ` AND d.category = $${values.length}`; } const { rows } = await pool.query(`WITH dates AS (SELECT (date_trunc('month',$1::date) - interval '1 month')::date previous_month_start, (date_trunc('month',$1::date) - interval '1 day')::date previous_month_end), linked_sales AS (SELECT s.*, dl.dealer_id FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id), dealer_regions AS (SELECT dealer_id, MODE() WITHIN GROUP (ORDER BY region) region FROM linked_sales GROUP BY dealer_id), old_counts AS (SELECT dealer_id, COUNT(*)::int fact FROM linked_sales, dates WHERE sale_date BETWEEN dates.previous_month_start AND dates.previous_month_end GROUP BY dealer_id) SELECT d.id, d.name, COALESCE(dr.region,d.region) region, d.district, d.category, COUNT(ls.id)::int fact, COALESCE(p.plan,0)::int plan, COALESCE(old_counts.fact,0)::int previous_month_fact, d.percentage FROM dealers d LEFT JOIN dealer_regions dr ON dr.dealer_id=d.id LEFT JOIN linked_sales ls ON ls.dealer_id=d.id AND ls.sale_date BETWEEN $1 AND $2 LEFT JOIN old_counts ON old_counts.dealer_id=d.id LEFT JOIN sales_plans p ON p.scope_type='dealer' AND p.scope_key=d.id::text AND p.period_start=date_trunc('month',$1::date)::date WHERE TRUE ${where} GROUP BY d.id,p.plan,old_counts.fact,dr.region ORDER BY fact DESC`, values); res.json(rows); } catch (error) { next(error); } });
  router.get("/api/plans", async (req, res, next) => { try { const period = req.query.period || new Date().toISOString().slice(0, 7) + "-01"; const { rows } = await pool.query("SELECT id, scope_type, scope_key, period_start, plan, updated_at FROM sales_plans WHERE period_start=$1 ORDER BY scope_type, scope_key", [period]); res.json(rows); } catch (error) { next(error); } });
  router.put("/api/plans", async (req, res, next) => { try { const { scopeType, scopeKey, periodStart, plan } = req.body; const numericPlan = Number(plan); if (!["region", "district", "dealer"].includes(scopeType) || typeof scopeKey !== "string" || !scopeKey.trim() || !/^\d{4}-\d{2}-01$/.test(periodStart) || !Number.isInteger(numericPlan) || numericPlan < 0) return res.status(400).json({ error: "Plan ma'lumotlari noto'g'ri" }); const { rows } = await pool.query("INSERT INTO sales_plans(scope_type,scope_key,period_start,plan) VALUES($1,$2,$3,$4) ON CONFLICT(scope_type,scope_key,period_start) DO UPDATE SET plan=EXCLUDED.plan,updated_at=NOW() RETURNING id,scope_type,scope_key,period_start,plan,updated_at", [scopeType, scopeKey.trim(), periodStart, numericPlan]); res.json(rows[0]); } catch (error) { next(error); } });
  router.get("/api/dealers/:id", async (req, res, next) => { try { const { rows } = await pool.query(`WITH dates AS (SELECT CURRENT_DATE today, CURRENT_DATE - 1 yesterday, date_trunc('month',CURRENT_DATE)::date month_start, (date_trunc('month',CURRENT_DATE) - interval '1 month')::date previous_start, (date_trunc('month',CURRENT_DATE) - interval '1 day')::date previous_end) SELECT d.*, COALESCE((SELECT COUNT(*) FROM dealer_logins dl WHERE dl.dealer_id=d.id),0)::int login_count, COALESCE((SELECT json_agg(l.login ORDER BY l.login) FROM dealer_logins dl JOIN logins l ON l.id=dl.login_id WHERE dl.dealer_id=d.id),'[]'::json) logins, COALESCE((SELECT COUNT(*) FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id WHERE dl.dealer_id=d.id AND s.sale_date=dates.today),0)::int today_fact, COALESCE((SELECT COUNT(*) FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id WHERE dl.dealer_id=d.id AND s.sale_date=dates.yesterday),0)::int yesterday_fact, COALESCE((SELECT COUNT(*) FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id WHERE dl.dealer_id=d.id AND s.sale_date>=dates.month_start),0)::int month_fact, COALESCE((SELECT COUNT(*) FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id WHERE dl.dealer_id=d.id AND s.sale_date BETWEEN dates.previous_start AND dates.previous_end),0)::int previous_month_fact FROM dealers d CROSS JOIN dates WHERE d.id=$1`, [req.params.id]); if (!rows[0]) return res.status(404).json({ error: "Diler topilmadi" }); res.json(rows[0]); } catch (error) { next(error); } });
  router.post("/api/dealers", async (req, res, next) => { const { name, region, district, category = "2-DARAJA", percentage = 3, phone, simLimit = 0, login } = req.body; if (!String(name || "").trim() || !regions.includes(region) || !["TOP", "1-DARAJA", "2-DARAJA"].includes(category) || !Number.isInteger(Number(simLimit)) || Number(simLimit) < 0) return res.status(400).json({ error: "Diler ma'lumotlari noto'g'ri" }); const client = await pool.connect(); try { await client.query("BEGIN"); let loginId = null; if (login) loginId = (await client.query("INSERT INTO logins(login) VALUES($1) ON CONFLICT(login) DO UPDATE SET login=EXCLUDED.login RETURNING id", [String(login).trim()])).rows[0].id; const { rows } = await client.query("INSERT INTO dealers(name,region,district,category,percentage,phone,sim_limit,login_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,region,district,category,percentage,phone,sim_limit", [String(name).trim(), region, district?.trim() || null, category, Number(percentage), phone?.trim() || null, Number(simLimit), loginId]); if (loginId) await client.query("INSERT INTO dealer_logins(dealer_id,login_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [rows[0].id, loginId]); await audit(client, "dealer_created", "dealer", rows[0].id, req); await client.query("COMMIT"); res.status(201).json(rows[0]); } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); } });
  router.put("/api/dealers/:id", async (req, res, next) => { try { const { name, region, district, category, percentage, phone, simLimit } = req.body; const numericPercentage = Number(percentage); const dealerId = Number(req.params.id); if (!Number.isInteger(dealerId) || !String(name || "").trim() || !regions.includes(region) || (district !== null && district !== undefined && typeof district !== "string") || !["TOP", "1-DARAJA", "2-DARAJA"].includes(category) || !Number.isFinite(numericPercentage) || numericPercentage < 0 || numericPercentage > 100) return res.status(400).json({ error: "Diler ma'lumotlari noto'g'ri" }); const { rows } = await pool.query("UPDATE dealers SET name=$1, region=$2, district=$3, category=$4, percentage=$5, phone=COALESCE($6,phone), sim_limit=COALESCE($7,sim_limit) WHERE id=$8 RETURNING id, name, region, district, category, percentage, phone, sim_limit", [String(name).trim(), region, district?.trim() || null, category, numericPercentage, phone?.trim() || null, simLimit == null ? null : Number(simLimit), dealerId]); if (!rows[0]) return res.status(404).json({ error: "Diler topilmadi" }); await pool.query("INSERT INTO audit_logs(action,entity_type,entity_id,actor,details) VALUES($1,$2,$3,$4,$5)", ["dealer_updated", "dealer", String(dealerId), req.ip, req.body]); res.json(rows[0]); } catch (error) { next(error); } });
  router.delete("/api/dealers/:id", async (req, res, next) => { try { const result = await pool.query("DELETE FROM dealers WHERE id=$1 RETURNING id", [Number(req.params.id)]); if (!result.rowCount) return res.status(404).json({ error: "Diler topilmadi" }); await pool.query("INSERT INTO audit_logs(action,entity_type,entity_id,actor) VALUES($1,$2,$3,$4)", ["dealer_deleted", "dealer", req.params.id, req.ip]); res.status(204).end(); } catch (error) { next(error); } });
  router.get("/api/audit-logs", async (req, res, next) => { try { const limit = Math.min(Number(req.query.limit) || 100, 1000); const { rows } = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1", [limit]); res.json(rows); } catch (error) { next(error); } });
  router.get("/api/telegram-verifications", async (req, res, next) => { try { const { rows } = await pool.query("SELECT v.*,s.icc FROM telegram_verifications v JOIN simcards s ON s.id=v.simcard_id ORDER BY v.created_at DESC LIMIT $1", [Math.min(Number(req.query.limit) || 100, 1000)]); res.json(rows); } catch (error) { next(error); } });
  router.post("/api/telegram-verifications", async (req, res, next) => { try { const simcardId = Number(req.body.simcardId); const code = String(req.body.code || Math.floor(100000 + Math.random() * 900000)); if (!Number.isInteger(simcardId) || !/^\d{4,8}$/.test(code)) return res.status(400).json({ error: "Tasdiqlash ma'lumotlari noto'g'ri" }); const { rows } = await pool.query("INSERT INTO telegram_verifications(simcard_id,code,sent_to) VALUES($1,$2,$3) RETURNING id,simcard_id,sent_to,verified,created_at", [simcardId, code, req.body.sentTo || req.body.phone]); res.status(201).json({ ...rows[0], code }); } catch (error) { next(error); } });
  router.post("/api/telegram-verifications/:id/verify", async (req, res, next) => { try { const { rows } = await pool.query("UPDATE telegram_verifications SET verified=true,verified_at=NOW() WHERE id=$1 AND code=$2 AND NOT verified RETURNING *", [Number(req.params.id), String(req.body.code || "")]); if (!rows[0]) return res.status(400).json({ error: "Kod noto'g'ri yoki allaqachon tasdiqlangan" }); await pool.query("INSERT INTO audit_logs(action,entity_type,entity_id,actor) VALUES($1,$2,$3,$4)", ["telegram_verified", "telegram_verification", req.params.id, req.ip]); res.json(rows[0]); } catch (error) { next(error); } });
  router.get("/api/calculations", async (req, res, next) => { try { const [start, end] = dateRange(req); const values = [start, end]; let filters = ""; for (const [field, column] of [["region", "s.region"], ["dealer", "d.name"], ["login", "s.login"], ["tariff", "s.tariff_name"]]) if (req.query[field]) { values.push(req.query[field]); filters += ` AND ${column} = $${values.length}`; } const { rows } = await pool.query(`SELECT s.region, d.name dealer, s.login, s.phone, s.tariff_name, s.connected_at, COUNT(*)::int fact, COALESCE(p.plan,0)::int plan, COALESCE(d.percentage,3)::numeric percentage, COUNT(*) * COALESCE(d.percentage,3) amount FROM sales s JOIN logins l ON LOWER(l.login)=LOWER(s.login) JOIN dealer_logins dl ON dl.login_id=l.id JOIN dealers d ON d.id=dl.dealer_id LEFT JOIN sales_plans p ON p.scope_type='dealer' AND p.scope_key=d.id::text AND p.period_start=date_trunc('month',$1::date)::date WHERE s.sale_date BETWEEN $1 AND $2${filters} GROUP BY s.region,d.name,s.login,s.phone,s.tariff_name,s.connected_at,d.percentage,p.plan ORDER BY s.region,d.name`, values); res.json(rows); } catch (error) { next(error); } });
  router.get("/api/tokens", async (_req, res, next) => { try { const { rows } = await pool.query("SELECT region, (expires_at IS NULL OR expires_at > NOW()) active, expires_at, updated_at FROM api_tokens ORDER BY region"); res.json(tokenRegions.map(region => rows.find(row => row.region === region) || { region, active: false })); } catch (error) { next(error); } });
  router.put("/api/tokens/:region", async (req, res, next) => { try { const expiresAt = req.body.expiresAt ? asDate(req.body.expiresAt) : null; if (!tokenRegions.includes(req.params.region) || typeof req.body.token !== "string" || !req.body.token.trim() || (expiresAt && Number.isNaN(expiresAt.getTime()))) return res.status(400).json({ error: "Viloyat, token yoki tugash sanasi noto'g'ri" }); const { rows } = await pool.query("INSERT INTO api_tokens(region,token,expires_at) VALUES($1,$2,$3) ON CONFLICT(region) DO UPDATE SET token=EXCLUDED.token, expires_at=EXCLUDED.expires_at, updated_at=NOW() RETURNING region, expires_at, updated_at, (expires_at IS NULL OR expires_at > NOW()) active", [req.params.region, req.body.token.trim(), expiresAt]); res.status(201).json(rows[0]); } catch (error) { next(error); } });

  return router;
}
