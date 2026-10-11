import { Router } from "express";

const normalizeChatIds = value => {
  const values = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
  return [...new Set(values.map(item => String(item).trim()).filter(Boolean))];
};

const validChatId = value => /^-?\d+$/.test(value);

export function createTelegramRouter({ config, pool, getReportImage, sendReport, regions, localToday }) {
  const router = Router();

  router.get("/api/telegram/plans", async (_req, res, next) => {
    try {
      const date = localToday();
      const { rows } = await pool.query(`SELECT r.region, p.plan
        FROM unnest($1::text[]) WITH ORDINALITY AS r(region, ord)
        LEFT JOIN telegram_daily_plans p ON p.region=r.region AND p.plan_date=$2::date
        ORDER BY r.ord`, [regions, date]);
      res.json({ date, plans: rows });
    } catch (error) { next(error); }
  });

  router.put("/api/telegram/plans", async (req, res, next) => {
    const region = req.body?.region;
    const plan = req.body?.plan === null ? null : Number(req.body?.plan);
    if (!regions.includes(region)) return res.status(400).json({ error: "Viloyat noto'g'ri" });
    if (plan !== null && (!Number.isSafeInteger(plan) || plan < 0 || plan > 2147483647)) {
      return res.status(400).json({ error: "Kunlik plan 0 yoki undan katta butun son bo'lishi kerak" });
    }
    try {
      const date = localToday();
      if (plan === null) {
        await pool.query("DELETE FROM telegram_daily_plans WHERE plan_date=$1::date AND region=$2", [date, region]);
        return res.json({ date, region, plan: null });
      }
      const { rows } = await pool.query(`INSERT INTO telegram_daily_plans(plan_date,region,plan)
        VALUES($1::date,$2,$3)
        ON CONFLICT(plan_date,region) DO UPDATE SET plan=EXCLUDED.plan,updated_at=NOW()
        RETURNING plan_date AS date, region, plan`, [date, region, plan]);
      res.json(rows[0]);
    } catch (error) { next(error); }
  });

  router.get("/api/telegram/recipients", async (_req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT id, chat_id AS "chatId" FROM telegram_recipients ORDER BY id');
      res.json(rows);
    } catch (error) { next(error); }
  });

  router.post("/api/telegram/recipients", async (req, res, next) => {
    const chatId = String(req.body?.chatId || "").trim();
    if (!validChatId(chatId)) return res.status(400).json({ error: "Telegram ID faqat raqamlardan iborat bo'lishi kerak" });
    try {
      const { rows } = await pool.query("INSERT INTO telegram_recipients(chat_id) VALUES($1) ON CONFLICT(chat_id) DO NOTHING RETURNING id, chat_id AS \"chatId\"", [chatId]);
      if (!rows[0]) return res.status(409).json({ error: "Bu Telegram ID allaqachon saqlangan" });
      res.status(201).json(rows[0]);
    } catch (error) { next(error); }
  });

  router.patch("/api/telegram/recipients/:id", async (req, res, next) => {
    const chatId = String(req.body?.chatId || "").trim();
    if (!validChatId(chatId)) return res.status(400).json({ error: "Telegram ID faqat raqamlardan iborat bo'lishi kerak" });
    try {
      const { rows } = await pool.query("UPDATE telegram_recipients SET chat_id=$1, updated_at=NOW() WHERE id=$2 RETURNING id, chat_id AS \"chatId\"", [chatId, Number(req.params.id)]);
      if (!rows[0]) return res.status(404).json({ error: "Telegram ID topilmadi" });
      res.json(rows[0]);
    } catch (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Bu Telegram ID allaqachon saqlangan" });
      next(error);
    }
  });

  router.delete("/api/telegram/recipients/:id", async (req, res, next) => {
    try {
      const result = await pool.query("DELETE FROM telegram_recipients WHERE id=$1", [Number(req.params.id)]);
      if (!result.rowCount) return res.status(404).json({ error: "Telegram ID topilmadi" });
      res.status(204).end();
    } catch (error) { next(error); }
  });

  router.get("/api/telegram/config", async (_req, res, next) => {
    try {
      const { rows } = await pool.query("SELECT chat_id AS \"chatId\" FROM telegram_recipients ORDER BY id");
      res.json({ chatIds: rows.map(row => row.chatId) });
    } catch (error) { next(error); }
  });

  router.post("/api/telegram/report", async (req, res, next) => {
    try {
      const requestedChatIds = normalizeChatIds(req.body?.chatIds);
      const { rows } = await pool.query("SELECT chat_id FROM telegram_recipients ORDER BY id");
      const savedChatIds = rows.map(row => row.chat_id);
      const chatIds = requestedChatIds.length ? requestedChatIds : savedChatIds;
      if (!config.telegramBotId || !chatIds.length) return res.status(503).json({ error: "Telegram bot yoki chat ID sozlanmagan" });
      await sendReport(chatIds);
      res.json({ sent: true, recipients: chatIds.length });
    } catch (error) {
      next(error);
    }
  });

  router.get("/api/telegram/preview", async (_req, res, next) => {
    try {
      const image = await getReportImage();
      res.type("png").send(image);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
