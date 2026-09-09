import { Router } from "express";

export function createHealthRouter({ pool }) {
  const router = Router();
  router.get("/health", async (_req, res) => {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, databaseTime: result.rows[0].now });
  });
  return router;
}
