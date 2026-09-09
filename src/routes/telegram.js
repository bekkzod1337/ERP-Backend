import { Router } from "express";

export function createTelegramRouter({ config, getReportImage, sendReport }) {
  const router = Router();

  router.post("/api/telegram/report", async (_req, res, next) => {
    try {
      if (!config.telegramBotId || !config.telegramChatId) return res.status(503).json({ error: "Telegram bot sozlanmagan" });
      await sendReport();
      res.json({ sent: true });
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
