import { Router } from "express";

export function createSimcardsRouter({ pool, upload, audit, iccRange, validIcc, sendSimVerificationCode }) {
  const router = Router();

  router.get("/api/simcard-dealers", async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`
        SELECT d.id, d.name, d.full_name, d.phone, d.sim_logins AS logins, d.telegram_chat_id, d.sim_limit,
          COALESCE(COUNT(s.id) FILTER (WHERE s.status = 'dealer'), 0)::int AS sim_count,
          GREATEST(d.sim_limit - COALESCE(COUNT(s.id) FILTER (WHERE s.status = 'dealer'), 0), 0)::int AS remaining
        FROM dealers d LEFT JOIN simcards s ON s.dealer_id = d.id GROUP BY d.id ORDER BY d.name
      `);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.post("/api/simcard-dealers", async (req, res, next) => {
    const name = String(req.body.name || "").trim();
    const simLimit = Number(req.body.limit ?? req.body.simLimit);
    if (!name || !Number.isInteger(simLimit) || simLimit < 0) return res.status(400).json({ error: "Diler nomi yoki SIM limiti noto'g'ri" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dealer = await client.query(
        "INSERT INTO dealers(name,region,full_name,phone,sim_logins,telegram_chat_id,sim_limit) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,region,full_name,phone,sim_logins AS logins,telegram_chat_id,sim_limit",
        [name, req.body.region || process.env.DEALER_REGION || "Farg'ona", String(req.body.fullName || "").trim() || null, String(req.body.phone || "").trim() || null, String(req.body.logins || "").trim() || null, String(req.body.telegramChatId || "").trim() || null, simLimit],
      );
      await audit(client, "sim_dealer_created", "dealer", dealer.rows[0].id, req, { fullName: req.body.fullName || null, logins: req.body.logins || null });
      await client.query("COMMIT");
      res.status(201).json(dealer.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
  });

  router.patch("/api/simcard-dealers/:id/telegram", async (req, res, next) => {
    const chatId = String(req.body.telegramChatId || "").trim() || null;
    try {
      const { rows } = await pool.query("UPDATE dealers SET telegram_chat_id=$1 WHERE id=$2 RETURNING id,name,telegram_chat_id", [chatId, Number(req.params.id)]);
      if (!rows[0]) return res.status(404).json({ error: "Diler topilmadi" });
      await pool.query("INSERT INTO audit_logs(action,entity_type,entity_id,actor,details) VALUES($1,$2,$3,$4,$5)", ["sim_dealer_telegram_updated", "dealer", req.params.id, "system", { configured: Boolean(chatId) }]);
      res.json(rows[0]);
    } catch (error) { next(error); }
  });

  const dashboard = async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`WITH totals AS (
        SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='franchise')::int franchise,
          COUNT(*) FILTER (WHERE status='dealer')::int dealer, COUNT(*) FILTER (WHERE status='sold')::int sold FROM simcards
        ), region_counts AS (
          SELECT region, COUNT(*)::int total, COUNT(*) FILTER (WHERE status='dealer')::int dealer,
            COUNT(*) FILTER (WHERE status='sold')::int sold FROM simcards GROUP BY region
        ) SELECT totals.*, COALESCE((SELECT json_agg(region_counts ORDER BY region) FROM region_counts),'[]') regions FROM totals`);
      const dealers = await pool.query(`SELECT d.id,d.name,d.region,d.sim_limit,
        COUNT(s.id)::int issued, COUNT(s.id) FILTER (WHERE s.status='sold')::int sold,
        (d.sim_limit-COUNT(s.id))::int remaining
        FROM dealers d LEFT JOIN simcards s ON s.dealer_id=d.id GROUP BY d.id ORDER BY d.name`);
      res.json({ ...rows[0], warehouse: rows[0].franchise, dealers: dealers.rows });
    } catch (error) { next(error); }
  };
  router.get("/api/simcards/dashboard", dashboard);
  router.get("/api/simcards/summary", dashboard);
  router.get("/api/simcards/audit", async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const { rows } = await pool.query("SELECT id,action,entity_type,entity_id,actor,details,created_at FROM audit_logs WHERE entity_type IN ('simcard','sim_issue','sim_receipt','dealer') ORDER BY created_at DESC LIMIT $1", [limit]);
      res.json(rows);
    } catch (error) { next(error); }
  });
  router.get("/api/simcards/:id/history", async (req, res, next) => {
    try {
      const { rows } = await pool.query("SELECT * FROM sim_status_history WHERE simcard_id=$1 ORDER BY created_at DESC", [Number(req.params.id)]);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.post("/api/simcards/receipts", async (req, res, next) => {
    const range = iccRange(req.body);
    if (!range || range.count > 1000000n) return res.status(400).json({ error: "ICC oralig'i noto'g'ri (ko'pi bilan 1 000 000 ta)" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("INSERT INTO sim_receipts(icc_start,icc_end,received_at,operator_name,note) VALUES($1,$2,$3,$4,$5) RETURNING *", [range.start, range.end, req.body.date || new Date(), req.body.operatorName || req.body.operator, req.body.note || null]);
      const inserted = await client.query(`INSERT INTO simcards(icc,region,received_at,operator_name,note)
        SELECT lpad(n::text,18,'0'),$3,$4,$5,$6 FROM generate_series($1::numeric,$2::numeric) n ON CONFLICT (icc) DO NOTHING`,
        [range.start, range.end, req.body.region || null, req.body.date || new Date(), req.body.operatorName || req.body.operator, req.body.note || null]);
      await audit(client, "sim_receipt_created", "sim_receipt", result.rows[0].id, req, { requested: range.count.toString(), inserted: inserted.rowCount });
      await client.query("COMMIT");
      res.status(201).json({ receipt: result.rows[0], inserted: inserted.rowCount, duplicates: Number(range.count) - inserted.rowCount });
    } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
  });

  router.post("/api/simcards/issues/send-code", async (req, res, next) => {
    const range = iccRange(req.body);
    const dealerId = Number(req.body.dealerId);
    if (!range || range.count > 1000000n || !Number.isInteger(dealerId)) return res.status(400).json({ error: "Diler yoki ICC oralig'i noto'g'ri" });
    try {
      const dealer = await pool.query("SELECT id,name,telegram_chat_id FROM dealers WHERE id=$1", [dealerId]);
      if (!dealer.rows[0]) return res.status(404).json({ error: "Diler topilmadi" });
      if (!dealer.rows[0].telegram_chat_id) return res.status(409).json({ error: "Diler uchun Telegram chat ID kiritilmagan" });
      const missing = await pool.query(`SELECT COUNT(*)::int count FROM generate_series($1::numeric,$2::numeric) n
        LEFT JOIN simcards s ON s.icc=lpad(n::text,18,'0') WHERE s.id IS NULL OR s.status <> 'franchise'`, [range.start, range.end]);
      if (missing.rows[0].count) return res.status(409).json({ error: "ICC omborda mavjud emas", unavailable: missing.rows[0].count });
      const held = await pool.query("SELECT COUNT(*)::int count FROM simcards WHERE dealer_id=$1 AND status='dealer'", [dealerId]);
      const limit = await pool.query("SELECT sim_limit FROM dealers WHERE id=$1", [dealerId]);
      const available = Math.max(0, Number(limit.rows[0].sim_limit) - held.rows[0].count);
      if (Number(range.count) > available) return res.status(409).json({ error: "Diler limiti yetarli emas", canIssue: available });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await sendSimVerificationCode(dealer.rows[0].telegram_chat_id, code, dealer.rows[0].name, Number(range.count));
      await audit(pool, "sim_verification_code_sent", "dealer", dealerId, req, { count: Number(range.count) });
      res.json({ sent: true, message: "Telegram kod yuborildi" });
    } catch (error) { next(error); }
  });

  router.post("/api/simcards/issues", async (req, res, next) => {
    const range = iccRange(req.body);
    const dealerId = Number(req.body.dealerId);
    if (!range || range.count > 1000000n || !Number.isInteger(dealerId)) return res.status(400).json({ error: "Diler yoki ICC oralig'i noto'g'ri" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dealer = await client.query("SELECT id,name,sim_limit FROM dealers WHERE id=$1 FOR UPDATE", [dealerId]);
      if (!dealer.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Diler topilmadi" }); }
      const requested = Number(range.count);
      const held = await client.query("SELECT COUNT(*)::int count FROM simcards WHERE dealer_id=$1 AND status='dealer'", [dealerId]);
      const available = Math.max(0, Number(dealer.rows[0].sim_limit) - held.rows[0].count);
      if (requested > available) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Diler limiti yetarli emas", limit: dealer.rows[0].sim_limit, dealerHas: held.rows[0].count, canIssue: available, requested }); }
      const missing = await client.query(`SELECT COUNT(*)::int count FROM generate_series($1::numeric,$2::numeric) n
        LEFT JOIN simcards s ON s.icc=lpad(n::text,18,'0') WHERE s.id IS NULL OR s.status <> 'franchise'`, [range.start, range.end]);
      if (missing.rows[0].count) { await client.query("ROLLBACK"); return res.status(409).json({ error: "ICC omborda mavjud emas", unavailable: missing.rows[0].count }); }
      const changed = await client.query(`UPDATE simcards SET status='dealer',dealer_id=$1,issued_at=$2,operator_name=$3
        WHERE icc BETWEEN lpad($4::text,18,'0') AND lpad($5::text,18,'0') AND status='franchise' RETURNING id`, [dealerId, req.body.date || new Date(), req.body.operatorName || req.body.operator, range.start, range.end]);
      const issue = await client.query("INSERT INTO sim_issues(dealer_id,icc_start,icc_end,issued_at,operator_name,note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [dealerId, range.start, range.end, req.body.date || new Date(), req.body.operatorName || req.body.operator, req.body.note || null]);
      await client.query("INSERT INTO sim_status_history(simcard_id,old_status,new_status,actor,note) SELECT id,'franchise','dealer',$1,$2 FROM simcards WHERE dealer_id=$3 AND status='dealer' AND issued_at=$4 AND icc BETWEEN $5 AND $6", ["system", req.body.note || null, dealerId, req.body.date || new Date(), range.start, range.end]);
      const verificationCode = String(req.body.code || Math.floor(100000 + Math.random() * 900000));
      if (!/^\d{4,8}$/.test(verificationCode)) { await client.query("ROLLBACK"); return res.status(400).json({ error: "Telegram tasdiqlash kodi noto'g'ri" }); }
      const verification = await client.query("INSERT INTO telegram_verifications(simcard_id,code,sent_to) SELECT id,$1,$2 FROM simcards WHERE dealer_id=$3 AND issued_at=$4 AND status='dealer' AND icc BETWEEN $5 AND $6 RETURNING id", [verificationCode, req.body.sentTo || req.body.phone || null, dealerId, req.body.date || new Date(), range.start, range.end]);
      if (verification.rows[0]) await client.query("UPDATE sim_issues SET verification_id=$1 WHERE id=$2", [verification.rows[0].id, issue.rows[0].id]);
      const dealerContact = await client.query("SELECT telegram_chat_id FROM dealers WHERE id=$1", [dealerId]);
      if (req.body.sendTelegram !== false && dealerContact.rows[0]?.telegram_chat_id) await sendSimVerificationCode(dealerContact.rows[0].telegram_chat_id, verificationCode, dealer.rows[0].name, requested);
      await audit(client, "sim_issue_created", "sim_issue", issue.rows[0].id, req, { dealerId, count: changed.rowCount });
      await client.query("COMMIT");
      res.status(201).json({ issue: issue.rows[0], issued: changed.rowCount });
    } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
  });

  router.post("/api/simcards/verify", async (req, res, next) => {
    const simcardId = Number(req.body.simcardId);
    const code = String(req.body.code || "");
    if (!Number.isInteger(simcardId) || !/^\d{4,8}$/.test(code)) return res.status(400).json({ error: "SIM yoki tasdiqlash kodi noto'g'ri" });
    try {
      const result = await pool.query("UPDATE telegram_verifications SET verified=true,verified_at=NOW() WHERE simcard_id=$1 AND code=$2 AND verified=false AND expires_at>NOW() AND attempts<3 RETURNING id", [simcardId, code]);
      if (!result.rows[0]) {
        await pool.query("UPDATE telegram_verifications SET attempts=attempts+1 WHERE simcard_id=$1 AND verified=false", [simcardId]);
        return res.status(409).json({ error: "Kod noto'g'ri, muddati tugagan yoki urinishlar limiti oshgan" });
      }
      res.json({ verified: true, verificationId: result.rows[0].id });
    } catch (error) { next(error); }
  });

  router.get("/api/simcards", async (req, res, next) => {
    try {
      const values = []; const filters = [];
      if (req.query.icc) { values.push(`%${String(req.query.icc).replace(/[%_]/g, "\\$&")}%`); filters.push(`s.icc LIKE $${values.length} ESCAPE '\\'`); }
      if (req.query.status) { values.push(req.query.status); filters.push(`s.status=$${values.length}`); }
      if (req.query.region) { values.push(req.query.region); filters.push(`s.region=$${values.length}`); }
      if (req.query.dealerId) { values.push(Number(req.query.dealerId)); filters.push(`s.dealer_id=$${values.length}`); }
      if (req.query.start) { values.push(req.query.start); filters.push(`s.received_at >= $${values.length}`); }
      if (req.query.end) { values.push(req.query.end); filters.push(`s.received_at <= $${values.length}`); }
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000); const offset = Math.max(Number(req.query.offset) || 0, 0);
      values.push(limit, offset);
      const { rows } = await pool.query(`SELECT s.*,d.name dealer_name FROM simcards s LEFT JOIN dealers d ON d.id=s.dealer_id
        ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY s.id DESC LIMIT $${values.length-1} OFFSET $${values.length}`, values);
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.patch("/api/simcards/:id/status", async (req, res, next) => {
    const status = String(req.body.status || "").toLowerCase();
    if (!["franchise", "dealer", "sold"].includes(status)) return res.status(400).json({ error: "SIM statusi noto'g'ri" });
    try {
      const id = Number(req.params.id);
      const before = await pool.query("SELECT status FROM simcards WHERE id=$1", [id]);
      const { rows } = await pool.query(`UPDATE simcards SET status=$1,sold_at=CASE WHEN $1='sold' THEN COALESCE($2::date,CURRENT_DATE) ELSE sold_at END WHERE id=$3 RETURNING *`, [status, req.body.date || null, id]);
      if (!rows[0]) return res.status(404).json({ error: "SIM topilmadi" });
      await pool.query("INSERT INTO audit_logs(action,entity_type,entity_id,actor,details) VALUES($1,$2,$3,$4,$5)", ["sim_status_changed", "simcard", req.params.id, req.ip, { status }]);
      await pool.query("INSERT INTO sim_status_history(simcard_id,old_status,new_status,actor,note) VALUES($1,$2,$3,$4,$5)", [id, before.rows[0]?.status || null, status, "system", req.body.note || null]);
      res.json(rows[0]);
    } catch (error) { next(error); }
  });

  router.get("/api/simcards/export", async (req, res, next) => {
    try {
      req.query.limit = "1000000"; req.query.offset = "0";
      const values = []; const filters = [];
      for (const [key, col] of [["icc","s.icc"],["status","s.status"],["region","s.region"],["dealerId","s.dealer_id"]]) if (req.query[key]) { values.push(key === "dealerId" ? Number(req.query[key]) : key === "icc" ? `%${String(req.query[key]).replace(/[%_]/g, "\\$&")}%` : req.query[key]); filters.push(key === "icc" ? `${col} LIKE $${values.length} ESCAPE '\\'` : `${col}=$${values.length}`); }
      if (req.query.start) { values.push(req.query.start); filters.push(`s.received_at >= $${values.length}`); }
      if (req.query.end) { values.push(req.query.end); filters.push(`s.received_at <= $${values.length}`); }
      const { rows } = await pool.query(`SELECT s.icc,s.region,s.status,d.name dealer_name,s.received_at,s.issued_at,s.sold_at FROM simcards s LEFT JOIN dealers d ON d.id=s.dealer_id ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY s.id`, values);
      const ExcelJS = (await import("exceljs")).default; const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("SIM");
      sheet.addRow(["ICC","Viloyat","Status","Diler","Kirim sanasi","Berilgan sana","Sotilgan sana"]); rows.forEach(row => sheet.addRow(Object.values(row)));
      res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition","attachment; filename=simcards.xlsx"); await workbook.xlsx.write(res); res.end();
    } catch (error) { next(error); }
  });

  return router;
}
