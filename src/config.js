import "dotenv/config";

const required = ["DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD", "DATABASE_HOST", "DATABASE_PORT"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} .env da ko'rsatilmagan`);
}

export const config = {
  port: Number(process.env.EXPRESS_PORT || 5000),
  database: {
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  telegramBotId: process.env.TELEGRAM_BOT_ID,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  msmsBaseUrl: process.env.MSMS_BASE_URL || "https://msms.uztelecom.uz/msmsapi/serviceorder/reestr",
  msmsTokenHeader: process.env.MSMS_TOKEN_HEADER || "Authorization",
};
